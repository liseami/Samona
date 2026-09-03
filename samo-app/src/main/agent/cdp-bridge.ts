/**
 * [INPUT]: 依赖 electron 的 WebContents.debugger，依赖 ../browser/engine 的 BrowserEngine（取 webContents、建/关/激活标签）
 * [OUTPUT]: 对外提供 CdpBridge 类：接收 ego 线形的 CDP JSON 报文，仿真浏览器级 Target.* 域，把页面级命令路由到对应标签的 debugger，并把事件回推
 * [POS]: agent 模块的协议适配器——ego-browser 以为自己在跟一个支持 flatten 会话的 Chromium 说话，实际是每个标签各自的 webContents.debugger；会话 id 由这里铸造并映射。每个 AgentSession 持有一个实例
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { WebContents } from 'electron';
import type { BrowserEngine } from '../browser/engine';

const VIEW_TARGET_PREFIX = 'view:';

interface CdpRequest {
  id: number;
  method: string;
  params?: Record<string, unknown>;
  sessionId?: string;
}
interface Attachment {
  sessionId: string;
  targetId: string;
  wc: WebContents;
  onMessage: (event: Electron.Event, method: string, params: unknown, childSessionId?: string) => void;
  onDetach: () => void;
}

export interface CdpBridgeHost {
  /** 当前会话可见的标签（已按 Identity 过滤） */
  visibleTabs(): { targetId: string; url: string; title: string; active: boolean }[];
  /** 开发态：按名字取调试视图（shell / overlay / launcher / chat） */
  debugWebContents?(name: string): WebContents | null;
  createTab(url: string): string;
  emit(message: string): void; // 推给 agent 的事件/响应
}

export class CdpBridge {
  private bySession = new Map<string, Attachment>();
  private byTarget = new Map<string, Attachment>();
  private childSessions = new Map<string, Attachment>(); // Chromium 自己铸造的子会话 → 所属附着

  constructor(
    private readonly engine: BrowserEngine,
    private readonly host: CdpBridgeHost,
  ) {}

