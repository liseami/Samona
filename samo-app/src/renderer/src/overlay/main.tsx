/**
 * [INPUT]: 依赖 react-dom/client，../modules/browser/palette/Palette，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载命令面板 overlay 页，并同步 html.dark
 * [POS]: renderer/overlay 的启动引导；这页透明地叠在网页之上，只在主进程 openPalette 时可见
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Palette } from '../modules/browser/palette/Palette';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Palette />
  </StrictMode>,
);
