/**
 * [INPUT]: 依赖 react-dom/client，./AgentLayer，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载 agent 光标层，并同步 html.dark
 * [POS]: renderer/agent 页（agent.html）的启动引导；这页跑在主进程 AgentPresence 的透明、点击穿透子窗口里，盖在网页视图上
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentLayer } from './AgentLayer';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgentLayer />
  </StrictMode>,
);
