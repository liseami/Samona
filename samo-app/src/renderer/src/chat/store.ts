/**
 * [INPUT]: 依赖 zustand 的 create，@shared/chat 的 ChatSnapshot，@shared/ipc 的 Command，window.samo 桥
 * [OUTPUT]: 对外提供 useChat store（对话快照镜像）、bindChat() 订阅主进程、chatSend() 命令出口
 * [POS]: renderer/chat 的状态镜像；launcher 页、浮窗页、壳内停靠卡三处共用，真相永远在主进程
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from 'zustand';
import type { ChatSnapshot } from '@shared/chat';
import type { Command } from '@shared/ipc';

interface ChatState {
  snapshot: ChatSnapshot | null;
  setSnapshot(snapshot: ChatSnapshot): void;
}

export const useChat = create<ChatState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
}));

export function chatSend(command: Command): void {
  void window.samo.invoke(command);
}

let bound = false;
export function bindChat(): void {
  if (bound) return;
  bound = true;
  const { setSnapshot } = useChat.getState();
  void window.samo.getChat().then(setSnapshot);
  window.samo.onChat(setSnapshot);
}
