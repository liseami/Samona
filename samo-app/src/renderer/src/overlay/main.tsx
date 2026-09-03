/**
 * [INPUT]: 依赖 react-dom/client，../modules/browser/palette/Palette，./HeaderLayer，../components/ui/tooltip 的 TooltipProvider，../store/browser 的 bindBridge，../styles.css，window.samo 桥
 * [OUTPUT]: 无导出；挂载 overlay 页：常驻的面板头部层 + 按需的命令面板，并同步 html.dark
 * [POS]: renderer/overlay 的启动引导；这页透明地叠在网页之上——平时主进程只给它头部条那么大的矩形，⌘T 时铺满全窗
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Palette } from '../modules/browser/palette/Palette';
import { HeaderLayer } from './HeaderLayer';
import { TooltipProvider } from '../components/ui/tooltip';
import { bindBridge } from '../store/browser';
import '../styles.css';

const syncDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark);
void window.samo.getState().then((s) => syncDark(s.dark));
window.samo.onState((s) => syncDark(s.dark));
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';
bindBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={600} skipDelayDuration={300}>
      <HeaderLayer />
      <Palette />
    </TooltipProvider>
  </StrictMode>,
);
