/**
 * [INPUT]: 依赖 react-dom/client，./ChatPanel，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载浮窗形态的对话面板，并同步 html.dark
 * [POS]: renderer/chat 浮窗页（chat.html）的启动引导；这页跑在主窗口的子窗口里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from './ChatPanel';
import { TooltipProvider } from '../components/ui/tooltip';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={600} skipDelayDuration={300}>
      <ChatPanel variant="floating" />
    </TooltipProvider>
  </StrictMode>,
);
