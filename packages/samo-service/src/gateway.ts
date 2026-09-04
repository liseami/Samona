/**
 * [INPUT]: 依赖 ws 的 WebSocketServer，node:crypto/fs/path/os，samo-agent/protocol 的线形类型与 resolvePointerPath，samo-app main/agent 的 task-spaces（toTaskSpace/egoError/EGO_CODE）与 snapshot（buildSnapshot），./cdp-client 的 CdpClient
 * [OUTPUT]: 对外提供 AgentGateway：本机回环 WebSocket + token + 指针文件（数据目录与 Electron 同款路径，pid 守卫），每连接一个 AgentSession——ego 宿主方法（listTabs/createTab/snapshot/task space 全家桶）+ CDP 透传（浏览器级 Target.* 在这里按任务空间过滤，其余原样走 Chromium 的 flatten 会话）；任务空间 = 服务里的一组标签（无登录态隔离），变化经 onChange 推给浏览器
 * [POS]: samo-service 的 agent 层：Electron 版 main/agent/{gateway,session,cdp-bridge}.ts 在 fork 里的合体——引擎换成 Chromium 的真 CDP，标签 id 就是 DevTools target id（壳、服务、agent 三方同一套 id）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { GatewayPointer, RpcRequest, RpcResponse, ServerPush } from 'samo-agent/protocol';
import { resolvePointerPath } from 'samo-agent/protocol';
import type { Identity } from '@shared/model';
import { EGO_CODE, EgoRejection, egoError, toTaskSpace, type EgoErrorResult } from '../../../samo-app/src/main/agent/task-spaces';
import { buildSnapshot, type SnapshotOptions } from '../../../samo-app/src/main/agent/snapshot';
import type { WebContents } from 'electron';
import { CdpClient, type CdpEvent } from './cdp-client';

const AGENT_SPACE_FIRST_ID = 1000;

/** 任务空间：Identity 形状（壳的 AgentGroups 直接消费），外加它拥有的标签 */
export interface TaskSpace extends Identity {
  tabs: string[]; // target id，创建顺序
  activeTab: string | null;
}
interface TargetInfo {
  targetId: string;
  type: string;
  title: string;
  url: string;
  attached: boolean;
}

export class AgentGateway {
  private server: WebSocketServer | null = null;
  private readonly token = randomBytes(32).toString('base64url');
  readonly spaces = new Map<number, TaskSpace>();
  private nextSpaceId = AGENT_SPACE_FIRST_ID;
  readonly cdp: CdpClient;
  private readonly sessions = new Set<AgentSession>();

  constructor(
    cdpPort: number,
    private readonly dataDir: string,
    private readonly onChange: () => void,
  ) {
    this.cdp = new CdpClient(cdpPort);
  }

  async start(): Promise<GatewayPointer> {
    await this.cdp.connect();
    await this.cdp.send('Target.setDiscoverTargets', { discover: true });
    this.cdp.onEvent((e) => {
      if (e.method === 'Target.targetDestroyed') {
        const id = (e.params as { targetId: string }).targetId;
        for (const s of this.spaces.values()) {
          if (s.tabs.includes(id)) {
            s.tabs = s.tabs.filter((t) => t !== id);
            if (s.activeTab === id) s.activeTab = s.tabs.at(-1) ?? null;
            this.onChange();
          }
        }
      }
    });
    const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const pointer: GatewayPointer = { url: `ws://127.0.0.1:${port}`, token: this.token, pid: process.pid, version: 'fork' };
    this.writePointer(join(this.dataDir, 'agent-gateway.json'), pointer);
    // Electron 同款路径：只有没有活着的 Electron 版占着时才写（samo-browser CLI 默认读这里）
    const shared = resolvePointerPath();
    if (!this.pointerAlive(shared)) this.writePointer(shared, pointer);
    server.on('connection', (socket, request) => {
      const url = new URL(request.url ?? '/', 'ws://localhost');
      if (!this.authorized(url.searchParams.get('token'))) {
        socket.close(4401, 'unauthorized');
        return;
      }
      const session = new AgentSession(this, socket, url.searchParams.get('agent') ?? 'agent');
      this.sessions.add(session);
      socket.on('close', () => {
        session.dispose();
        this.sessions.delete(session);
      });
    });
    process.stderr.write(`[samo-service] agent gateway ${pointer.url}\n`);
    return pointer;
  }

