/**
 * [INPUT]: 依赖 ../browser/engine 的 BrowserEngine，./cdp-bridge 的 CdpBridge，./snapshot 的 buildSnapshot，./task-spaces 的翻译与错误工厂，@shared/model 的 NEW_TAB_URL/AGENT_IDENTITY_COLOR
 * [OUTPUT]: 对外提供 AgentSession 类：ego 宿主接口（listTabs/createTab/snapshot/task identity 全家桶/getBrowserVersion/…）的服务端实现 + Samo 扩展 captureWindow/useShell/debugWindows（开发态驱动壳与诊断窗口），按连接持有「当前选中的 task identity」；VIEW_TARGET_PREFIX 常量
 * [POS]: agent 模块的业务层，是 ego-browser 眼里的「浏览器」；所有可见性都以 selectedSpaceId 为界（phi 缺的服务端过滤在这里补上）。gateway 负责传输，它负责语义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, BaseWindow, type WebContents } from 'electron';
import { AGENT_IDENTITY_COLOR, NEW_TAB_URL } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import { CdpBridge } from './cdp-bridge';
import { buildSnapshot, type SnapshotOptions } from './snapshot';
import { EGO_CODE, EgoRejection, egoError, toTaskSpace, type EgoErrorResult } from './task-spaces';

type RpcParams = unknown[];
export type RpcHandler = (...args: RpcParams) => Promise<unknown> | unknown;

/** 开发态：SAMO_DEBUG_SHELL=1 时 agent 可把壳本身当作 target 来驱动（用于自动化测试侧栏） */
export const VIEW_TARGET_PREFIX = 'view:';

export class AgentSession {
  private selectedSpaceId: number | null = null;
  private shellMode: string | null = null; // 'shell' | 'overlay' | 辅助视图名（launcher / chat）
  readonly bridge: CdpBridge;
  readonly methods: Record<string, RpcHandler>;

  constructor(
    private readonly engine: BrowserEngine,
    private readonly emit: (message: string) => void,
    readonly agentName: string,
  ) {
    this.bridge = new CdpBridge(engine, {
      visibleTabs: () => this.visibleTabs(),
      createTab: (url) => this.createTabIn(url),
      emit: (message) => this.emit(message),
      debugWebContents: (name) => this.debugWebContents(name),
    });

    // ============ ego 宿主接口：方法名与 ego-browser 调用点逐字对应 ============
    this.methods = {
      listTabs: () => this.guardSelected() ?? { tabs: this.visibleTabs().map((t, index) => ({ ...t, index })) },
      createTab: (url) => this.guardSelected() ?? { targetId: this.createTabIn(String(url ?? 'about:blank')) },
      getBrowserVersion: () => ({ currentVersion: app.getVersion(), updateAvailable: false }),
      snapshot: (options) => this.snapshot((options ?? {}) as SnapshotOptions),
      listTaskSpaces: () => ({
        taskSpaces: this.engine.store
          .allIdentities()
          .filter((s) => s.ownership !== 'user' || s.taskId)
          .map((s) => toTaskSpace(s, this.selectedSpaceId)),
      }),
      createTaskSpace: (name) => this.createTaskSpace(String(name ?? '')),
      useTaskSpace: (id) => this.useTaskSpace(Number(id)),
      claimTaskSpace: (id, name) => this.claimTaskSpace(Number(id), name ? String(name) : undefined),
      completeTaskSpace: () => this.mutateSelected((id) => this.engine.setOwnership(id, 'user', null)),
      closeTaskSpace: () =>
        this.mutateSelected((id) => {
          this.engine.deleteIdentity(id);
          this.selectedSpaceId = null;
        }),
      handOffTaskSpace: () => this.mutateSelected((id) => this.engine.setOwnership(id, 'agentDelegatedToUser')),
      takeOverTaskSpace: () => this.mutateSelected((id) => this.engine.setOwnership(id, 'agent')),
      setAgentTaskState: (label) => {
        if (this.selectedSpaceId !== null) this.engine.store.updateIdentity(this.selectedSpaceId, { agentState: label == null ? null : String(label) });
        return {};
      },
      animationHighlightMouseToPosition: (x, y) => {
        // ego-browser 在每次 click/hover/drag 之前调用：镜像成 agent 光标层的目标点
        if (this.selectedSpaceId !== null && typeof x === 'number' && typeof y === 'number') this.engine.agentCursor(this.selectedSpaceId, x, y);
        return {};
      },
      captureWindow: (dir) => this.captureWindow(dir ? String(dir) : undefined),
      useShell: (which) => {
        if (!process.env.SAMO_DEBUG_SHELL) return egoError(EGO_CODE.operationFailed, 'useShell requires SAMO_DEBUG_SHELL=1');
        const name = which ? String(which) : 'shell';
        if (name !== 'shell' && name !== 'overlay' && !this.engine.auxWebContents().some(([n]) => n === name)) {
          return egoError(EGO_CODE.operationFailed, `useShell: unknown view ${name}`);
        }
        this.shellMode = name;
        this.bridge.dispose(); // 切换目标时丢掉旧附着
        return {};
      },
      debugWindows: () => {
        // 开发态诊断：所有窗口的可见性与几何（浮层/光标层是否真的在屏幕上）
        if (!process.env.SAMO_DEBUG_SHELL) return egoError(EGO_CODE.operationFailed, 'debugWindows requires SAMO_DEBUG_SHELL=1');
        return {
          windows: BaseWindow.getAllWindows().map((w) => ({ title: w.getTitle(), visible: w.isVisible(), focused: w.isFocused(), bounds: w.getBounds() })),
          aux: this.engine.auxWebContents().map(([name, wc]) => [name, wc.getURL()]),
        };
      },
      ping: () => ({ ok: true }),
    };
  }

