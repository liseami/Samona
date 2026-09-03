/**
 * [INPUT]: 依赖 @shared/model 的 Space/Folder/Tab/Download/Layout/BrowserSnapshot 与常量，@shared/ipc 的 TabTarget
 * [OUTPUT]: 对外提供 BrowserStore 类（内存真相 + 变更订阅）、PersistedState/ClosedTab 类型
 * [POS]: browser 模块的状态心脏，零 Electron 依赖、可单测；engine 是唯一写者，ipc/agent 只读快照。标签的全局顺序只在「同一分区」（收藏 / Space 固定区 / 文件夹 / 散装列表）内有意义，分区之间的排布由渲染层决定
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  CLOSED_STACK_MAX,
  DEFAULT_LAYOUT,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  type BrowserSnapshot,
  type Download,
  type Folder,
  type Layout,
  type Space,
  type Tab,
} from '@shared/model';
import type { TabTarget } from '@shared/ipc';

// ============ 落盘形态：只保留可恢复的语义字段 ============
export interface PersistedTab {
  id: string;
  spaceId: number | null;
  folderId: string | null;
  url: string;
  title: string;
  customTitle: string | null;
  favicon: string | null;
  pinned: boolean;
  muted: boolean;
  lastActiveAt: number;
  createdAt: number;
}
export interface ClosedTab {
  url: string;
  title: string;
  customTitle: string | null;
  favicon: string | null;
  spaceId: number | null;
  pinned: boolean;
  folderId: string | null;
  closedAt: number;
}
export interface PersistedState {
  version: 2;
  spaces: Space[]; // 数组顺序即侧栏顺序
  folders: Folder[];
  tabs: PersistedTab[];
  closed: ClosedTab[];
  activeSpaceId: number;
  activeTabIdBySpace: Record<number, string | null>;
  layout: Layout;
  nextSpaceId: number;
}

type Listener = (snapshot: BrowserSnapshot) => void;

/** 部分补丁只保留显式给出的键：调用方常传 { name: undefined }，不能把已有字段抹掉 */
function compact<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export class BrowserStore {
  private spaces = new Map<number, Space>();
  private spaceOrder: number[] = [];
  private folders = new Map<string, Folder>();
  private tabs = new Map<string, Tab>();
  private order: string[] = []; // 全局顺序，按分区过滤即得分区内顺序
  private downloads = new Map<string, Download>();
  private closed: ClosedTab[] = [];
  private _activeSpaceId = 0;
  private activeTabIdBySpace: Record<number, string | null> = {};
  private layout: Layout = { ...DEFAULT_LAYOUT };
  private sidebarPeek = false;
  private dark = false;
  private nextSpaceId = 1;
  private listeners = new Set<Listener>();
  private emitScheduled = false;

  // ---------- 订阅 ----------
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    queueMicrotask(() => {
      this.emitScheduled = false;
      const snap = this.snapshot();
      for (const l of this.listeners) l(snap);
    });
  }

  // ---------- 快照 ----------
  snapshot(): BrowserSnapshot {
    return {
      spaces: this.allSpaces(),
      folders: [...this.folders.values()],
      tabs: this.order.map((id) => this.tabs.get(id)!).filter(Boolean),
      downloads: [...this.downloads.values()].sort((a, b) => b.startedAt - a.startedAt),
      activeSpaceId: this._activeSpaceId,
      activeTabIdBySpace: { ...this.activeTabIdBySpace },
      layout: { ...this.layout },
      sidebarPeek: this.sidebarPeek,
      closedCount: this.closed.length,
      dark: this.dark,
    };
  }

  // ---------- 查询 ----------
  get activeSpaceId(): number {
    return this._activeSpaceId;
  }
  getSpace(id: number): Space | undefined {
    return this.spaces.get(id);
  }
  allSpaces(): Space[] {
    return this.spaceOrder.map((id) => this.spaces.get(id)!).filter(Boolean);
  }
  getFolder(id: string): Folder | undefined {
    return this.folders.get(id);
  }
  foldersInSpace(spaceId: number): Folder[] {
    return [...this.folders.values()].filter((f) => f.spaceId === spaceId);
  }
  getTab(id: string): Tab | undefined {
    return this.tabs.get(id);
  }
  /** 某 Space 的全部标签（固定 + 文件夹内 + 散装）；spaceId 为 null 即收藏 */
  tabsInSpace(spaceId: number | null): Tab[] {
    return this.order.map((id) => this.tabs.get(id)!).filter((t) => t && t.spaceId === spaceId);
  }
  favorites(): Tab[] {
    return this.tabsInSpace(null);
  }
  tabsInFolder(folderId: string): Tab[] {
    return this.order.map((id) => this.tabs.get(id)!).filter((t) => t && t.folderId === folderId);
  }
  /** 同一分区的兄弟：收藏 / Space 固定区 / 某文件夹 / 散装列表 */
  sectionTabs(target: Pick<TabTarget, 'spaceId' | 'pinned' | 'folderId'>): Tab[] {
    return this.order
      .map((id) => this.tabs.get(id)!)
      .filter((t) => t && t.spaceId === target.spaceId && (target.spaceId === null || (t.pinned === target.pinned && t.folderId === target.folderId)));
  }
  get activeSpace(): Space {
    return this.spaces.get(this._activeSpaceId)!;
  }
  activeTabId(spaceId = this._activeSpaceId): string | null {
    return this.activeTabIdBySpace[spaceId] ?? null;
  }
  activeTab(spaceId = this._activeSpaceId): Tab | undefined {
    const id = this.activeTabId(spaceId);
    return id ? this.tabs.get(id) : undefined;
  }
  /** 某 Space 可见的标签按最近使用排序（含收藏） */
  mruTabs(spaceId = this._activeSpaceId): Tab[] {
    return [...this.tabsInSpace(spaceId), ...this.favorites()].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }
  getLayout(): Layout {
    return { ...this.layout };
  }
  isPeeking(): boolean {
    return this.sidebarPeek;
  }

  // ---------- Space ----------
  createSpace(input: Omit<Space, 'id' | 'createdAt' | 'agentState'> & { agentState?: string | null }): Space {
    const space: Space = { ...input, agentState: input.agentState ?? null, id: this.nextSpaceId++, createdAt: Date.now() };
    this.spaces.set(space.id, space);
    this.spaceOrder.push(space.id);
    this.activeTabIdBySpace[space.id] = null;
    if (!this.spaces.has(this._activeSpaceId)) this._activeSpaceId = space.id;
    this.emit();
    return space;
  }

  updateSpace(id: number, patch: Partial<Omit<Space, 'id' | 'createdAt'>>): Space | undefined {
    const space = this.spaces.get(id);
    if (!space) return undefined;
    Object.assign(space, compact(patch));
    this.emit();
    return space;
  }

  reorderSpace(id: number, index: number): void {
    if (!this.spaces.has(id)) return;
    this.spaceOrder = this.spaceOrder.filter((x) => x !== id);
    this.spaceOrder.splice(Math.max(0, Math.min(index, this.spaceOrder.length)), 0, id);
    this.emit();
  }

  /** 删除 Space 记录本身；其标签与文件夹应先由 engine 清理 */
  deleteSpace(id: number): void {
    if (!this.spaces.delete(id)) return;
    this.spaceOrder = this.spaceOrder.filter((x) => x !== id);
    delete this.activeTabIdBySpace[id];
    for (const f of this.foldersInSpace(id)) this.folders.delete(f.id);
    if (this._activeSpaceId === id) this._activeSpaceId = this.spaceOrder[0] ?? 0;
    this.emit();
  }

  setActiveSpace(id: number): void {
    if (!this.spaces.has(id) || this._activeSpaceId === id) return;
    this._activeSpaceId = id;
    this.emit();
  }

  // ---------- Folder ----------
  createFolder(spaceId: number, name: string, color: Folder['color'] = 'grey'): Folder {
    const folder: Folder = { id: crypto.randomUUID(), spaceId, name, color, collapsed: false, createdAt: Date.now() };
    this.folders.set(folder.id, folder);
    this.emit();
    return folder;
  }

  updateFolder(id: string, patch: Partial<Omit<Folder, 'id' | 'spaceId' | 'createdAt'>>): void {
    const folder = this.folders.get(id);
    if (!folder) return;
    Object.assign(folder, compact(patch));
    this.emit();
  }

  /** 删除文件夹，成员回到散装列表（保持相对顺序） */
  deleteFolder(id: string): void {
    if (!this.folders.delete(id)) return;
    for (const tab of this.tabs.values()) if (tab.folderId === id) tab.folderId = null;
    this.emit();
  }

  // ---------- Tab ----------
  addTab(tab: Tab, index?: number): Tab {
    this.tabs.set(tab.id, tab);
    this.order.push(tab.id);
    if (index !== undefined) this.placeTab(tab.id, { spaceId: tab.spaceId, pinned: tab.pinned, folderId: tab.folderId, index });
    else this.emit();
    return tab;
  }

  updateTab(id: string, patch: Partial<Omit<Tab, 'id'>>): Tab | undefined {
    const tab = this.tabs.get(id);
    if (!tab) return undefined;
    Object.assign(tab, compact(patch));
    this.emit();
    return tab;
  }

  removeTab(id: string): Tab | undefined {
    const tab = this.tabs.get(id);
    if (!tab) return undefined;
    this.tabs.delete(id);
    this.order = this.order.filter((x) => x !== id);
    for (const [spaceId, active] of Object.entries(this.activeTabIdBySpace)) if (active === id) this.activeTabIdBySpace[Number(spaceId)] = null;
    this.emit();
    return tab;
  }

  /** 统一的移动：改分区（Space/收藏/固定/文件夹）并落在分区内 index 位 */
  placeTab(id: string, target: TabTarget): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (target.spaceId !== null && !this.spaces.has(target.spaceId)) return;
    if (target.folderId && this.folders.get(target.folderId)?.spaceId !== target.spaceId) return;
    const leavingSpace = tab.spaceId !== null && tab.spaceId !== target.spaceId;
    if (leavingSpace && this.activeTabIdBySpace[tab.spaceId!] === id) this.activeTabIdBySpace[tab.spaceId!] = null;

    this.order = this.order.filter((x) => x !== id);
    tab.spaceId = target.spaceId;
    tab.pinned = target.spaceId === null ? true : target.pinned;
    tab.folderId = target.spaceId === null ? null : target.folderId;
    const siblings = this.sectionTabs(target);
    if (target.index < siblings.length) {
      this.order.splice(this.order.indexOf(siblings[target.index].id), 0, id);
    } else if (siblings.length > 0) {
      this.order.splice(this.order.indexOf(siblings[siblings.length - 1].id) + 1, 0, id);
    } else {
      this.order.push(id);
    }
    this.emit();
  }

  setActiveTab(spaceId: number, tabId: string | null): void {
    if (this.activeTabIdBySpace[spaceId] === tabId) return;
    this.activeTabIdBySpace[spaceId] = tabId;
    if (tabId) {
      const tab = this.tabs.get(tabId);
      if (tab) tab.lastActiveAt = Date.now();
    }
    this.emit();
  }

  /** 关闭某标签后应聚焦的邻居：先同分区右/左邻，再 Space 内其他标签 */
  neighborOf(tabId: string, viewSpaceId = this._activeSpaceId): Tab | undefined {
    const tab = this.tabs.get(tabId);
    if (!tab) return undefined;
    const section = this.sectionTabs(tab);
    const i = section.findIndex((t) => t.id === tabId);
    const sibling = section[i + 1] ?? section[i - 1];
    if (sibling) return sibling;
    return this.tabsInSpace(viewSpaceId).find((t) => t.id !== tabId) ?? this.favorites().find((t) => t.id !== tabId);
  }

  // ---------- 已关闭栈 ----------
  pushClosed(entry: ClosedTab): void {
    this.closed.unshift(entry);
    if (this.closed.length > CLOSED_STACK_MAX) this.closed.length = CLOSED_STACK_MAX;
    this.emit();
  }
  popClosed(): ClosedTab | undefined {
    const entry = this.closed.shift();
    if (entry) this.emit();
    return entry;
  }

  // ---------- 下载 ----------
  upsertDownload(download: Download): void {
    this.downloads.set(download.id, download);
    this.emit();
  }
  getDownload(id: string): Download | undefined {
    return this.downloads.get(id);
  }
  clearFinishedDownloads(): void {
    for (const [id, d] of this.downloads) if (d.state !== 'progressing') this.downloads.delete(id);
    this.emit();
  }

  // ---------- Layout / 外观 ----------
  setLayout(patch: Partial<Layout>): void {
    if (patch.sidebarWidth !== undefined) {
      this.layout.sidebarWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(patch.sidebarWidth)));
    }
    if (patch.sidebarCollapsed !== undefined) {
      this.layout.sidebarCollapsed = patch.sidebarCollapsed;
      this.sidebarPeek = false;
    }
    this.emit();
  }
  setPeek(peek: boolean): void {
    if (this.sidebarPeek === peek) return;
    this.sidebarPeek = peek;
    this.emit();
  }
  setDark(dark: boolean): void {
    if (this.dark === dark) return;
    this.dark = dark;
    this.emit();
  }

  // ---------- 持久化 ----------
  toPersisted(): PersistedState {
    return {
      version: 2,
      spaces: this.allSpaces(),
      folders: [...this.folders.values()],
      tabs: this.order
        .map((id) => this.tabs.get(id)!)
        .filter(Boolean)
        .map(({ id, spaceId, folderId, url, title, customTitle, favicon, pinned, muted, lastActiveAt, createdAt }) => ({
          id,
          spaceId,
          folderId,
          url,
          title,
          customTitle,
          favicon,
          pinned,
          muted,
          lastActiveAt,
          createdAt,
        })),
      closed: this.closed,
      activeSpaceId: this._activeSpaceId,
      activeTabIdBySpace: { ...this.activeTabIdBySpace },
      layout: { ...this.layout },
      nextSpaceId: this.nextSpaceId,
    };
  }

  /** 从落盘状态重建；所有标签以 discarded（冷）态进入，由 engine 决定何时真正加载。兼容 v1（缺省字段补默认） */
  hydrate(state: PersistedState | (Omit<PersistedState, 'version' | 'folders' | 'closed'> & { version: 1 })): void {
    this.spaces.clear();
    this.spaceOrder = [];
    this.folders.clear();
    this.tabs.clear();
    this.order = [];
    for (const s of state.spaces) {
      this.spaces.set(s.id, { ...s, name: s.name || 'Space', emoji: s.emoji || '✦', agentState: null, ownership: 'user' });
      this.spaceOrder.push(s.id);
    }
    if (state.version === 2) for (const f of state.folders) if (this.spaces.has(f.spaceId)) this.folders.set(f.id, { ...f, name: f.name || 'Folder' });
    for (const t of state.tabs as Partial<PersistedTab>[]) {
      if (!t.id || !t.url) continue;
      const spaceId = t.spaceId === null ? null : (t.spaceId ?? -1);
      if (spaceId !== null && !this.spaces.has(spaceId)) continue;
      const folderId = t.folderId && this.folders.has(t.folderId) ? t.folderId : null;
      this.tabs.set(t.id, {
        id: t.id,
        spaceId,
        folderId,
        url: t.url,
        title: t.title ?? t.url,
        customTitle: t.customTitle ?? null,
        favicon: t.favicon ?? null,
        pinned: spaceId === null ? true : (t.pinned ?? false),
        loading: false,
        canGoBack: false,
        canGoForward: false,
        discarded: true,
        audible: false,
        muted: t.muted ?? false,
        lastActiveAt: t.lastActiveAt ?? 0,
        createdAt: t.createdAt ?? Date.now(),
      });
      this.order.push(t.id);
    }
    this.closed = state.version === 2 ? state.closed.slice(0, CLOSED_STACK_MAX) : [];
    this.activeTabIdBySpace = {};
    for (const id of this.spaces.keys()) {
      const wanted = state.activeTabIdBySpace[id];
      this.activeTabIdBySpace[id] = wanted && this.tabs.has(wanted) ? wanted : (this.tabsInSpace(id)[0]?.id ?? null);
    }
    this._activeSpaceId = this.spaces.has(state.activeSpaceId) ? state.activeSpaceId : (this.spaceOrder[0] ?? 0);
    this.layout = { ...DEFAULT_LAYOUT, ...state.layout };
    this.nextSpaceId = Math.max(state.nextSpaceId, ...[...this.spaces.keys()].map((k) => k + 1), 1);
    this.emit();
  }
}