  /** 处理一条来自 ego 的报文（字符串），响应通过 host.emit 异步回推 */
  handle(payload: string): void {
    let req: CdpRequest;
    try {
      req = JSON.parse(payload) as CdpRequest;
    } catch {
      return;
    }
    void this.dispatch(req)
      .then((result) => this.host.emit(JSON.stringify({ id: req.id, result, ...(req.sessionId ? { sessionId: req.sessionId } : {}) })))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.host.emit(JSON.stringify({ id: req.id, error: { code: -32000, message }, ...(req.sessionId ? { sessionId: req.sessionId } : {}) }));
      });
  }

  private async dispatch(req: CdpRequest): Promise<unknown> {
    const params = req.params ?? {};
    // ---- 浏览器级（无 sessionId）的 Target/Browser 域：仿真 ----
    if (!req.sessionId) {
      switch (req.method) {
        case 'Target.getTargets':
          return { targetInfos: this.host.visibleTabs().map((t) => this.targetInfo(t)) };
        case 'Target.getTargetInfo': {
          const id = String(params.targetId ?? '');
          const tab = this.host.visibleTabs().find((t) => t.targetId === id);
          if (!tab) throw new Error(`No target with given id found: ${id}`);
          return { targetInfo: this.targetInfo(tab) };
        }
        case 'Target.attachToTarget':
          return { sessionId: this.attach(String(params.targetId ?? '')).sessionId };
        case 'Target.detachFromTarget':
          this.detach(String(params.sessionId ?? ''));
          return {};
        case 'Target.activateTarget':
          this.engine.selectTab(String(params.targetId ?? '')); // Identity 内选中，不抢用户当前 Identity
          return {};
        case 'Target.closeTarget':
          this.engine.closeTab(String(params.targetId ?? ''));
          return { success: true };
        case 'Target.createTarget':
          return { targetId: this.host.createTab(String(params.url ?? 'about:blank')) };
        case 'Target.setDiscoverTargets':
        case 'Target.setAutoAttach':
          return {};
        case 'Browser.getVersion':
          return { protocolVersion: '1.3', product: `Samo/${process.versions.electron}`, revision: '', userAgent: '', jsVersion: process.versions.v8 };
        default:
          throw new Error(`'${req.method}' wasn't found (browser-level)`);
      }
    }
    // ---- 页面级：路由到附着的 debugger ----
    const attachment = this.bySession.get(req.sessionId);
    if (attachment) {
      this.assertAlive(attachment);
      return attachment.wc.debugger.sendCommand(req.method, params);
    }
    const child = this.childSessions.get(req.sessionId);
    if (child) {
      this.assertAlive(child);
      return child.wc.debugger.sendCommand(req.method, params, req.sessionId);
    }
    throw new Error(`Session with given id not found: ${req.sessionId}`);
  }

  // ============ 附着管理 ============
  private attach(targetId: string): Attachment {
    const existing = this.byTarget.get(targetId);
    if (existing && !existing.wc.isDestroyed()) return existing;
    if (!this.host.visibleTabs().some((t) => t.targetId === targetId)) {
      throw new Error(`No target with given id found: ${targetId}`);
    }
    const wc = targetId.startsWith(VIEW_TARGET_PREFIX) ? this.host.debugWebContents?.(targetId.slice(VIEW_TARGET_PREFIX.length)) ?? this.engine.shellWebContents() : this.engine.ensureLoaded(targetId).webContents;
    if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
    const sessionId = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    const attachment: Attachment = {
      sessionId,
      targetId,
      wc,
      onMessage: (_e, method, params, childSessionId) => {
        if (method === 'Target.attachedToTarget' && params && typeof params === 'object') {
          const p = params as { sessionId?: string };
          if (p.sessionId) this.childSessions.set(p.sessionId, attachment);
        }
        this.host.emit(JSON.stringify({ method, params, sessionId: childSessionId || sessionId }));
      },
      onDetach: () => this.release(attachment, true),
    };
    wc.debugger.on('message', attachment.onMessage);
    wc.debugger.once('detach', attachment.onDetach);
    wc.once('destroyed', attachment.onDetach);
    this.bySession.set(sessionId, attachment);
    this.byTarget.set(targetId, attachment);
    return attachment;
  }

  private detach(sessionId: string): void {
    const attachment = this.bySession.get(sessionId);
    if (attachment) this.release(attachment, false);
  }

  private release(attachment: Attachment, fromBrowser: boolean): void {
    if (!this.bySession.has(attachment.sessionId)) return;
    this.bySession.delete(attachment.sessionId);
    this.byTarget.delete(attachment.targetId);
    for (const [child, owner] of this.childSessions) if (owner === attachment) this.childSessions.delete(child);
    if (!attachment.wc.isDestroyed()) {
      attachment.wc.debugger.removeListener('message', attachment.onMessage);
      attachment.wc.debugger.removeListener('detach', attachment.onDetach);
      attachment.wc.removeListener('destroyed', attachment.onDetach);
      if (!fromBrowser && attachment.wc.debugger.isAttached()) {
        try {
          attachment.wc.debugger.detach();
        } catch {
          /* 已断开 */
        }
      }
    }
    this.host.emit(JSON.stringify({ method: 'Target.detachedFromTarget', params: { sessionId: attachment.sessionId, targetId: attachment.targetId } }));
  }

  /** 会话结束：解除所有附着 */
  dispose(): void {
    for (const attachment of [...this.bySession.values()]) this.release(attachment, false);
  }

  private assertAlive(a: Attachment): void {
    if (a.wc.isDestroyed()) {
      this.release(a, true);
      throw new Error('Target closed');
    }
    if (!a.wc.debugger.isAttached()) a.wc.debugger.attach('1.3');
  }

  private targetInfo(t: { targetId: string; url: string; title: string }) {
    return { targetId: t.targetId, type: 'page', title: t.title, url: t.url, attached: this.byTarget.has(t.targetId), canAccessOpener: false };
  }
}