  handleCdp(payload: string): void {
    this.bridge.handle(payload);
  }

  dispose(): void {
    this.bridge.dispose();
    if (this.selectedSpaceId !== null) {
      const identity = this.engine.store.getIdentity(this.selectedSpaceId);
      if (identity?.ownership === 'agent') this.engine.store.updateIdentity(identity.id, { agentState: null });
    }
  }

  /** 开发态调试视图：shell / overlay / 登记的辅助视图 */
  debugWebContents(name: string) {
    if (name === 'shell') return this.engine.shellWebContents();
    if (name === 'overlay') return this.engine.overlayWebContents();
    return this.engine.auxWebContents().find(([n]) => n === name)?.[1] ?? null;
  }

  // ============ 可见性：只看选中的 Identity ============
  private visibleTabs() {
    if (this.shellMode) {
      const wc = this.debugWebContents(this.shellMode);
      if (!wc) return [];
      return [{ targetId: `view:${this.shellMode}`, url: wc.getURL(), title: `Samo ${this.shellMode}`, active: true }];
    }
    if (this.selectedSpaceId === null) return [];
    const activeId = this.engine.store.activeTabId(this.selectedSpaceId);
    return this.engine.store.tabsInIdentity(this.selectedSpaceId).map((t) => ({
      targetId: t.id,
      url: t.url === NEW_TAB_URL ? 'about:blank' : t.url,
      title: t.title,
      active: t.id === activeId,
    }));
  }

  private createTabIn(url: string): string {
    const identityId = this.selectedSpaceId ?? this.engine.store.activeIdentityId;
    const tab = this.engine.createTab({ url: url === 'about:blank' ? undefined : url, identityId, activate: false });
    this.engine.selectTab(tab.id); // agent 语义上的「当前标签」；只有用户正看着这个 Identity 时才切到前台
    return tab.id;
  }

  private guardSelected(): EgoErrorResult | null {
    if (this.shellMode) return null;
    if (this.selectedSpaceId === null) return egoError(EGO_CODE.spaceNotSelected, 'No task identity selected. Call useOrCreateTaskSpace(name) first.');
    const identity = this.engine.store.getIdentity(this.selectedSpaceId);
    if (!identity) return egoError(EGO_CODE.spaceNotFound, 'The selected task identity no longer exists.');
    if (identity.ownership === 'agentDelegatedToUser') return egoError(EGO_CODE.userInControl, 'The user has taken control of this task identity.');
    if (identity.ownership === 'user' && identity.taskId) return egoError(EGO_CODE.spaceInactive, 'This task identity has been handed to the user.');
    return null;
  }

