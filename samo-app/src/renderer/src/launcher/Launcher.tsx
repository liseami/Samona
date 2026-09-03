/**
 * [INPUT]: 依赖 react，@shared/chat 的 CHAT_DEFAULTS，../chat/store 的 useChat/bindChat/chatSend，../chat/Fab
 * [OUTPUT]: 对外提供 Launcher 组件：药丸子窗口的根——Fab 居于 12px 呼吸区之内；点击打开浮窗
 * [POS]: renderer/launcher 的唯一界面；只在 closed 形态可见
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { CHAT_DEFAULTS } from '@shared/chat';
import { Fab } from '../chat/Fab';
import { bindChat, chatSend, useChat } from '../chat/store';

export function Launcher() {
  useEffect(() => bindChat(), []);
  const snap = useChat((s) => s.snapshot);
  return (
    <div className="flex h-full w-full items-end justify-end bg-transparent" style={{ padding: CHAT_DEFAULTS.launcherBleed }}>
      <Fab active busy={!!snap?.generating} unread={snap?.unread ?? 0} onClick={() => chatSend({ type: 'chat.setMode', mode: 'floating' })} />
    </div>
  );
}
