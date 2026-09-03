/**
 * [INPUT]: 依赖 react 的 useRef，@shared/chat 的 CHAT_DEFAULTS，../chat/store 的 chatSend
 * [OUTPUT]: 对外提供 DockResizer 组件：停靠对话卡左缘 8px 空档上的拖拽热区，rAF 节流写回 chat.setDockWidth（向左拖变宽）
 * [POS]: shell 的几何控制点之一，与侧栏 Resizer 同构；宽度真相在主进程 ChatStore
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useRef } from 'react';
import { CHAT_DEFAULTS } from '@shared/chat';
import { chatSend } from '../chat/store';

export function DockResizer({ width }: { width: number }) {
  const raf = useRef(0);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const next = Math.min(CHAT_DEFAULTS.dockMaxWidth, Math.max(CHAT_DEFAULTS.dockMinWidth, startW - (ev.clientX - startX)));
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => chatSend({ type: 'chat.setDockWidth', width: next }));
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };
  return <div onPointerDown={onPointerDown} className="no-drag absolute top-0 -left-2 z-1 h-full w-2 cursor-col-resize" />;
}
