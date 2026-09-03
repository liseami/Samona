/**
 * [INPUT]: 依赖 node:fs 读指针文件，全局 WebSocket（Node ≥ 22），./protocol 的线形类型
 * [OUTPUT]: 对外提供 connectHost()：连上 Samo 网关并返回一个满足 ego-browser 期望的 `ego` 宿主对象（sendCDPMessage/onCDPMessage/listTabs/…）
 * [POS]: samo-agent 的适配层——ego lite 闭源 app 里内置的那半个 `ego` 绑定，在这里以开源方式重生；每个方法就是一次 RPC
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs';
import { resolvePointerPath, type GatewayPointer, type RpcResponse, type ServerPush } from './protocol.js';

const HOST_METHODS = [
  'listTabs',
  'createTab',
  'getBrowserVersion',
  'snapshot',
  'listTaskSpaces',
  'createTaskSpace',
  'useTaskSpace',
  'claimTaskSpace',
  'completeTaskSpace',
  'closeTaskSpace',
  'handOffTaskSpace',
  'takeOverTaskSpace',
  'setAgentTaskState',
  'animationHighlightMouseToPosition',
  'captureWindow', // Samo 扩展：截屏壳与当前标签页
  'useShell', // Samo 扩展（开发态）：把壳当作 target 驱动
] as const;

export interface EgoHost {
  sendCDPMessage(payload: string): void;
  onCDPMessage?: (message: string) => void;
  onSendCDPMessageError?: (error: unknown) => void;
  close(): void;
  [method: string]: unknown;
}

export class GatewayUnavailable extends Error {}

export function readPointer(): GatewayPointer {
  const path = resolvePointerPath();
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as GatewayPointer;
  } catch {
    throw new GatewayUnavailable(`Samo is not running (no gateway pointer at ${path}). Launch Samo and try again.`);
  }
}

export async function connectHost(agentName = process.env.SAMO_AGENT_NAME ?? 'agent'): Promise<EgoHost> {
  const pointer = readPointer();
  const url = new URL(pointer.url);
  url.searchParams.set('token', pointer.token);
  url.searchParams.set('agent', agentName);
  const socket = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new GatewayUnavailable(`Samo gateway at ${pointer.url} refused the connection. Is Samo running?`)), { once: true });
    socket.addEventListener('close', (e) => reject(new GatewayUnavailable(`Samo gateway closed the connection (${e.code} ${e.reason})`)), { once: true });
  });

  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  const host: EgoHost = {
    sendCDPMessage(payload) {
      try {
        socket.send(JSON.stringify({ cdp: payload }));
      } catch (err) {
        host.onSendCDPMessageError?.(err);
      }
    },
    close() {
      socket.close();
    },
  };

  socket.addEventListener('message', (event) => {
    let msg: RpcResponse | ServerPush;
    try {
      msg = JSON.parse(String(event.data)) as RpcResponse | ServerPush;
    } catch {
      return;
    }
    if ('event' in msg) {
      host.onCDPMessage?.(msg.message);
      return;
    }
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.error) {
      const error = Object.assign(new Error(msg.error.message), msg.error.error_code ? { error_code: msg.error.error_code } : {});
      entry.reject(error);
    } else {
      entry.resolve(msg.result);
    }
  });
  socket.addEventListener('close', () => {
    for (const entry of pending.values()) entry.reject(new GatewayUnavailable('Samo gateway connection closed'));
    pending.clear();
  });

  for (const method of HOST_METHODS) {
    host[method] = (...params: unknown[]) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
  }
  return host;
}
