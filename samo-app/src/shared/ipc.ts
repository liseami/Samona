/**
 * [INPUT]: 依赖 ./model 的 BrowserSnapshot/IdentityColor/IdentityIcon/FolderColor/Suggestion 类型
 * [OUTPUT]: 对外提供 IPC 通道名常量 CHANNELS、渲染→主进程的 Command 联合类型与 Query 联合类型（带返回映射 QueryResult）、主进程→渲染的 ShellEvent 联合类型、PaletteMode、TabTarget 落点、SamoBridge 接口
 * [POS]: shared 的进程间契约；preload 按 SamoBridge 暴露 window.samo，主进程 ipc/handlers 按 Command/Query 分发。新增能力 = 新增一个联合成员 + 一个 case，不改旧路径
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { BrowserSnapshot, FolderColor, IdentityColor, IdentityIcon, Suggestion } from './model';

export const CHANNELS = {
  invoke: 'samo:invoke', // renderer → main（命令，无返回）
  query: 'samo:query', // renderer → main（查询，有返回）
  getState: 'samo:get-state', // renderer → main（拉取一次全量快照）
  state: 'samo:state', // main → renderer（全量快照推送）
  event: 'samo:event', // main → renderer（一次性事件，如聚焦地址栏）
} as const;

/** 标签移动的落点：Identity（null = 收藏区）、是否固定、所属文件夹、同区内序号 */
export interface TabTarget {
  identityId: number | null;
  pinned: boolean;
  folderId: string | null;
  index: number;
}

// ============ 渲染层可发出的全部命令（单一入口，可判别联合） ============
export type Command =
  // ---- 标签 ----
  | { type: 'tab.create'; url?: string; identityId?: number; pinned?: boolean; folderId?: string; activate?: boolean }
  | { type: 'tab.activate'; tabId: string }
  | { type: 'tab.close'; tabId?: string }
  | { type: 'tab.closeOthers'; tabId: string }
  | { type: 'tab.closeBelow'; tabId: string }
  | { type: 'tab.closeUnpinned'; identityId?: number }
  | { type: 'tab.reopen' }
  | { type: 'tab.navigate'; input: string; tabId?: string }
  | { type: 'tab.back'; tabId?: string }
  | { type: 'tab.forward'; tabId?: string }
  | { type: 'tab.reload'; tabId?: string }
  | { type: 'tab.stop'; tabId?: string }
  | { type: 'tab.pin'; tabId: string; pinned: boolean }
  | { type: 'tab.favorite'; tabId: string; favorite: boolean }
  | { type: 'tab.move'; tabId: string; to: TabTarget }
  | { type: 'tab.rename'; tabId: string; title: string | null }
  | { type: 'tab.duplicate'; tabId: string }
  | { type: 'tab.mute'; tabId: string; muted: boolean }
  | { type: 'tab.switchMru' }
  // ---- 文件夹 ----
  | { type: 'folder.create'; identityId?: number; name?: string; tabIds?: string[] }
  | { type: 'folder.update'; folderId: string; name?: string; color?: FolderColor; collapsed?: boolean }
  | { type: 'folder.delete'; folderId: string; closeTabs?: boolean }
  // ---- Identity ----
  | { type: 'identity.create'; name: string; icon?: IdentityIcon; color?: IdentityColor; edit?: boolean } // edit: 创建后打开编辑器
  | { type: 'identity.activate'; identityId: number }
  | { type: 'identity.step'; delta: 1 | -1 }
  | { type: 'identity.update'; identityId: number; name?: string; icon?: IdentityIcon; color?: IdentityColor }
  | { type: 'identity.reorder'; identityId: number; index: number }
  | { type: 'identity.delete'; identityId: number }
  | { type: 'identity.takeControl'; identityId: number } // 用户从 agent 手中接管
  | { type: 'identity.handBack'; identityId: number } // 用户把控制权交还 agent
  // ---- 原生右键菜单（主进程弹出） ----
  | { type: 'menu.tab'; tabId: string }
  | { type: 'menu.identity'; identityId: number }
  | { type: 'menu.folder'; folderId: string }
  | { type: 'menu.tabList'; identityId: number }
  // ---- 下载 ----
  | { type: 'download.open'; id: string }
  | { type: 'download.reveal'; id: string }
  | { type: 'download.cancel'; id: string }
  | { type: 'download.clear' }
  // ---- 命令面板（叠在网页之上的 overlay 视图） ----
  | { type: 'palette.open'; mode: PaletteMode }
  | { type: 'palette.close' }
  // ---- 布局与壳 ----
  | { type: 'layout.sidebar'; width?: number; collapsed?: boolean }
  | { type: 'layout.peek'; peek: boolean }
  | { type: 'shell.openDevTools'; tabId?: string }
  | { type: 'shell.copyUrl'; tabId?: string };

// ============ 有返回值的查询 ============
export type Query = { type: 'suggest'; input: string; limit?: number; tabsOnly?: boolean };
export type QueryResult<Q extends Query> = Q extends { type: 'suggest' } ? Suggestion[] : never;

export type PaletteMode = 'newTab' | 'editUrl' | 'searchTabs';

export type ShellEvent =
  | { type: 'openPalette'; mode: PaletteMode; url: string } // 发给 overlay 页
  | { type: 'renameTab'; tabId: string }
  | { type: 'renameFolder'; folderId: string }
  | { type: 'editIdentity'; identityId: number }
  | { type: 'toast'; text: string };

// ============ preload 暴露给渲染层的桥 ============
export interface SamoBridge {
  platform: NodeJS.Platform;
  invoke(command: Command): Promise<void>;
  query<Q extends Query>(query: Q): Promise<QueryResult<Q>>;
  getState(): Promise<BrowserSnapshot>;
  onState(listener: (snapshot: BrowserSnapshot) => void): () => void;
  onEvent(listener: (event: ShellEvent) => void): () => void;
}