  private writePointer(path: string, pointer: GatewayPointer): void {
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(pointer, null, 2), { mode: 0o600 });
      chmodSync(path, 0o600);
    } catch {
      /* 写不进就算了 */
    }
  }
  private pointerAlive(path: string): boolean {
    try {
      const p = JSON.parse(readFileSync(path, 'utf8')) as Partial<GatewayPointer>;
      if (!p.pid || p.pid === process.pid) return false;
      process.kill(p.pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  private authorized(token: string | null): boolean {
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(this.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // ---- 任务空间（给浏览器合并进快照） ----
  createSpace(name: string): TaskSpace {
    const id = this.nextSpaceId++;
    const space: TaskSpace = { id, name, icon: 'bot', color: 'gray', partition: 'persist:samo', ownership: 'agent', taskId: name, agentState: null, createdAt: Date.now(), tabs: [], activeTab: null };
    this.spaces.set(id, space);
    this.onChange();
    return space;
  }
  spaceOfTab(targetId: string): number | null {
    for (const s of this.spaces.values()) if (s.tabs.includes(targetId)) return s.id;
    return null;
  }
  identities(): Identity[] {
    return [...this.spaces.values()].map(({ tabs: _t, activeTab: _a, ...identity }) => identity);
  }
  tabSpaces(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of this.spaces.values()) for (const t of s.tabs) out[t] = s.id;
    return out;
  }
  activeTabBySpace(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (const s of this.spaces.values()) out[String(s.id)] = s.activeTab;
    return out;
  }
  /** 壳里的接管 / 交还 */
  setOwnership(id: number, ownership: Identity['ownership']): void {
    const s = this.spaces.get(id);
    if (!s) return;
    s.ownership = ownership;
    if (ownership !== 'agent') s.agentState = null;
    this.onChange();
  }
  async targets(): Promise<TargetInfo[]> {
    const { targetInfos } = await this.cdp.send<{ targetInfos: TargetInfo[] }>('Target.getTargets');
    return targetInfos.filter((t) => t.type === 'page');
  }
}

type RpcHandler = (...args: unknown[]) => Promise<unknown> | unknown;

class AgentSession {
  private selectedSpaceId: number | null = null;
  private readonly sessionsOwned = new Set<string>(); // 本连接附着出的 CDP 会话
  private readonly offEvents: () => void;
  readonly methods: Record<string, RpcHandler>;

  constructor(
    private readonly gateway: AgentGateway,
    private readonly socket: WebSocket,
    readonly agentName: string,
  ) {
    this.offEvents = gateway.cdp.onEvent((e) => this.onCdpEvent(e));
    socket.on('message', (data) => void this.onMessage(String(data)));
    const g = gateway;
    this.methods = {
      ping: () => ({ ok: true }),
      getBrowserVersion: () => ({ currentVersion: 'fork', updateAvailable: false }),
      listTabs: async () => this.guardSelected() ?? { tabs: (await this.visibleTabs()).map((t, index) => ({ ...t, index })) },
      createTab: async (url) => this.guardSelected() ?? { targetId: await this.createTabIn(String(url ?? 'about:blank')) },
      snapshot: (options) => this.snapshot((options ?? {}) as SnapshotOptions),
      listTaskSpaces: () => ({ taskSpaces: [...g.spaces.values()].map((s) => toTaskSpace(s, this.selectedSpaceId)) }),
      createTaskSpace: (name) => {
        const space = g.createSpace(String(name ?? 'task'));
        this.selectedSpaceId = space.id;
        return toTaskSpace(space, this.selectedSpaceId);
      },
      useTaskSpace: (id) => {
        const space = g.spaces.get(Number(id));
        if (!space) return egoError(EGO_CODE.spaceNotFound, `No task space ${String(id)}`);
        this.selectedSpaceId = space.id;
        return toTaskSpace(space, this.selectedSpaceId);
      },
      claimTaskSpace: (id, name) => {
        const space = g.spaces.get(Number(id));
        if (!space) return egoError(EGO_CODE.spaceNotFound, `No task space ${String(id)}`);
        space.ownership = 'agent';
        space.taskId = space.taskId ?? (name ? String(name) : space.name);
        space.agentState = null;
        this.selectedSpaceId = space.id;
        g['onChange']();
        return toTaskSpace(space, this.selectedSpaceId);
      },
      completeTaskSpace: () => this.mutateSelected((s) => { s.ownership = 'user'; s.taskId = undefined; s.agentState = null; }),
      closeTaskSpace: () =>
        this.mutateSelected((s) => {
          for (const t of s.tabs) void g.cdp.send('Target.closeTarget', { targetId: t }).catch(() => {});
          g.spaces.delete(s.id);
          this.selectedSpaceId = null;
        }),
      handOffTaskSpace: () => this.mutateSelected((s) => { s.ownership = 'agentDelegatedToUser'; }),
      takeOverTaskSpace: () => this.mutateSelected((s) => { s.ownership = 'agent'; }),
      setAgentTaskState: (label) => {
        const s = this.selectedSpaceId !== null ? g.spaces.get(this.selectedSpaceId) : undefined;
        if (s) { s.agentState = label == null ? null : String(label); g['onChange'](); }
        return {};
      },
      animationHighlightMouseToPosition: () => ({}), // 光标层：fork 里待接
      captureWindow: () => egoError(EGO_CODE.operationFailed, 'captureWindow is not available in the Chromium build yet'),
      useShell: () => egoError(EGO_CODE.operationFailed, 'useShell is not available in the Chromium build yet'),
      debugWindows: () => egoError(EGO_CODE.operationFailed, 'debugWindows is not available in the Chromium build yet'),
    };
  }

  dispose(): void {
    this.offEvents();
    for (const sid of this.sessionsOwned) void this.gateway.cdp.send('Target.detachFromTarget', { sessionId: sid }).catch(() => {});
    this.sessionsOwned.clear();
  }

  private send(msg: RpcResponse | ServerPush): void {
    if (this.socket.readyState === this.socket.OPEN) this.socket.send(JSON.stringify(msg));
  }

  private async onMessage(raw: string): Promise<void> {
    let req: RpcRequest;
    try {
      req = JSON.parse(raw) as RpcRequest;
    } catch {
      return;
    }
    if ('cdp' in req) return this.handleCdp(req.cdp);
    const handler = this.methods[req.method];
    if (!handler) return this.send({ id: req.id, error: { message: `Unknown method ${req.method}` } });
    try {
      const result = await handler(...(req.params ?? []));
      this.send({ id: req.id, result });
    } catch (e) {
      const error = e instanceof EgoRejection ? { message: e.message, error_code: e.error_code } : { message: e instanceof Error ? e.message : String(e) };
      this.send({ id: req.id, error });
    }
  }

  // ---- CDP 透传：浏览器级 Target.* 按任务空间过滤，其余原样交给 Chromium ----
  private async handleCdp(payload: string): Promise<void> {
    let req: { id: number; method: string; params?: Record<string, unknown>; sessionId?: string };
    try {
      req = JSON.parse(payload);
    } catch {
      return;
    }
    const push = (msg: unknown) => this.send({ event: 'cdp', message: JSON.stringify(msg) });
    try {
      let result: unknown;
      const params = req.params ?? {};
      if (!req.sessionId && req.method.startsWith('Target.')) {
        result = await this.browserLevel(req.method, params);
      } else {
        result = await this.gateway.cdp.send(req.method, params, req.sessionId);
      }
      push({ id: req.id, result, ...(req.sessionId ? { sessionId: req.sessionId } : {}) });
    } catch (e) {
      push({ id: req.id, error: { code: -32000, message: e instanceof Error ? e.message : String(e) }, ...(req.sessionId ? { sessionId: req.sessionId } : {}) });
    }
  }
  private async browserLevel(method: string, params: Record<string, unknown>): Promise<unknown> {
    const cdp = this.gateway.cdp;
    switch (method) {
      case 'Target.getTargets':
        return { targetInfos: (await this.visibleTargets()).map((t) => ({ ...t, canAccessOpener: false })) };
      case 'Target.getTargetInfo': {
        const id = String(params.targetId ?? '');
        const t = (await this.visibleTargets()).find((x) => x.targetId === id);
        if (!t) throw new Error(`No target with given id found: ${id}`);
        return { targetInfo: t };
      }
      case 'Target.attachToTarget': {
        const id = String(params.targetId ?? '');
        if (!(await this.visibleTargets()).some((t) => t.targetId === id)) throw new Error(`No target with given id found: ${id}`);
        const r = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: id, flatten: true });
        this.sessionsOwned.add(r.sessionId);
        return r;
      }
      case 'Target.detachFromTarget':
        this.sessionsOwned.delete(String(params.sessionId ?? ''));
        return cdp.send('Target.detachFromTarget', params);
      case 'Target.createTarget':
        return { targetId: await this.createTabIn(String(params.url ?? 'about:blank')) };
      case 'Target.activateTarget': {
        const id = String(params.targetId ?? '');
        const space = this.selectedSpace();
        if (space && space.tabs.includes(id)) space.activeTab = id;
        this.gateway['onChange']();
        return cdp.send('Target.activateTarget', params);
      }
      case 'Target.closeTarget':
        return cdp.send('Target.closeTarget', params);
      case 'Target.setDiscoverTargets':
      case 'Target.setAutoAttach':
        return {};
      default:
        return cdp.send(method, params);
    }
  }
  private onCdpEvent(e: CdpEvent): void {
    // 只把本连接附着会话的事件回推；无 sessionId 的浏览器级事件（Target.*）也回推给它
    if (e.sessionId && !this.sessionsOwned.has(e.sessionId)) return;
    if (e.method === 'Target.attachedToTarget') {
      const p = e.params as { sessionId?: string };
      if (p?.sessionId) this.sessionsOwned.add(p.sessionId);
    }
    this.send({ event: 'cdp', message: JSON.stringify({ method: e.method, params: e.params, ...(e.sessionId ? { sessionId: e.sessionId } : {}) }) });
  }

  // ---- 语义 ----
  private selectedSpace(): TaskSpace | undefined {
    return this.selectedSpaceId !== null ? this.gateway.spaces.get(this.selectedSpaceId) : undefined;
  }
  private guardSelected(): EgoErrorResult | null {
    if (this.selectedSpaceId === null) return egoError(EGO_CODE.spaceNotSelected, 'No task identity selected. Call useOrCreateTaskSpace(name) first.');
    const space = this.selectedSpace();
    if (!space) return egoError(EGO_CODE.spaceNotFound, 'The selected task identity no longer exists.');
    if (space.ownership === 'agentDelegatedToUser') return egoError(EGO_CODE.userInControl, 'The user is in control of this task space. Wait for hand-back.');
    return null;
  }
  private async visibleTargets(): Promise<TargetInfo[]> {
    const space = this.selectedSpace();
    const all = await this.gateway.targets();
    return space ? all.filter((t) => space.tabs.includes(t.targetId)) : [];
  }
  private async visibleTabs(): Promise<{ targetId: string; url: string; title: string; active: boolean }[]> {
    const space = this.selectedSpace();
    return (await this.visibleTargets()).map((t) => ({ targetId: t.targetId, url: t.url, title: t.title, active: space?.activeTab === t.targetId }));
  }
  private async createTabIn(url: string): Promise<string> {
    const space = this.selectedSpace();
    if (!space) throw new EgoRejection(EGO_CODE.spaceNotSelected, 'No task identity selected.');
    const { targetId } = await this.gateway.cdp.send<{ targetId: string }>('Target.createTarget', { url: url === 'about:blank' ? 'chrome://newtab/' : url, background: true });
    space.tabs.push(targetId);
    space.activeTab = targetId;
    this.gateway['onChange']();
    return targetId;
  }
  private mutateSelected(fn: (space: TaskSpace) => void): EgoErrorResult | Record<string, never> {
    const space = this.selectedSpace();
    if (this.selectedSpaceId === null) return egoError(EGO_CODE.spaceNotSelected, 'No task identity selected.');
    if (!space) return egoError(EGO_CODE.spaceNotFound, 'The selected task identity no longer exists.');
    fn(space);
    this.gateway['onChange']();
    return {};
  }
  private async snapshot(options: SnapshotOptions): Promise<unknown> {
    const guard = this.guardSelected();
    if (guard) throw new EgoRejection(guard.error_code, guard.error);
    const space = this.selectedSpace()!;
    const targetId = space.activeTab ?? space.tabs.at(-1);
    if (!targetId) throw new EgoRejection(EGO_CODE.webContentsUnavailable, 'No tab in the selected task space.');
    const { sessionId } = await this.gateway.cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
    try {
      const info = (await this.gateway.targets()).find((t) => t.targetId === targetId);
      // buildSnapshot 只用到 debugger.sendCommand / getTitle / getURL：用 CDP 会话垫一个 WebContents 形状
      const shim = {
        debugger: { sendCommand: (method: string, params?: Record<string, unknown>) => this.gateway.cdp.send(method, params ?? {}, sessionId) },
        getTitle: () => info?.title ?? '',
        getURL: () => info?.url ?? '',
      } as unknown as WebContents;
      return await buildSnapshot(shim, options);
    } finally {
      void this.gateway.cdp.send('Target.detachFromTarget', { sessionId }).catch(() => {});
    }
  }
}
