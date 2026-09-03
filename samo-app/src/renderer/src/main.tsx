/**
 * [INPUT]: 依赖 react-dom/client，./App，./store/browser 的 bindBridge，./styles.css
 * [OUTPUT]: 无导出；挂载壳应用并绑定主进程桥
 * [POS]: renderer 壳页（index.html）的启动引导
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bindBridge } from './store/browser';
import './styles.css';

bindBridge();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
