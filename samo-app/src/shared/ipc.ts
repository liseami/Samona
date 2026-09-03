/**
 * [INPUT]: 依赖 ./model 的 BrowserSnapshot/IdentityColor/IdentityIcon/ModuleId/FolderColor/Suggestion 类型，./chat 的 ChatMode/ChatSnapshot
 * [OUTPUT]: 对外提供 IPC 通道名常量 CHANNELS（含对话专用通道）、渲染→主进程的 Command 联合类型与 Query 联合类型（suggest / thumbnails，带返回映射 QueryResult）与 Thumbnail、主进程→渲染的 ShellEvent 联合类型、PaletteMode、TabTarget 落点、SamoBridge 接口
 * [POS]: shared 的进程间契约；preload 按 SamoBridge 暴露 window.samo，主进程 ipc/handlers 按 Command/Query 分发。新增能力 = 新增一个联合成员 + 一个 case，不改旧路径
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { BrowserSnapshot, FolderColor, IdentityColor, IdentityIcon, ModuleId, Suggestion } from './model';
import type { ChatMode, ChatSnapshot } from './chat';

export const CHANNELS = {
  invoke: 'samo:invoke', // renderer → main（命令，无返回）
  query: 'samo:query', // renderer → main（查询，有返回）
  getState: 'samo:get-state', // renderer → main（拉取一次全量快照）
  state: 'samo:state', // main → renderer（全量快照推送）
  event: 'samo:event', // main → renderer（一次性事件，如聚焦地址栏）
  getChat: 'samo:get-chat', // renderer → main（拉取一次对话快照）
  chat: 'samo:chat', // main → renderer（对话快照推送，独立于浏览器快照以免消息体拖慢标签更新）
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
  // ---- AI 对话（launcher / 浮窗 / 停靠卡三处共用） ----
  | { type: 'chat.setMode'; mode: ChatMode }
  | { type: 'chat.send'; text: string }
  | { type: 'chat.stop' }
  | { type: 'chat.newThread' }
  | { type: 'chat.switchThread'; threadId: string }
  | { type: 'chat.deleteThread'; threadId: string }
  | { type: 'chat.setDockWidth'; width: number }
  | { type: 'chat.setApiKey'; key: string } // 保存 Anthropic 密钥（主进程落盘 0600），空串即清除
  // ---- 壳：模块与窗口（自绘红绿灯） ----
  | { type: 'module.activate'; module: ModuleId }
  | { type: 'window.close' }
  | { type: 'window.minimize' }
  | { type: 'window.zoom'; fullscreen?: boolean } // 绿灯：默认全屏；⌥点击 = 最大化/还原
  // ---- 布局与壳 ----
  | { type: 'layout.sidebar'; width?: number; collapsed?: boolean }
  | { type: 'layout.peek'; peek: boolean }
  | { type: 'layout.overview'; open: boolean } // Safari 式标签矩阵
  | { type: 'shell.openDevTools'; tabId?: string }
  | { type: 'shell.copyUrl'; tabId?: string };

// ============ 有返回值的查询 ============
export type Query = { type: 'suggest'; input: string; limit?: number; tabsOnly?: boolean } | { type: 'thumbnails'; identityId: number };
export interface Thumbnail {
  tabId: string;
  dataUrl: string; // JPEG data URL，480 宽
}
export type QueryResult<Q extends Query> = Q extends { type: 'suggest' } ? Suggestion[] : Q extends { type: 'thumbnails' } ? Thumbnail[] : never;

export type PaletteMode = 'newTab' | 'editUrl' | 'searchTabs';

export type ShellEvent =
  | { type: 'openPalette'; mode: PaletteMode; url: string } // 发给 overlay 页
  | { type: 'renameTab'; tabId: string }
  | { type: 'renameFolder'; folderId: string }
  | { type: 'editIdentity'; identityId: number }
  | { type: 'chatPhase'; phase: 'launcherIn' | 'launcherOut' | 'panelIn' | 'panelOut' } // AI 对话编舞：发给 launcher 页与浮窗页
  | { type: 'toast'; text: string };

// ============ preload 暴露给渲染层的桥 ============
export interface SamoBridge {
  platform: NodeJS.Platform;
  invoke(command: Command): Promise<void>;
  query<Q extends Query>(query: Q): Promise<QueryResult<Q>>;
  getState(): Promise<BrowserSnapshot>;
  onState(listener: (snapshot: BrowserSnapshot) => void): () => void;
  onEvent(listener: (event: ShellEvent) => void): () => void;
  getChat(): Promise<ChatSnapshot>;
  onChat(listener: (snapshot: ChatSnapshot) => void): () => void;
}
