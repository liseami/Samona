/**
 * [INPUT]: 依赖 react-dom/client，./ChatShell，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载浮层根（药丸 + 面板同宿），并同步 html.dark
 * [POS]: renderer/chat 页（chat.html）的启动引导；这页跑在主进程 ChatWindow 的透明子窗口里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatShell } from './ChatShell';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatShell />
  </StrictMode>,
);