  // ============ Task identity 生命周期 ============
  private createTaskSpace(name: string) {
    if (!name) return egoError(EGO_CODE.invalidArgument, 'createTaskSpace requires a name');
    const identity = this.engine.createIdentity({ name, icon: 'bot', color: AGENT_IDENTITY_COLOR, ownership: 'agent', taskId: name }, false);
    this.selectedSpaceId = identity.id;
    return toTaskSpace(identity, this.selectedSpaceId);
  }

  private useTaskSpace(id: number) {
    const identity = this.engine.store.getIdentity(id);
    if (!identity) return egoError(EGO_CODE.spaceNotFound, `task identity not found: ${id}`);
    this.selectedSpaceId = id;
    return {};
  }

  private claimTaskSpace(id: number, name?: string) {
    const identity = this.engine.store.getIdentity(id);
    if (!identity) return egoError(EGO_CODE.spaceNotFound, `task identity not found: ${id}`);
    this.engine.store.updateIdentity(id, { ownership: 'agent', taskId: identity.taskId ?? name ?? identity.name, agentState: null });
    this.selectedSpaceId = id;
    return toTaskSpace(this.engine.store.getIdentity(id)!, id);
  }

  private mutateSelected(fn: (identityId: number) => void) {
    if (this.selectedSpaceId === null) return egoError(EGO_CODE.spaceNotSelected, 'No task identity selected.');
    if (!this.engine.store.getIdentity(this.selectedSpaceId)) return egoError(EGO_CODE.spaceNotFound, 'The selected task identity no longer exists.');
    fn(this.selectedSpaceId);
    return {};
  }

  // ============ 截屏：壳 + 当前标签页各存一张 PNG（phi 的 agentSpace.captureWindow 对应物） ============
  private async captureWindow(dir = join(app.getPath('temp'), 'samo-capture')) {
    mkdirSync(dir, { recursive: true });
    const files: Record<string, string> = {};
    const errors: Record<string, string> = {};
    const grab = async (name: string, wc: WebContents | undefined) => {
      if (!wc || wc.isDestroyed()) return;
      try {
        const image = await wc.capturePage();
        if (image.isEmpty()) throw new Error('empty image (view not painting)');
        files[name] = join(dir, `${name}.png`);
        writeFileSync(files[name], image.toPNG());
      } catch (err) {
        errors[name] = err instanceof Error ? err.message : String(err);
      }
    };
    await grab('shell', this.engine.shellWebContents());
    const overlay = this.engine.overlayWebContents();
    if (this.engine.overlayVisible() && overlay) await grab('overlay', overlay);
    for (const [name, wc] of this.engine.auxWebContents()) await grab(name, wc);
    const tab = this.selectedSpaceId !== null ? this.engine.store.activeTab(this.selectedSpaceId) : this.engine.store.activeTab();
    await grab('content', tab ? this.engine.webContentsOf(tab.id) : undefined);
    return Object.keys(errors).length ? { ...files, errors } : files;
  }

  // ============ 快照：按 ego 约定，用户接管时 reject ============
  private async snapshot(options: SnapshotOptions) {
    const guard = this.guardSelected();
    if (guard) throw new EgoRejection(guard.error_code, guard.error);
    const tab = this.shellMode ? null : this.engine.store.activeTab(this.selectedSpaceId!);
    if (!this.shellMode && !tab) throw new EgoRejection(EGO_CODE.webContentsUnavailable, 'No tab in the selected task identity.');
    const wc = this.shellMode ? this.debugWebContents(this.shellMode)! : this.engine.ensureLoaded(tab!.id).webContents;
    if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
    try {
      return await buildSnapshot(wc, options);
    } catch (err) {
      throw new EgoRejection(EGO_CODE.snapshotFailed, err instanceof Error ? err.message : String(err));
    }
  }
}
