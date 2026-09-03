/**
 * [INPUT]: 依赖 electron 的 WebContentsView/WebContents/session/clipboard，./store 的 BrowserStore，./history 的 HistoryStore，./view-events 的 wireTabEvents，../shell/window 的 ShellWindow，@shared/model 与 @shared/url，@shared/ipc 的 TabTarget
 * [OUTPUT]: 对外提供 BrowserEngine 类：标签页（创建/激活/Space 内选中/关闭系列/重开/导航/固定/收藏/移动/重命名/复制/静音/MRU）、文件夹、Space（创建/激活/步进/更新/排序/删除/接管/交还）的全部动作，视图生命周期与 agent 后台层对账，给 agent 网关的 webContentsOf/shellWebContents/ensureLoaded
 * [POS]: browser 模块的指挥者，是 store 的唯一写者、ShellWindow 的唯一调用者；ipc/handlers、menu、menus/context-menu、agent/session 都只调用它的公开方法
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { WebContentsView, clipboard, session, type WebContents } from 'electron';
import { AGENT_SPACE_COLOR, NEW_TAB_URL, tabTitle, type FolderColor, type Ownership, type Space, type SpaceColor, type Tab } from '@shared/model';
import type { TabTarget } from '@shared/ipc';
import { resolveInput } from '@shared/url';
import { BrowserStore } from './store';
import type { HistoryStore } from './history';
import { wireTabEvents } from './view-events';
import type { ShellWindow } from '../shell/window';

export const TAB_PARTITION = 'persist:samo'; // 用户与 agent 共享同一登录态（ego 语义）

export interface EngineOptions {
  newTabUrl: string; // 真实加载地址（dev 为 vite 服务、prod 为 file://）
}

export class BrowserEngine {
  private views = new Map<string, WebContentsView>();

  constructor(
    readonly store: BrowserStore,
    readonly history: HistoryStore,
    private readonly window: ShellWindow,
    private readonly options: EngineOptions,
  ) {
    store.subscribe((snap) => {
      window.setLayout({ ...snap.layout, sidebarCollapsed: snap.layout.sidebarCollapsed && !snap.sidebarPeek });
      this.reconcileBackground();
    });
  }

  // ============ 启动 ============
  /** 首次启动：一个默认 Space + 一个新标签页 */
  seed(): void {
    const space = this.store.createSpace({ name: 'Home', emoji: '🏠', color: 'blue', ownership: 'user' });
    this.createTab({ spaceId: space.id, activate: true });
  }

  /** 从落盘状态恢复后：只加载当前 Space 的活动标签，其余保持冷态 */
  wake(): void {
    const active = this.store.activeTab();
    if (active) this.activateTab(active.id);
    else this.window.setContentView(null);
  }

  // ============ Tab：创建与激活 ============
  createTab(
    input: { url?: string; spaceId?: number | null; pinned?: boolean; folderId?: string | null; activate?: boolean; index?: number; customTitle?: string | null } = {},
  ): Tab {
    const spaceId = input.spaceId === undefined ? this.store.activeSpaceId : input.spaceId;
    const url = input.url ? this.publicUrl(input.url) : NEW_TAB_URL;
    const tab: Tab = {
      id: crypto.randomUUID(),
      spaceId,
      folderId: spaceId === null ? null : (input.folderId ?? null),
      url,
      title: url === NEW_TAB_URL ? 'New Tab' : url,
      customTitle: input.customTitle ?? null,
      favicon: null,
      pinned: spaceId === null ? true : (input.pinned ?? false),
      loading: false,
      canGoBack: false,
      canGoForward: false,
      discarded: true,
      audible: false,
      muted: false,
      lastActiveAt: 0,
      createdAt: Date.now(),
    };
    this.store.addTab(tab, input.index);
    if (input.activate ?? true) this.activateTab(tab.id);
    else this.ensureLoaded(tab.id);
    return tab;
  }

  /** 激活并展示：切到它所在的 Space（收藏则留在当前 Space） */
  activateTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const view = this.ensureLoaded(tabId);
    const spaceId = tab.spaceId ?? this.store.activeSpaceId;
    this.store.setActiveSpace(spaceId);
    this.store.setActiveTab(spaceId, tabId);
    this.window.setContentView(view);
  }

  /** 只在标签所属 Space 内选中它：Space 正在展示则切到前台，否则留在后台（agent 用，不抢用户的视线） */
  selectTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const spaceId = tab.spaceId ?? this.store.activeSpaceId;
    this.store.setActiveTab(spaceId, tabId);
    if (spaceId === this.store.activeSpaceId) this.window.setContentView(this.ensureLoaded(tabId));
  }

  /** ⌃Tab：切到当前 Space 最近使用的另一个标签 */
  switchMru(): void {
    const current = this.store.activeTabId();
    const next = this.store.mruTabs().find((t) => t.id !== current);
    if (next) this.activateTab(next.id);
  }

  // ============ Tab：关闭系列 ============
  closeTab(tabId = this.store.activeTabId() ?? ''): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const viewSpace = this.store.activeSpaceId;
    const wasShown = this.store.activeTabId(viewSpace) === tabId;
    const neighbor = wasShown ? this.store.neighborOf(tabId, viewSpace) : undefined;
    this.destroyView(tabId);
    if (tab.pinned || tab.spaceId === null) {
      // Arc 语义：关闭固定/收藏标签 = 卸载回冷态，位置保留
      this.store.updateTab(tabId, { discarded: true, loading: false, audible: false });
    } else {
      this.store.pushClosed({ url: tab.url, title: tab.title, customTitle: tab.customTitle, favicon: tab.favicon, spaceId: tab.spaceId, pinned: false, folderId: tab.folderId, closedAt: Date.now() });
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
    if (!tab || tab.spaceId === null) return;
    for (const t of this.store.tabsInSpace(tab.spaceId)) if (t.id !== tabId && !t.pinned) this.closeTab(t.id);
    this.activateTab(tabId);
  }

  closeBelow(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (!tab || tab.spaceId === null) return;
    const section = this.store.sectionTabs(tab);
    const i = section.findIndex((t) => t.id === tabId);
    for (const t of section.slice(i + 1)) if (!t.pinned) this.closeTab(t.id);
  }

  /** Arc 的 Clear：关掉 Space 内所有非固定标签 */
  closeUnpinned(spaceId = this.store.activeSpaceId): void {
    for (const t of this.store.tabsInSpace(spaceId)) if (!t.pinned) this.closeTab(t.id);
  }

  reopenClosed(): void {
    const entry = this.store.popClosed();
    if (!entry) return;
    const spaceId = entry.spaceId !== null && this.store.getSpace(entry.spaceId) ? entry.spaceId : this.store.activeSpaceId;
    const folderId = entry.folderId && this.store.getFolder(entry.folderId)?.spaceId === spaceId ? entry.folderId : null;
    this.createTab({ url: entry.url, spaceId, pinned: entry.pinned, folderId, customTitle: entry.customTitle, activate: true });
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
    if (!tab || tab.spaceId === null || tab.pinned === pinned) return;
    this.store.placeTab(tabId, { spaceId: tab.spaceId, pinned, folderId: pinned ? null : tab.folderId, index: pinned ? Number.MAX_SAFE_INTEGER : 0 });
  }

  favoriteTab(tabId: string, favorite: boolean): void {
    const tab = this.store.getTab(tabId);
    if (!tab || (tab.spaceId === null) === favorite) return;
    if (favorite) this.store.placeTab(tabId, { spaceId: null, pinned: true, folderId: null, index: Number.MAX_SAFE_INTEGER });
    else this.store.placeTab(tabId, { spaceId: this.store.activeSpaceId, pinned: true, folderId: null, index: Number.MAX_SAFE_INTEGER });
  }

  moveTab(tabId: string, to: TabTarget): void {
    const tab = this.store.getTab(tabId);
    if (!tab) return;
    const fromSpace = tab.spaceId;
    const wasActiveThere = fromSpace !== null && this.store.activeTabId(fromSpace) === tabId;
    this.store.placeTab(tabId, to);
    if (wasActiveThere && fromSpace !== to.spaceId) {
      const next = this.store.tabsInSpace(fromSpace!)[0];
      if (fromSpace === this.store.activeSpaceId) {
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
    this.createTab({ url: tab.url, spaceId: tab.spaceId ?? this.store.activeSpaceId, pinned: tab.spaceId === null ? false : tab.pinned, folderId: tab.folderId, index: at, activate: true });
  }

  muteTab(tabId: string, muted: boolean): void {
    this.store.updateTab(tabId, { muted });
    this.webContentsOf(tabId)?.setAudioMuted(muted);
  }

  openDevTools(tabId = this.store.activeTabId() ?? ''): void {
    this.webContentsOf(tabId)?.openDevTools({ mode: 'detach' });
  }

  // ============ Folder ============
  createFolder(spaceId = this.store.activeSpaceId, name = 'New Folder', tabIds: string[] = []): string {
    const folder = this.store.createFolder(spaceId, name);
    tabIds.forEach((id, i) => {
      const tab = this.store.getTab(id);
      if (tab && tab.spaceId === spaceId) this.store.placeTab(id, { spaceId, pinned: false, folderId: folder.id, index: i });
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

  // ============ Space ============
  createSpace(input: { name: string; emoji?: string; color?: SpaceColor; ownership?: Ownership; taskId?: string }, activate = true): Space {
    const space = this.store.createSpace({
      name: input.name,
      emoji: input.emoji ?? '✦',
      color: input.color ?? (input.ownership === 'agent' ? AGENT_SPACE_COLOR : 'blue'),
      ownership: input.ownership ?? 'user',
      taskId: input.taskId,
    });
    if (activate) this.activateSpace(space.id);
    return space;
  }

  activateSpace(spaceId: number): void {
    if (!this.store.getSpace(spaceId)) return;
    this.store.setActiveSpace(spaceId);
    const active = this.store.activeTab(spaceId);
    if (active) this.activateTab(active.id);
    else this.window.setContentView(null);
    this.window.focusShell();
  }

  stepSpace(delta: 1 | -1): void {
    const spaces = this.store.allSpaces();
    const i = spaces.findIndex((s) => s.id === this.store.activeSpaceId);
    const next = spaces[(i + delta + spaces.length) % spaces.length];
    if (next) this.activateSpace(next.id);
  }

  updateSpace(spaceId: number, patch: { name?: string; emoji?: string; color?: SpaceColor }): void {
    this.store.updateSpace(spaceId, patch);
  }

  reorderSpace(spaceId: number, index: number): void {
    this.store.reorderSpace(spaceId, index);
  }

  deleteSpace(spaceId: number): void {
    if (this.store.allSpaces().length <= 1) return; // 至少保留一个 Space
    for (const tab of this.store.tabsInSpace(spaceId)) {
      this.destroyView(tab.id);
      this.store.removeTab(tab.id);
    }
    const wasActive = this.store.activeSpaceId === spaceId;
    this.store.deleteSpace(spaceId);
    if (wasActive) this.activateSpace(this.store.activeSpaceId);
  }

  /** 用户接管 agent Space：命令继续可用，agent 侧收到 USER_IN_CONTROL */
  takeControl(spaceId: number): void {
    this.store.updateSpace(spaceId, { ownership: 'agentDelegatedToUser' });
  }
  /** 用户把控制权交还 agent */
  handBack(spaceId: number): void {
    this.store.updateSpace(spaceId, { ownership: 'agent' });
  }
  setOwnership(spaceId: number, ownership: Ownership, agentState: string | null = null): void {
    this.store.updateSpace(spaceId, { ownership, agentState });
  }

  // ============ 视图生命周期 ============
  /** 冷标签首次被需要时创建 WebContentsView 并加载 */
  ensureLoaded(tabId: string): WebContentsView {
    const existing = this.views.get(tabId);
    if (existing) return existing;
    const tab = this.store.getTab(tabId);
    if (!tab) throw new Error(`unknown tab ${tabId}`);

    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        partition: TAB_PARTITION,
        session: session.fromPartition(TAB_PARTITION),
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
    void view.webContents.loadURL(this.loadableUrl(tab.url)).catch(() => {});
    return view;
  }

  shellWebContents(): WebContents {
    return this.window.shellView.webContents;
  }

  webContentsOf(tabId: string): WebContents | undefined {
    const view = this.views.get(tabId);
    return view && !view.webContents.isDestroyed() ? view.webContents : undefined;
  }

  private openFromTab(openerId: string, url: string, background: boolean): void {
    const opener = this.store.getTab(openerId);
    const spaceId = opener?.spaceId ?? this.store.activeSpaceId;
    const section = opener && opener.spaceId !== null ? this.store.sectionTabs({ spaceId, pinned: false, folderId: opener.folderId }) : [];
    const at = opener ? section.findIndex((t) => t.id === openerId) + 1 : undefined;
    this.createTab({ url, spaceId, folderId: opener?.spaceId !== null ? opener?.folderId : null, activate: !background, index: at === 0 ? 0 : at });
  }

  private destroyView(tabId: string): void {
    const view = this.views.get(tabId);
    if (!view) return;
    this.views.delete(tabId);
    this.window.detach(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }

  /**
   * 后台层对账：每个 agent 持有的 Space，其活动标签若不在前台，就压到壳之下继续绘制。
   * 幂等；由 store 变更触发。ensureLoaded 可能再次触发 emit，下一轮对账无事可做即收敛。
   */
  private reconcileBackground(): void {
    const shown = this.window.currentContentView;
    const wanted = new Set<WebContentsView>();
    for (const space of this.store.allSpaces()) {
      if (space.ownership === 'user') continue;
      const tab = this.store.activeTab(space.id);
      if (!tab) continue;
      const view = this.ensureLoaded(tab.id);
      if (view !== shown) wanted.add(view);
    }
    for (const view of this.window.backgroundViews()) if (!wanted.has(view)) this.window.detach(view);
    for (const view of wanted) this.window.attachBackground(view);
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
