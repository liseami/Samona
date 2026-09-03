/**
 * [INPUT]: 无运行时依赖，纯类型与常量
 * [OUTPUT]: 对外提供 Space/Folder/Tab/Download/Layout/BrowserSnapshot 数据模型、Ownership/SpaceColor/FolderColor 枚举、SPACE_COLOR_HEX 调色板、NEW_TAB_URL、DEFAULT_LAYOUT 与侧栏宽度边界、Suggestion 类型
 * [POS]: shared 的领域模型根，主进程是唯一写者，渲染进程与 agent 网关只读；三方共享同一份真相定义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============ 归属：与 ego-browser 的 task space 语义逐字对齐 ============
// user                  — 用户自己的 Space（默认）
// agent                 — 某个 AI agent 正在驱动
// agentDelegatedToUser  — agent 把控制权暂交给用户（等待"继续"）
export type Ownership = 'user' | 'agent' | 'agentDelegatedToUser';

// ============ 调色板：沿用 phi 的六色 + agent 专属靛蓝 ============
export const SPACE_COLORS = ['blue', 'red', 'green', 'orange', 'purple', 'cyan', 'indigo'] as const;
export type SpaceColor = (typeof SPACE_COLORS)[number];
export const SPACE_COLOR_HEX: Record<SpaceColor, string> = {
  blue: '#3A6FF8',
  red: '#E5484D',
  green: '#46A758',
  orange: '#F76B15',
  purple: '#8E4EC6',
  cyan: '#0091FF',
  indigo: '#5856D6',
};
export const AGENT_SPACE_COLOR: SpaceColor = 'indigo';
export const NEW_TAB_URL = 'samo://newtab'; // 对外公开的新标签页地址；真实加载地址由主进程映射

/** 文件夹（phi 的 tab group / Arc 的 folder）颜色：grey 表示无色 */
export type FolderColor = 'grey' | SpaceColor;

// ============ Space：Arc 式工作区，同时也是 agent 的 task space ============
export interface Space {
  id: number; // 数字 id：ego-browser 要求 task space id 为 number
  name: string;
  emoji: string;
  color: SpaceColor;
  ownership: Ownership;
  taskId?: string; // agent 命名的任务名；用户 Space 为空
  agentState: string | null; // agent 汇报的当前动作标签（如 "click @21"）
  createdAt: number;
}

// ============ Folder：Space 内的标签分组，可折叠、可着色 ============
export interface Folder {
  id: string;
  spaceId: number;
  name: string;
  color: FolderColor;
  collapsed: boolean;
  createdAt: number;
}

// ============ Tab：一个 WebContentsView 的语义投影 ============
export interface Tab {
  id: string; // 同时作为 CDP targetId
  spaceId: number | null; // null = 收藏（Arc 的 Favorites）：跨所有 Space 常驻侧栏顶部
  folderId: string | null;
  url: string;
  title: string;
  customTitle: string | null; // 用户重命名；显示时优先
  favicon: string | null;
  pinned: boolean; // Space 内固定（用户的「App」位）
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  discarded: boolean; // 已持久化但尚未创建 WebContents（冷标签）
  audible: boolean;
  muted: boolean;
  lastActiveAt: number; // MRU 切换依据
  createdAt: number;
}

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted';
export interface Download {
  id: string;
  filename: string;
  url: string;
  path: string;
  state: DownloadState;
  received: number;
  total: number;
  startedAt: number;
}

export interface Layout {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
}

export const DEFAULT_LAYOUT: Layout = { sidebarWidth: 264, sidebarCollapsed: false };
export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 420;
export const CLOSED_STACK_MAX = 25;

// ============ 快照：主进程推给渲染层的完整真相 ============
export interface BrowserSnapshot {
  spaces: Space[]; // 数组顺序即侧栏顺序
  folders: Folder[];
  tabs: Tab[]; // 数组顺序即侧栏顺序（按 spaceId 过滤后仍有序）
  downloads: Download[];
  activeSpaceId: number;
  activeTabIdBySpace: Record<number, string | null>;
  layout: Layout;
  sidebarPeek: boolean; // 折叠态下鼠标贴边临时展开
  closedCount: number; // 可重开的已关闭标签数
  dark: boolean; // 跟随系统外观
}

// ============ 地址栏建议（主进程按需查询返回） ============
export type Suggestion =
  | { kind: 'tab'; tabId: string; title: string; url: string }
  | { kind: 'history'; title: string; url: string }
  | { kind: 'url'; url: string }
  | { kind: 'search'; query: string; url: string };

/** 标签的展示标题：用户重命名 > 页面标题 > 地址 */
export function tabTitle(tab: Pick<Tab, 'customTitle' | 'title' | 'url'>): string {
  return tab.customTitle || tab.title || tab.url;
}
