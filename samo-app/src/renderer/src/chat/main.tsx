/**
 * [INPUT]: 依赖 react-dom/client，./ChatPanel，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载浮窗页（ChatPanel variant=floating），同步 html.dark
 * [POS]: renderer/chat 页（chat.html）的启动引导；这页跑在主进程 ChatWindow 的不透明子窗口里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from './ChatPanel';
import { bindChat } from './store';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));

function FloatingChat() {
  useEffect(() => bindChat(), []);
  return <ChatPanel variant="floating" />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FloatingChat />
  </StrictMode>,
);
