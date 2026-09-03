/**
 * [INPUT]: 依赖 ws 的 WebSocketServer，node:crypto/fs/path，electron 的 app，./session 的 AgentSession，samo-agent/protocol 的线形类型
 * [OUTPUT]: 对外提供 AgentGateway 类：本机回环 WebSocket 服务 + token 鉴权 + 指针文件（userData/agent-gateway.json，0600），每连接一个 AgentSession
 * [POS]: agent 模块的传输层，也是 samo-browser CLI 唯一的接入点；它不理解任何 ego 语义，只做 RPC 分发与 CDP 报文转发（设计取自 phi 的「指针文件发现 + 会话能力凭证」）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { WebSocketServer, type WebSocket } from 'ws';
import type { GatewayPointer, RpcRequest, RpcResponse, ServerPush } from 'samo-agent/protocol';
import type { BrowserEngine } from '../browser/engine';
import { AgentSession } from './session';

export const GATEWAY_FILE = 'agent-gateway.json';

export class AgentGateway {
  private server: WebSocketServer | null = null;
  private readonly token = randomBytes(32).toString('base64url');
  private readonly pointerPath = join(app.getPath('userData'), GATEWAY_FILE);
  readonly sessions = new Set<AgentSession>();

  constructor(private readonly engine: BrowserEngine) {}

  async start(): Promise<GatewayPointer> {
    const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const pointer: GatewayPointer = { url: `ws://127.0.0.1:${port}`, token: this.token, pid: process.pid, version: app.getVersion() };

    mkdirSync(app.getPath('userData'), { recursive: true });
    writeFileSync(this.pointerPath, JSON.stringify(pointer, null, 2), { mode: 0o600 });
    chmodSync(this.pointerPath, 0o600);

    server.on('connection', (socket, request) => {
      const url = new URL(request.url ?? '/', 'ws://localhost');
      if (!this.authorized(url.searchParams.get('token'))) {
        socket.close(4401, 'unauthorized');
        return;
      }
      this.accept(socket, url.searchParams.get('agent') ?? 'agent');
    });
    console.log(`[samo] agent gateway listening on ${pointer.url}`);
    return pointer;
  }

  stop(): void {
    for (const session of this.sessions) session.dispose();
    this.sessions.clear();
    this.server?.close();
    // 只删自己写的指针：dev --watch 重启时旧进程晚于新进程退出，不加 pid 守卫会把新实例的指针删掉
    try {
      const current = JSON.parse(readFileSync(this.pointerPath, 'utf8')) as Partial<GatewayPointer>;
      if (current.pid === process.pid) rmSync(this.pointerPath, { force: true });
    } catch {
      /* 已不存在或不可读 */
    }
  }

  private authorized(token: string | null): boolean {
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(this.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private accept(socket: WebSocket, agentName: string): void {
    const push = (message: string) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ event: 'cdp', message } satisfies ServerPush));
    };
    const session = new AgentSession(this.engine, push, agentName);
    this.sessions.add(session);

    socket.on('message', (data) => {
      let msg: RpcRequest;
      try {
        msg = JSON.parse(data.toString()) as RpcRequest;
      } catch {
        return;
      }
      if ('cdp' in msg) {
        session.handleCdp(msg.cdp);
        return;
      }
      const handler = session.methods[msg.method];
      const reply = (response: RpcResponse) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(response));
      };
      if (!handler) {
        reply({ id: msg.id, error: { message: `unknown method ${msg.method}` } });
        return;
      }
      Promise.resolve()
        .then(() => handler(...(msg.params ?? [])))
        .then((result) => reply({ id: msg.id, result }))
        .catch((err: unknown) => {
          const error_code = (err as { error_code?: string })?.error_code;
          reply({ id: msg.id, error: { message: err instanceof Error ? err.message : String(err), ...(error_code ? { error_code } : {}) } });
        });
    });
    socket.on('close', () => {
      session.dispose();
      this.sessions.delete(session);
    });
  }
}
