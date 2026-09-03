/**
 * [INPUT]: 依赖 @shared/model 的 Identity/Folder/Tab/Download/Layout/BrowserSnapshot 与常量，@shared/ipc 的 TabTarget
 * [OUTPUT]: 对外提供 BrowserStore 类（内存真相 + 变更订阅）、PersistedState(v3)/AnyPersistedState/ClosedTab 类型与 v1/v2 迁移
 * [POS]: browser 模块的状态心脏，零 Electron 依赖、可单测；engine 是唯一写者，ipc/agent 只读快照。标签的全局顺序只在「同一分区」（收藏 / Identity 固定区 / 文件夹 / 散装列表）内有意义，分区之间的排布由渲染层决定
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  CLOSED_STACK_MAX,
  DEFAULT_LAYOUT,
  LEGACY_PARTITION,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  type BrowserSnapshot,
  type Download,
  type Folder,
  type Identity,
  type IdentityIcon,
  type Layout,
  type Tab,
  type AppEntry,
} from '@shared/model';
import type { TabTarget } from '@shared/ipc';

// ============ 落盘形态：只保留可恢复的语义字段 ============
export interface PersistedTab {
  id: string;
  identityId: number | null;
  partition: string;
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
  identityId: number | null;
  partition: string;
  pinned: boolean;
  folderId: string | null;
  closedAt: number;
}
export interface PersistedState {
  version: 3;
  identities: Identity[]; // 数组顺序即侧栏顺序
  folders: Folder[];
  tabs: PersistedTab[];
  closed: ClosedTab[];
  activeIdentityId: number;
  activeTabIdByIdentity: Record<number, string | null>;
  layout: Layout;
  nextIdentityId: number;
}

/** v1/v2 落盘形态（Space 时代）：只描述迁移会读到的字段 */
interface LegacyState {
  version: 1 | 2;
  spaces: { id: number; name?: string; emoji?: string; color?: Identity['color']; createdAt?: number }[];
  folders?: { id: string; spaceId: number; name?: string; color: Folder['color']; collapsed: boolean; createdAt: number }[];
  tabs: (Partial<PersistedTab> & { spaceId?: number | null })[];
  closed?: (Partial<ClosedTab> & { spaceId?: number | null })[];
  activeSpaceId: number;
  activeTabIdBySpace: Record<number, string | null>;
  layout: Layout;
  nextSpaceId: number;
}
export type AnyPersistedState = PersistedState | LegacyState;

const EMOJI_TO_ICON: Record<string, IdentityIcon> = { '🏠': 'home', '💼': 'briefcase', '🤖': 'bot', '🧪': 'flask', '🎨': 'camera', '📚': 'graduation', '🛒': 'shopping', '🎵': 'music', '🚀': 'rocket', '☕': 'coffee', '🌱': 'leaf', '🔒': 'lock' };

type Listener = (snapshot: BrowserSnapshot) => void;

