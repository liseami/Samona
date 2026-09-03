/**
 * [INPUT]: 依赖 react-dom/client，./NewTab，../styles.css
 * [OUTPUT]: 无导出；挂载新标签页（无 preload，纯网页）
 * [POS]: renderer 新标签页（newtab.html）的启动引导
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NewTab } from './NewTab';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NewTab />
  </StrictMode>,
);
