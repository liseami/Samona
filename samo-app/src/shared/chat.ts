/**
 * [INPUT]: 无运行时依赖，纯类型与常量
 * [OUTPUT]: 对外提供 AI 对话的领域模型：ChatRole/ChatMessage/ChatThread/ChatMode/ChatSnapshot、CHAT_DEFAULTS（浮窗默认几何）
 * [POS]: shared 的对话模型根；主进程 chat/ 是唯一写者，浮窗页、壳内停靠卡、launcher 三处只读同一份快照。这是 agent 与用户交互的基石契约，字段只增不改
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatMessageStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface ChatMessage {
  id: string;
  threadId: string;
  role: ChatRole;
  content: string; // Markdown 文本；流式时逐段追加
  status: ChatMessageStatus;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  title: string; // 首条用户消息的摘要，或 "New chat"
  createdAt: number;
  updatedAt: number;
}

/** 面板形态：closed 只留右下角 launcher；floating 是可拖出应用的独立子窗口；docked 是面板卡右侧的第四张卡 */
export type ChatMode = 'closed' | 'floating' | 'docked';

export interface ChatSnapshot {
  mode: ChatMode;
  activeThreadId: string;
  threads: ChatThread[]; // updatedAt 倒序
  messages: ChatMessage[]; // 仅活动线程，createdAt 正序
  generating: boolean; // 活动线程是否有流式中的回复
  unread: number; // closed 时到达的回复数
  dockWidth: number; // 停靠卡宽度
  provider: string; // 当前回答者（stub / 未来的模型或 agent）
}

export const CHAT_DEFAULTS = {
  aspect: 9 / 16, // Laper：竖版 9:16
  heightRatio: 2 / 3, // 默认高度 = 主窗口内容高的 2/3，宽度按 9:16
  viewportInset: 48, // 最大不超过主窗口 - 48
  launcherPill: { width: 130, height: 44 }, // Laper FAB 药丸
  launcherBleed: 24, // launcher 视图四周给阴影留的透明呼吸区
  launcherMargin: 24, // 药丸距窗口右下 1.5rem
  dockWidth: 380,
  dockMinWidth: 300,
  dockMaxWidth: 640,
} as const;
