/**
 * [INPUT]: 依赖 node:readline（按行读 stdin）、process.stdout；@shared/ipc 的 Command/Query/ShellEvent，@shared/chat 的 ChatSnapshot
 * [OUTPUT]: 对外提供 Wire：浏览器进程 ↔ 服务进程的 JSON 行协议——入站 invoke/query/getState/getChat/layout/context/hostReply，出站 应答/state/chat/event 推送与 host 请求（openApp/closeApp/pickFolder/reveal/setTheme，带 id 等回复）
 * [POS]: samo-service 的传输层，与 Electron 时代的 preload 桥同一契约（Command/Query/Snapshot），只是换了运输方式；C++ 侧对应 samo/service/samo_service.cc
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createInterface } from 'node:readline';
import type { Command, Query, ShellEvent } from '@shared/ipc';
import type { ChatSnapshot } from '@shared/chat';
import type { ModuleId } from '@shared/model';

export interface ServiceState {
  apps: unknown[];
  activeAppId: string | null;
  workspaces: unknown[];
  activeWorkspaceId: string | null;
}
export interface BrowserContext {
  activeUrl: string | null;
  activeTitle: string | null;
  tabCount: number;
}
export type HostRequest =
  | { type: 'openApp'; url: string; appId: string }
  | { type: 'closeApp'; appId: string }
  | { type: 'pickFolder' }
  | { type: 'reveal'; path: string }
  | { type: 'setTheme'; mode: 'system' | 'light' | 'dark' };

type Inbound =
  | { id: number; kind: 'invoke'; command: Command }
  | { id: number; kind: 'query'; query: Query }
  | { id: number; kind: 'getState' }
  | { id: number; kind: 'getChat' }
  | { kind: 'layout'; module: ModuleId }
  | { kind: 'context'; context: BrowserContext }
  | { kind: 'hostReply'; id: number; result: unknown };

export interface WireHandlers {
  invoke(command: Command): Promise<unknown> | unknown;
  query(query: Query): Promise<unknown> | unknown;
  getState(): ServiceState;
  getChat(): ChatSnapshot;
  layout(module: ModuleId): void;
  context(context: BrowserContext): void;
}

export class Wire {
  private nextHostId = 1;
  private pendingHost = new Map<number, (result: unknown) => void>();

  constructor(private readonly handlers: WireHandlers) {
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on('line', (line) => void this.onLine(line));
    rl.on('close', () => process.exit(0)); // 浏览器走了，服务跟着走
  }

  private write(msg: unknown): void {
    process.stdout.write(JSON.stringify(msg) + '\n');
  }
  pushState(state: ServiceState): void {
    this.write({ kind: 'state', state });
  }
  pushChat(chat: ChatSnapshot): void {
    this.write({ kind: 'chat', chat });
  }
  pushEvent(event: ShellEvent): void {
    this.write({ kind: 'event', event });
  }
  /** 请浏览器做一件只有它能做的事（开标签、选目录……），等它回复 */
  host<T = unknown>(request: HostRequest): Promise<T> {
    const id = this.nextHostId++;
    return new Promise<T>((resolve) => {
      this.pendingHost.set(id, resolve as (r: unknown) => void);
      this.write({ kind: 'host', id, request });
    });
  }

  private async onLine(line: string): Promise<void> {
    if (!line.trim()) return;
    let msg: Inbound;
    try {
      msg = JSON.parse(line) as Inbound;
    } catch {
      return;
    }
    switch (msg.kind) {
      case 'invoke':
        this.reply(msg.id, () => this.handlers.invoke(msg.command));
        break;
      case 'query':
        this.reply(msg.id, () => this.handlers.query(msg.query));
        break;
      case 'getState':
        this.write({ id: msg.id, result: this.handlers.getState() });
        break;
      case 'getChat':
        this.write({ id: msg.id, result: this.handlers.getChat() });
        break;
      case 'layout':
        this.handlers.layout(msg.module);
        break;
      case 'context':
        this.handlers.context(msg.context);
        break;
      case 'hostReply':
        this.pendingHost.get(msg.id)?.(msg.result);
        this.pendingHost.delete(msg.id);
        break;
    }
  }
  private reply(id: number, fn: () => Promise<unknown> | unknown): void {
    Promise.resolve()
      .then(fn)
      .then((result) => this.write({ id, result: result ?? null }))
      .catch((e: unknown) => this.write({ id, error: e instanceof Error ? e.message : String(e) }));
  }
}
