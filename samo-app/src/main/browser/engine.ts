/**
 * [INPUT]: 依赖 electron 的 WebContentsView/WebContents/Session/session/clipboard，./store 的 BrowserStore，./history 的 HistoryStore，./view-events 的 wireTabEvents，../shell/window 的 ShellWindow，@shared/model 与 @shared/url，@shared/ipc 的 TabTarget
 * [OUTPUT]: 对外提供 BrowserEngine 类：标签页（创建/激活/Identity 内选中/关闭系列/重开/导航/固定/收藏/移动/重命名/复制/静音/MRU）、文件夹、Identity（创建/激活/步进/更新/排序/删除/接管/交还）的全部动作，视图生命周期（每个身份独立 session 分区，sessionFor 首次触达回调宿主）与 agent 后台层对账，给 agent 网关的 webContentsOf/shellWebContents/ensureLoaded
 * [POS]: browser 模块的指挥者，是 store 的唯一写者、ShellWindow 的唯一调用者；ipc/handlers、menu、menus/context-menu、agent/session 都只调用它的公开方法
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { WebContentsView, clipboard, session, type Session, type WebContents } from 'electron';
import { AGENT_IDENTITY_COLOR, LEGACY_PARTITION, NEW_TAB_URL, tabTitle, type FolderColor, type Identity, type IdentityColor, type IdentityIcon, type Ownership, type Tab } from '@shared/model';
import type { TabTarget, Thumbnail } from '@shared/ipc';
import { resolveInput } from '@shared/url';
import { BrowserStore } from './store';
import type { HistoryStore } from './history';
import { wireTabEvents } from './view-events';
import type { ShellWindow } from '../shell/window';

export interface EngineOptions {
  newTabUrl: string; // 真实加载地址（dev 为 vite 服务、prod 为 file://）
  onSession?: (session: Session, partition: string) => void; // 首次触达某个分区时回调（下载监听等按 session 装配）
  legacyPartitionExists?: boolean; // 磁盘上仍有 Space 时代的 persist:samo 分区：首个身份沿用它，登录态不丢
}

export class BrowserEngine {
  private views = new Map<string, WebContentsView>();
  /** agent 即将操作的页面坐标（ego 的 animationHighlightMouseToPosition）；由 index 接到 AgentPresence */
  agentCursor: (identityId: number, x: number, y: number) => void = () => {};
  private knownPartitions = new Set<string>();

  constructor(
    readonly store: BrowserStore,
    readonly history: HistoryStore,
    private readonly window: ShellWindow,
    private readonly options: EngineOptions,
  ) {
    store.subscribe((snap) => {
      window.setLayout({ ...snap.layout, sidebarCollapsed: snap.layout.sidebarCollapsed && !snap.sidebarPeek });
      this.present(); // 每个维度呈现自己的标签：浏览器 = 身份的活动标签，应用 = 当前应用的标签，其余 = 无
      window.setContentVisible(!snap.layout.overview); // 标签矩阵打开时网页让位
      this.reconcileBackground();
    });
  }

  /** 标签矩阵的缩略图：只截已加载的视图（后台视图也在绘制），JPEG 480 宽；应在网页视图隐藏之前调用 */
  async captureThumbnails(identityId: number): Promise<Thumbnail[]> {
    const out: Thumbnail[] = [];
    for (const tab of this.store.tabsInIdentity(identityId)) {
      const view = this.views.get(tab.id);
      if (!view || view.webContents.isDestroyed()) continue;
      try {
        const image = await view.webContents.capturePage();
        if (image.isEmpty()) continue;
        out.push({ tabId: tab.id, dataUrl: `data:image/jpeg;base64,${image.resize({ width: 480 }).toJPEG(72).toString('base64')}` });
      } catch {
        /* 视图尚未绘制 */
      }
    }
    return out;
  }

  // ============ 启动 ============
  /** 首次启动：一个默认 Identity + 一个新标签页 */
  seed(): void {
    const identity = this.createIdentity({ name: 'Personal', icon: 'user', color: 'blue' }, false);
    if (this.options.legacyPartitionExists) this.store.updateIdentity(identity.id, { partition: LEGACY_PARTITION });
    this.createTab({ identityId: identity.id, activate: true });
  }

  /** 从落盘状态恢复后：只加载当前 Identity 的活动标签，其余保持冷态 */
  wake(): void {
    this.present();
  }

  /** 当前维度该呈现哪个标签：浏览器 = 身份的活动标签；应用 = 当前应用在本身份里的标签；其他维度 = 无 */
  private presentedTabId(): string | null {
    const { module } = this.store.getLayout();
    if (module === 'browser') return this.store.activeTabId();
    if (module === 'apps') {
      const appId = this.store.currentAppId;
      return appId ? (this.store.appTab(appId)?.id ?? null) : null;
    }
    return null;
  }
  /** 把该呈现的标签放进内容视图槽位（幂等） */
  present(): void {
    const id = this.presentedTabId();
    const view = id ? this.ensureLoaded(id) : null;
    if (view !== this.window.currentContentView) this.window.setContentView(view);
  }

  // ============ Tab：创建与激活 ============
  createTab(
    input: { url?: string; identityId?: number | null; partition?: string; pinned?: boolean; folderId?: string | null; activate?: boolean; index?: number; customTitle?: string | null; appId?: string } = {},
  ): Tab {
    const identityId = input.identityId === undefined ? this.store.activeIdentityId : input.identityId;
    const url = input.url ? this.publicUrl(input.url) : NEW_TAB_URL;
    const owner = this.store.getIdentity(identityId ?? this.store.activeIdentityId);
    const tab: Tab = {
      id: crypto.randomUUID(),
      identityId,
      partition: input.partition ?? owner?.partition ?? this.store.activeIdentity.partition,
      folderId: identityId === null ? null : (input.folderId ?? null),
      url,
      title: url === NEW_TAB_URL ? 'New Tab' : url,
      customTitle: input.customTitle ?? null,
      favicon: null,
      pinned: identityId === null ? true : (input.pinned ?? false),
      loading: false,
      canGoBack: false,
      canGoForward: false,
      discarded: true,
      audible: false,
      muted: false,
      lastActiveAt: 0,
      createdAt: Date.now(),
      appId: input.appId ?? null,
    };
    this.store.addTab(tab, input.index);
    if (input.activate ?? true) this.activateTab(tab.id);
    else this.ensureLoaded(tab.id);
    return tab;
  }

  /** 激活并展示：切到它所在的 Identity（收藏则留在当前 Identity） */
  activateTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    this.ensureLoaded(tabId);
    const identityId = tab.identityId ?? this.store.activeIdentityId;
    this.store.setActiveIdentity(identityId);
    if (tab.appId) {
      // 应用标签：在应用维度里呈现，不改浏览器的活动标签
      this.store.setActiveApp(tab.appId);
      if (this.store.getLayout().module !== 'apps') this.store.setLayout({ module: 'apps' });
    } else {
      this.store.setActiveTab(identityId, tabId);
      if (this.store.getLayout().module !== 'browser') this.store.setLayout({ module: 'browser' });
    }
    this.present();
  }

  /** 只在标签所属 Identity 内选中它：Identity 正在展示则切到前台，否则留在后台（agent 用，不抢用户的视线） */
  selectTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const identityId = tab.identityId ?? this.store.activeIdentityId;
    this.store.setActiveTab(identityId, tabId);
    if (identityId === this.store.activeIdentityId) this.window.setContentView(this.ensureLoaded(tabId));
  }

  /** ⌃Tab：切到当前 Identity 最近使用的另一个标签 */
  switchMru(): void {
    const current = this.store.activeTabId();
    const next = this.store.mruTabs().find((t) => t.id !== current);
    if (next) this.activateTab(next.id);
  }

  // ============ Tab：关闭系列 ============
  closeTab(tabId = this.store.activeTabId() ?? ''): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const viewSpace = this.store.activeIdentityId;
    const wasShown = this.store.activeTabId(viewSpace) === tabId;
    const neighbor = wasShown ? this.store.neighborOf(tabId, viewSpace) : undefined;
    this.destroyView(tabId);
    if (tab.pinned || tab.identityId === null) {
      // Arc 语义：关闭固定/收藏标签 = 卸载回冷态，位置保留
      this.store.updateTab(tabId, { discarded: true, loading: false, audible: false });
    } else {
      this.store.pushClosed({ url: tab.url, title: tab.title, customTitle: tab.customTitle, favicon: tab.favicon, identityId: tab.identityId, partition: tab.partition, pinned: false, folderId: tab.folderId, closedAt: Date.now() });
      this.store.removeTab(tabId);
    }
    if (wasShown) {
      if (neighbor && neighbor.id !== tabId) this.activateTab(neighbor.id);
      else {
        this.store.setActiveTab(viewSpace, null);
        this.window.setContentView(null);
      }
    }
  }

  closeOthers(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab || tab.identityId === null) return;
    for (const t of this.store.tabsInIdentity(tab.identityId)) if (t.id !== tabId && !t.pinned) this.closeTab(t.id);
    this.activateTab(tabId);
  }

  closeBelow(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab || tab.identityId === null) return;
    const section = this.store.sectionTabs(tab);
    const i = section.findIndex((t) => t.id === tabId);
    for (const t of section.slice(i + 1)) if (!t.pinned) this.closeTab(t.id);
  }

  /** Arc 的 Clear：关掉 Identity 内所有非固定标签 */
  closeUnpinned(identityId = this.store.activeIdentityId): void {
    for (const t of this.store.tabsInIdentity(identityId)) if (!t.pinned) this.closeTab(t.id);
  }

  reopenClosed(): void {
    const entry = this.store.popClosed();
    if (!entry) return;
    const identityId = entry.identityId !== null && this.store.getIdentity(entry.identityId) ? entry.identityId : this.store.activeIdentityId;
    const folderId = entry.folderId && this.store.getFolder(entry.folderId)?.identityId === identityId ? entry.folderId : null;
    this.createTab({ url: entry.url, identityId, partition: entry.partition, pinned: entry.pinned, folderId, customTitle: entry.customTitle, activate: true });
  }

  // ============ Tab：导航 ============
  navigate(input: string, tabId = this.store.activeTabId() ?? undefined): void {
    const url = resolveInput(input);
    if (!tabId) {
      this.createTab({ url, activate: true });
      return;
    }
    const view = this.ensureLoaded(tabId);
    this.store.updateTab(tabId, { url: this.publicUrl(url), loading: true });
    void view.webContents.loadURL(this.loadableUrl(url)).catch(() => {
      /* 加载失败由 did-fail-load 投影 */
    });
  }

  back(tabId = this.store.activeTabId() ?? ''): void {
    const wc = this.webContentsOf(tabId);
    if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  }
  forward(tabId = this.store.activeTabId() ?? ''): void {
    const wc = this.webContentsOf(tabId);
    if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  }
  /** 网页缩放（作用于当前呈现的视图）：step ±1 = 20%，0 = 还原；Chromium 按站点记住 */
  zoom(step: 1 | -1 | 0): void {
    const wc = this.window.currentContentView?.webContents;
    if (!wc || wc.isDestroyed()) return;
    if (step === 0) wc.setZoomLevel(0);
    else wc.setZoomLevel(Math.max(-3, Math.min(5, wc.getZoomLevel() + step)));
  }
  reload(tabId = this.store.activeTabId() ?? ''): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    if (tab.discarded) this.ensureLoaded(tabId);
    else this.webContentsOf(tabId)?.reload();
  }
  stop(tabId = this.store.activeTabId() ?? ''): void {
    this.webContentsOf(tabId)?.stop();
  }
  copyUrl(tabId = this.store.activeTabId() ?? ''): void {
    const tab = this.store.getTab(tabId);
    if (tab) clipboard.writeText(tab.url === NEW_TAB_URL ? '' : tab.url);
  }

  // ============ Tab：整理 ============
  pinTab(tabId: string, pinned: boolean): void {
    const tab = this.store.getTab(tabId);
    if (!tab || tab.identityId === null || tab.pinned === pinned) return;
    this.store.placeTab(tabId, { identityId: tab.identityId, pinned, folderId: pinned ? null : tab.folderId, index: pinned ? Number.MAX_SAFE_INTEGER : 0 });
  }

  favoriteTab(tabId: string, favorite: boolean): void {
    const tab = this.store.getTab(tabId);
    if (!tab || (tab.identityId === null) === favorite) return;
    if (favorite) this.store.placeTab(tabId, { identityId: null, pinned: true, folderId: null, index: Number.MAX_SAFE_INTEGER });
    else this.store.placeTab(tabId, { identityId: this.store.activeIdentityId, pinned: true, folderId: null, index: Number.MAX_SAFE_INTEGER });
  }

  moveTab(tabId: string, to: TabTarget): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const fromSpace = tab.identityId;
    const wasActiveThere = fromSpace !== null && this.store.activeTabId(fromSpace) === tabId;
    this.store.placeTab(tabId, to);
    if (wasActiveThere && fromSpace !== to.identityId) {
      const next = this.store.tabsInIdentity(fromSpace!)[0];
      if (fromSpace === this.store.activeIdentityId) {
        if (next) this.activateTab(next.id);
        else this.window.setContentView(null);
      } else if (next) this.store.setActiveTab(fromSpace!, next.id);
    }
  }

  renameTab(tabId: string, title: string | null): void {
    this.store.updateTab(tabId, { customTitle: title?.trim() || null });
  }

  duplicateTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const section = this.store.sectionTabs(tab);
    const at = section.findIndex((t) => t.id === tabId) + 1;
    this.createTab({ url: tab.url, identityId: tab.identityId ?? this.store.activeIdentityId, partition: tab.partition, pinned: tab.identityId === null ? false : tab.pinned, folderId: tab.folderId, index: at, activate: true });
  }

  muteTab(tabId: string, muted: boolean): void {
    this.store.updateTab(tabId, { muted });
    this.webContentsOf(tabId)?.setAudioMuted(muted);
  }

  openDevTools(tabId = this.store.activeTabId() ?? ''): void {
    this.webContentsOf(tabId)?.openDevTools({ mode: 'detach' });
  }

  // ============ Folder ============
  createFolder(identityId = this.store.activeIdentityId, name = 'New Folder', tabIds: string[] = []): string {
    const folder = this.store.createFolder(identityId, name);
    tabIds.forEach((id, i) => {
      const tab = this.store.getTab(id);
      if (tab && tab.identityId === identityId) this.store.placeTab(id, { identityId, pinned: false, folderId: folder.id, index: i });
    });
    return folder.id;
  }

  updateFolder(folderId: string, patch: { name?: string; color?: FolderColor; collapsed?: boolean }): void {
    this.store.updateFolder(folderId, patch);
  }

  deleteFolder(folderId: string, closeTabs = false): void {
    if (closeTabs) for (const t of this.store.tabsInFolder(folderId)) this.closeTab(t.id);
    this.store.deleteFolder(folderId);
  }

  // ============ Identity ============
  /** 用户身份 = 全新的 session 分区；agent 身份继承当前身份的分区（ego 语义：agent 共享用户登录态） */
  createIdentity(input: { name: string; icon?: IdentityIcon; color?: IdentityColor; ownership?: Ownership; taskId?: string }, activate = true): Identity {
    const agent = input.ownership === 'agent';
    const identity = this.store.createIdentity({
      name: input.name,
      icon: input.icon ?? (agent ? 'bot' : 'user'),
      color: input.color ?? (agent ? AGENT_IDENTITY_COLOR : 'blue'),
      partition: agent && this.store.getIdentity(this.store.activeIdentityId) ? this.store.activeIdentity.partition : `persist:identity-${crypto.randomUUID().slice(0, 8)}`,
      ownership: input.ownership ?? 'user',
      taskId: input.taskId,
    });
    if (activate) this.activateIdentity(identity.id);
    return identity;
  }

  activateIdentity(identityId: number): void {
    if (!this.store.getIdentity(identityId)) return;
    this.store.setActiveIdentity(identityId);
    const active = this.store.activeTab(identityId);
    if (active) this.activateTab(active.id);
    else this.window.setContentView(null);
    this.window.focusShell();
  }

  stepIdentity(delta: 1 | -1): void {
    const identities = this.store.allIdentities();
    const i = identities.findIndex((s) => s.id === this.store.activeIdentityId);
    const next = identities[(i + delta + identities.length) % identities.length];
    if (next) this.activateIdentity(next.id);
  }

  updateIdentity(identityId: number, patch: { name?: string; icon?: IdentityIcon; color?: IdentityColor }): void {
    this.store.updateIdentity(identityId, patch);
  }

  reorderIdentity(identityId: number, index: number): void {
    this.store.reorderIdentity(identityId, index);
  }

  deleteIdentity(identityId: number): void {
    if (this.store.allIdentities().length <= 1) return; // 至少保留一个 Identity
    for (const tab of this.store.tabsInIdentity(identityId)) {
      this.destroyView(tab.id);
      this.store.removeTab(tab.id);
    }
    const wasActive = this.store.activeIdentityId === identityId;
    this.store.deleteIdentity(identityId);
    if (wasActive) this.activateIdentity(this.store.activeIdentityId);
  }

  /** 用户接管 agent Identity：命令继续可用，agent 侧收到 USER_IN_CONTROL */
  takeControl(identityId: number): void {
    this.store.updateIdentity(identityId, { ownership: 'agentDelegatedToUser' });
  }
  /** 用户把控制权交还 agent */
  handBack(identityId: number): void {
    this.store.updateIdentity(identityId, { ownership: 'agent' });
  }
  setOwnership(identityId: number, ownership: Ownership, agentState: string | null = null): void {
    this.store.updateIdentity(identityId, { ownership, agentState });
  }

  // ============ 视图生命周期 ============
  /** 冷标签首次被需要时创建 WebContentsView 并加载 */
  ensureLoaded(tabId: string): WebContentsView {
    const existing = this.views.get(tabId);
    if (existing) return existing;
    const tab = this.store.getTab(tabId);
    if (!tab) throw new Error(`unknown tab ${tabId}`);

    const tabSession = this.sessionFor(tab.partition);
    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        session: tabSession,
      },
    });
    view.setBackgroundColor('#ffffff');
    this.views.set(tabId, view);
    wireTabEvents(
      {
        store: this.store,
        history: this.history,
        publicUrl: (url) => this.publicUrl(url),
        openFromTab: (openerId, url, background) => this.openFromTab(openerId, url, background),
        onViewGone: (id, wc) => {
          if (this.views.get(id)?.webContents === wc) this.views.delete(id);
        },
      },
      tabId,
      view.webContents,
    );
    if (tab.muted) view.webContents.setAudioMuted(true);
    this.store.updateTab(tabId, { discarded: false, loading: true });
    this.window.attachBackground(view); // 一出生就有真实视口：未挂窗口的视图是 0×0，页面会在 0×0 下布局、之后只重排一半
    void view.webContents.loadURL(this.loadableUrl(tab.url)).catch(() => {});
    return view;
  }

  /** 分区 → session；首次触达时通知宿主（下载监听等） */
  sessionFor(partition: string): Session {
    const ses = session.fromPartition(partition);
    if (!this.knownPartitions.has(partition)) {
      this.knownPartitions.add(partition);
      this.options.onSession?.(ses, partition);
    }
    return ses;
  }

  shellWebContents(): WebContents {
    return this.window.shellView.webContents;
  }
  /** 辅助视图登记（launcher / 浮窗对话…），供 agent 网关截屏；宿主在装配时注册 */
  private aux = new Map<string, () => WebContents | null>();
  registerAux(name: string, getter: () => WebContents | null): void {
    this.aux.set(name, getter);
  }
  auxWebContents(): [string, WebContents][] {
    const out: [string, WebContents][] = [];
    for (const [name, get] of this.aux) {
      const wc = get();
      if (wc && !wc.isDestroyed()) out.push([name, wc]);
    }
    return out;
  }
  overlayWebContents(): WebContents | null {
    return this.window.palette.webContents();
  }
  overlayVisible(): boolean {
    return this.window.palette.isOpen();
  }

  webContentsOf(tabId: string): WebContents | undefined {
    const view = this.views.get(tabId);
    return view && !view.webContents.isDestroyed() ? view.webContents : undefined;
  }

  private openFromTab(openerId: string, url: string, background: boolean): void {
    const opener = this.store.getTab(openerId);
    const identityId = opener?.identityId ?? this.store.activeIdentityId;
    const section = opener && opener.identityId !== null ? this.store.sectionTabs({ identityId, pinned: false, folderId: opener.folderId }) : [];
    const at = opener ? section.findIndex((t) => t.id === openerId) + 1 : undefined;
    this.createTab({ url, identityId, folderId: opener?.identityId !== null ? opener?.folderId : null, activate: !background, index: at === 0 ? 0 : at });
  }

  private destroyView(tabId: string): void {
    const view = this.views.get(tabId);
    if (!view) return;
    this.views.delete(tabId);
    this.window.detach(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }

  /**
   * 后台层对账：每个 agent 持有的 Identity，其活动标签若不在前台，就压到壳之下继续绘制。
   * 幂等；由 store 变更触发。ensureLoaded 可能再次触发 emit，下一轮对账无事可做即收敛。
   */
  /** 后台层 = 所有已加载但此刻没被呈现的视图（agent 的标签、应用标签、别的维度/身份的标签）：它们在壳之下继续绘制，随时能被呈现、截图、驱动 */
  private reconcileBackground(): void {
    const shown = this.window.currentContentView;
    for (const identity of this.store.allIdentities()) {
      if (identity.ownership === 'user') continue;
      const tab = this.store.activeTab(identity.id);
      if (tab) this.ensureLoaded(tab.id); // agent 的活动标签必须活着
    }
    for (const view of this.views.values()) if (view !== shown) this.window.attachBackground(view);
  }

  // ============ 地址映射：真实加载地址 ↔ 对外公开地址 ============
  private loadableUrl(url: string): string {
    return url === NEW_TAB_URL || url === 'about:blank' ? this.options.newTabUrl : url;
  }
  private publicUrl(url: string): string {
    if (!url) return NEW_TAB_URL;
    return url.startsWith(this.options.newTabUrl) ? NEW_TAB_URL : url;
  }

  /** 供菜单与日志使用的可读标题 */
  titleOf(tabId: string): string {
    const tab = this.store.getTab(tabId);
    return tab ? tabTitle(tab) : '';
  }
}
