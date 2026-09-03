/**
 * [INPUT]: 依赖 react-dom/client，../modules/browser/palette/Palette，../shell/UserMenuOverlay，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载 overlay 页（命令面板 + 用户菜单，各自只响应自己的打开事件），并同步 html.dark
 * [POS]: renderer/overlay 的启动引导；这页透明地叠在网页之上，只在主进程 openPalette / openUserMenu 时可见——壳里任何要压在网页之上还能交互的弹层都住这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Palette } from '../modules/browser/palette/Palette';
import { UserMenuOverlay } from '../shell/UserMenuOverlay';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Palette />
    <UserMenuOverlay />
  </StrictMode>,
);
