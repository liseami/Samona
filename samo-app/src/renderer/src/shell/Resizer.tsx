/**
 * [INPUT]: 依赖 react 的 useRef，../../store/browser 的 send/useBrowser，@shared/model 的 SIDEBAR_MIN/MAX
 * [OUTPUT]: 对外提供 Resizer 组件：侧栏卡与面板卡之间 8px 空档上的拖拽热区，rAF 节流地把宽度写回主进程（主进程随之重排 WebContentsView）
 * [POS]: renderer/components/sidebar 的几何控制点；宽度真相在主进程 store.layout
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useRef } from 'react';
import { SIDEBAR_MAX, SIDEBAR_MIN } from '@shared/model';
import { send, useBrowser } from '../store/browser';

export function Resizer() {
  const width = useBrowser((s) => s.snapshot?.layout.sidebarWidth ?? 264);
  const raf = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + ev.clientX - startX));
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => send({ type: 'layout.sidebar', width: next }));
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  return <div onPointerDown={onPointerDown} className="no-drag absolute top-0 -right-2 z-10 h-full w-2 cursor-col-resize" />;
}
