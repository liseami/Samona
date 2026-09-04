/**
 * [INPUT]: 依赖 Node ≥ 22 的全局 fetch/WebSocket；Chromium 的 --remote-debugging-port（/json/version 给出浏览器级 WebSocket）
 * [OUTPUT]: 对外提供 CdpClient：浏览器级 CDP 连接——send(method, params, sessionId?) 请求-应答（自增 id），onEvent 收所有事件/带 sessionId 的子会话事件；connect() 幂等
 * [POS]: samo-service 网关的引擎侧：Electron 时代 webContents.debugger 的替身——一条连到 Chromium 的真 CDP 通道，flatten 会话由 Chromium 自己铸造
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export interface CdpEvent {
  method: string;
  params?: unknown;
  sessionId?: string;
}

export class CdpClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private listeners = new Set<(event: CdpEvent) => void>();

  constructor(private readonly port: number) {}

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    const version = (await fetch(`http://127.0.0.1:${this.port}/json/version`).then((r) => r.json())) as { webSocketDebuggerUrl: string };
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('CDP connect failed'));
    });
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; result?: unknown; error?: { message: string }; method?: string; params?: unknown; sessionId?: string };
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
        return;
      }
      if (msg.method) for (const l of this.listeners) l({ method: msg.method, params: msg.params, sessionId: msg.sessionId });
    };
    ws.onclose = () => {
      this.ws = null;
      for (const p of this.pending.values()) p.reject(new Error('CDP closed'));
      this.pending.clear();
    };
    this.ws = ws;
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('CDP not connected'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws!.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  onEvent(listener: (event: CdpEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