/** 部分补丁只保留显式给出的键：调用方常传 { name: undefined }，不能把已有字段抹掉 */
function compact<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export class BrowserStore {
  private identities = new Map<number, Identity>();
  private identityOrder: number[] = [];
  private folders = new Map<string, Folder>();
  private tabs = new Map<string, Tab>();
  private order: string[] = []; // 全局顺序，按分区过滤即得分区内顺序
  private downloads = new Map<string, Download>();
  private closed: ClosedTab[] = [];
  private _activeSpaceId = 0;
  private activeTabIdByIdentity: Record<number, string | null> = {};
  private layout: Layout = { ...DEFAULT_LAYOUT };
  private apps: AppEntry[] = [];
  private activeAppId: string | null = null;
  private sidebarPeek = false;
  private dark = false;
  private focused = true;
  private fullscreen = false;
  private nextIdentityId = 1;
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
      identities: this.allIdentities(),
      folders: [...this.folders.values()],
      tabs: this.order.map((id) => this.tabs.get(id)!).filter(Boolean),
      downloads: [...this.downloads.values()].sort((a, b) => b.startedAt - a.startedAt),
      activeIdentityId: this._activeSpaceId,
      activeTabIdByIdentity: { ...this.activeTabIdByIdentity },
      layout: { ...this.layout },
      apps: this.apps,
      activeAppId: this.activeAppId,
      sidebarPeek: this.sidebarPeek,
      closedCount: this.closed.length,
      dark: this.dark,
      windowFocused: this.focused,
      fullscreen: this.fullscreen,
    };
  }

  // ---------- 查询 ----------
  get activeIdentityId(): number {
    return this._activeSpaceId;
  }
  getIdentity(id: number): Identity | undefined {
    return this.identities.get(id);
  }
  allIdentities(): Identity[] {
    return this.identityOrder.map((id) => this.identities.get(id)!).filter(Boolean);
  }
  getFolder(id: string): Folder | undefined {
    return this.folders.get(id);
  }
  foldersInIdentity(identityId: number): Folder[] {
    return [...this.folders.values()].filter((f) => f.identityId === identityId);
  }
  getTab(id: string): Tab | undefined {
    return this.tabs.get(id);
  }
  /** 某 Identity 的全部标签（固定 + 文件夹内 + 散装）；identityId 为 null 即收藏 */
  tabsInIdentity(identityId: number | null): Tab[] {
    return this.order.map((id) => this.tabs.get(id)!).filter((t) => t && t.identityId === identityId);
  }
  favorites(): Tab[] {
    return this.tabsInIdentity(null);
  }
  tabsInFolder(folderId: string): Tab[] {
    return this.order.map((id) => this.tabs.get(id)!).filter((t) => t && t.folderId === folderId);
  }
  /** 同一分区的兄弟：收藏 / Identity 固定区 / 某文件夹 / 散装列表 */
  sectionTabs(target: Pick<TabTarget, 'identityId' | 'pinned' | 'folderId'>): Tab[] {
    return this.order
      .map((id) => this.tabs.get(id)!)
      .filter((t) => t && t.identityId === target.identityId && (target.identityId === null || (t.pinned === target.pinned && t.folderId === target.folderId)));
  }
  get activeIdentity(): Identity {
    return this.identities.get(this._activeSpaceId)!;
  }
  activeTabId(identityId = this._activeSpaceId): string | null {
    return this.activeTabIdByIdentity[identityId] ?? null;
  }
  activeTab(identityId = this._activeSpaceId): Tab | undefined {
    const id = this.activeTabId(identityId);
    return id ? this.tabs.get(id) : undefined;
  }
  /** 某 Identity 可见的标签按最近使用排序（含收藏） */
  mruTabs(identityId = this._activeSpaceId): Tab[] {
    return [...this.tabsInIdentity(identityId), ...this.favorites()].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }
  getLayout(): Layout {
    return { ...this.layout };
  }
  isPeeking(): boolean {
    return this.sidebarPeek;
  }

  // ---------- Identity ----------
  createIdentity(input: Omit<Identity, 'id' | 'createdAt' | 'agentState'> & { agentState?: string | null }): Identity {
    const identity: Identity = { ...input, agentState: input.agentState ?? null, id: this.nextIdentityId++, createdAt: Date.now() };
    this.identities.set(identity.id, identity);
    this.identityOrder.push(identity.id);
    this.activeTabIdByIdentity[identity.id] = null;
    if (!this.identities.has(this._activeSpaceId)) this._activeSpaceId = identity.id;
    this.emit();
    return identity;
  }

  updateIdentity(id: number, patch: Partial<Omit<Identity, 'id' | 'createdAt'>>): Identity | undefined {
    const identity = this.identities.get(id);
    if (!identity) return undefined;
    Object.assign(identity, compact(patch));
    this.emit();
    return identity;
  }

  reorderIdentity(id: number, index: number): void {
    if (!this.identities.has(id)) return;
    this.identityOrder = this.identityOrder.filter((x) => x !== id);
    this.identityOrder.splice(Math.max(0, Math.min(index, this.identityOrder.length)), 0, id);
    this.emit();
  }

  /** 删除 Identity 记录本身；其标签与文件夹应先由 engine 清理 */
  deleteIdentity(id: number): void {
    if (!this.identities.delete(id)) return;
    this.identityOrder = this.identityOrder.filter((x) => x !== id);
    delete this.activeTabIdByIdentity[id];
    for (const f of this.foldersInIdentity(id)) this.folders.delete(f.id);
    if (this._activeSpaceId === id) this._activeSpaceId = this.identityOrder[0] ?? 0;
    this.emit();
  }

  setActiveIdentity(id: number): void {
    if (!this.identities.has(id) || this._activeSpaceId === id) return;
    this._activeSpaceId = id;
    this.emit();
  }

  // ---------- Folder ----------
  createFolder(identityId: number, name: string, color: Folder['color'] = 'grey'): Folder {
    const folder: Folder = { id: crypto.randomUUID(), identityId, name, color, collapsed: false, createdAt: Date.now() };
    this.folders.set(folder.id, folder);
    this.emit();
    return folder;
  }

  updateFolder(id: string, patch: Partial<Omit<Folder, 'id' | 'identityId' | 'createdAt'>>): void {
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
    if (index !== undefined) this.placeTab(tab.id, { identityId: tab.identityId, pinned: tab.pinned, folderId: tab.folderId, index });
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
    for (const [identityId, active] of Object.entries(this.activeTabIdByIdentity)) if (active === id) this.activeTabIdByIdentity[Number(identityId)] = null;
    this.emit();
    return tab;
  }

  /** 统一的移动：改分区（Identity/收藏/固定/文件夹）并落在分区内 index 位 */
  placeTab(id: string, target: TabTarget): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (target.identityId !== null && !this.identities.has(target.identityId)) return;
    if (target.folderId && this.folders.get(target.folderId)?.identityId !== target.identityId) return;
    const leavingSpace = tab.identityId !== null && tab.identityId !== target.identityId;
    if (leavingSpace && this.activeTabIdByIdentity[tab.identityId!] === id) this.activeTabIdByIdentity[tab.identityId!] = null;

    this.order = this.order.filter((x) => x !== id);
    tab.identityId = target.identityId;
    tab.pinned = target.identityId === null ? true : target.pinned;
    tab.folderId = target.identityId === null ? null : target.folderId;
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

  setActiveTab(identityId: number, tabId: string | null): void {
    if (this.activeTabIdByIdentity[identityId] === tabId) return;
    this.activeTabIdByIdentity[identityId] = tabId;
    if (tabId) {
      const tab = this.tabs.get(tabId);
      if (tab) tab.lastActiveAt = Date.now();
    }
    this.emit();
  }

  /** 关闭某标签后应聚焦的邻居：先同分区右/左邻，再 Identity 内其他标签 */
  neighborOf(tabId: string, viewSpaceId = this._activeSpaceId): Tab | undefined {
    const tab = this.tabs.get(tabId);
    if (!tab) return undefined;
    const section = this.sectionTabs(tab);
    const i = section.findIndex((t) => t.id === tabId);
    const sibling = section[i + 1] ?? section[i - 1];
    if (sibling) return sibling;
    return this.tabsInIdentity(viewSpaceId).find((t) => t.id !== tabId) ?? this.favorites().find((t) => t.id !== tabId);
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
    if (patch.module !== undefined) this.layout.module = patch.module;
    if (patch.sidebarWidth !== undefined) {
      this.layout.sidebarWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(patch.sidebarWidth)));
    }
    if (patch.sidebarCollapsed !== undefined) {
      this.layout.sidebarCollapsed = patch.sidebarCollapsed;
      this.sidebarPeek = false;
    }
    if (patch.overview !== undefined) this.layout.overview = patch.overview;
    this.emit();
  }
  // ---------- 应用维度 ----------
  get appList(): AppEntry[] {
    return this.apps;
  }
  get currentAppId(): string | null {
    return this.activeAppId;
  }
  setApps(apps: AppEntry[]): void {
    if (JSON.stringify(apps) === JSON.stringify(this.apps)) return;
    this.apps = apps;
    if (this.activeAppId && !apps.some((a) => a.id === this.activeAppId)) this.activeAppId = null;
    this.emit();
  }
  setActiveApp(id: string | null): void {
    if (this.activeAppId === id) return;
    this.activeAppId = id;
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
  setFocused(focused: boolean): void {
    if (this.focused === focused) return;
    this.focused = focused;
    this.emit();
  }
  setFullscreen(fullscreen: boolean): void {
    if (this.fullscreen === fullscreen) return;
    this.fullscreen = fullscreen;
    this.emit();
  }

  // ---------- 持久化 ----------
  toPersisted(): PersistedState {
    return {
      version: 3,
      identities: this.allIdentities(),
      folders: [...this.folders.values()],
      tabs: this.order
        .map((id) => this.tabs.get(id)!)
        .filter(Boolean)
        .map(({ id, identityId, partition, folderId, url, title, customTitle, favicon, pinned, muted, lastActiveAt, createdAt }) => ({
          id,
          identityId,
          partition,
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
      activeIdentityId: this._activeSpaceId,
      activeTabIdByIdentity: { ...this.activeTabIdByIdentity },
      layout: { ...this.layout },
      nextIdentityId: this.nextIdentityId,
    };
  }

  /** 从落盘状态重建；所有标签以 discarded（冷）态进入，由 engine 决定何时真正加载。v1/v2（Space 时代）先归一化：emoji → 图标键，分区一律 LEGACY_PARTITION 以保留登录态 */
  hydrate(raw: AnyPersistedState): void {
    const state = raw.version === 3 ? raw : migrateLegacy(raw);
    this.identities.clear();
    this.identityOrder = [];
    this.folders.clear();
    this.tabs.clear();
    this.order = [];
    for (const s of state.identities) {
      this.identities.set(s.id, { ...s, name: s.name || 'Identity', icon: s.icon || 'user', partition: s.partition || LEGACY_PARTITION, agentState: null, ownership: 'user' });
      this.identityOrder.push(s.id);
    }
    for (const f of state.folders) if (this.identities.has(f.identityId)) this.folders.set(f.id, { ...f, name: f.name || 'Folder' });
    for (const t of state.tabs) {
      if (!t.id || !t.url) continue;
      const identityId = t.identityId === null ? null : (t.identityId ?? -1);
      if (identityId !== null && !this.identities.has(identityId)) continue;
      const folderId = t.folderId && this.folders.has(t.folderId) ? t.folderId : null;
      this.tabs.set(t.id, {
        id: t.id,
        identityId,
        partition: t.partition || (identityId !== null ? this.identities.get(identityId)!.partition : LEGACY_PARTITION),
        folderId,
        url: t.url,
        title: t.title ?? t.url,
        customTitle: t.customTitle ?? null,
        favicon: t.favicon ?? null,
        pinned: identityId === null ? true : (t.pinned ?? false),
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
    this.closed = state.closed.slice(0, CLOSED_STACK_MAX);
    this.activeTabIdByIdentity = {};
    for (const id of this.identities.keys()) {
      const wanted = state.activeTabIdByIdentity[id];
      this.activeTabIdByIdentity[id] = wanted && this.tabs.has(wanted) ? wanted : (this.tabsInIdentity(id)[0]?.id ?? null);
    }
    this._activeSpaceId = this.identities.has(state.activeIdentityId) ? state.activeIdentityId : (this.identityOrder[0] ?? 0);
    this.layout = { ...DEFAULT_LAYOUT, ...state.layout, overview: false }; // 标签矩阵是瞬时态，不跨启动
    this.nextIdentityId = Math.max(state.nextIdentityId, ...[...this.identities.keys()].map((k) => k + 1), 1);
    this.emit();
  }
}

/** Space 时代 → 身份：字段改名、emoji 映射为图标键、分区回落到 LEGACY_PARTITION */
function migrateLegacy(old: LegacyState): PersistedState {
  return {
    version: 3,
    identities: old.spaces.map((sp) => ({
      id: sp.id,
      name: sp.name || 'Identity',
      icon: (sp.emoji && EMOJI_TO_ICON[sp.emoji]) || 'user',
      color: sp.color ?? 'blue',
      partition: LEGACY_PARTITION,
      ownership: 'user' as const,
      agentState: null,
      createdAt: sp.createdAt ?? Date.now(),
    })),
    folders: (old.folders ?? []).map((f) => ({ id: f.id, identityId: f.spaceId, name: f.name || 'Folder', color: f.color, collapsed: f.collapsed, createdAt: f.createdAt })),
    tabs: old.tabs.map((t) => ({ ...t, identityId: t.spaceId === undefined ? (t.identityId ?? null) : t.spaceId, partition: LEGACY_PARTITION }) as PersistedTab),
    closed: (old.closed ?? []).map((c) => ({ ...c, identityId: c.spaceId === undefined ? (c.identityId ?? null) : c.spaceId, partition: LEGACY_PARTITION }) as ClosedTab),
    activeIdentityId: old.activeSpaceId,
    activeTabIdByIdentity: old.activeTabIdBySpace ?? {},
    layout: old.layout,
    nextIdentityId: old.nextSpaceId,
  };
}
