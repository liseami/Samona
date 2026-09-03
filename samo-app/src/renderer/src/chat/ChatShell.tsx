/**
 * [INPUT]: 依赖 react，@shared/chat 的 CHAT_DEFAULTS，@shared/motion 的 DUR/EASE_CSS，./store 的 useChat/bindChat/chatSend，./ChatPanel，./Fab，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 ChatShell 组件：Laper AIFloatingPanelShell 的窗口版——外壳恒以浮窗尺寸渲染，收起走 scaleX/scaleY 到药丸尺寸（transform-origin 右下），药丸反缩放保形，内容与外壳底纹淡切；展开态四边八角的缩放热区（透明窗口没有原生缩放）；收起态药丸悬停告诉主进程接收鼠标
 * [POS]: renderer/chat 页（chat.html）的根：跑在主进程 ChatWindow 透明子窗口里，药丸与面板是同一棵树，形态只是 snapshot.mode 的投影；停靠卡不经过它（壳直接渲染 ChatPanel）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CHAT_DEFAULTS } from '@shared/chat';
import { DUR, EASE_CSS } from '@shared/motion';
import { cn } from '../lib/utils';
import { ChatPanel } from './ChatPanel';
import { Fab } from './Fab';
import { bindChat, chatSend, useChat } from './store';

const PILL = CHAT_DEFAULTS.launcherPill;
// 开合是确定性补间（Laper：禁 spring 禁回弹）：开 gentle/drawer 慢显，关 quick/standard 快收
const OPEN = `${DUR.gentle}ms ${EASE_CSS.drawer}`;
const CLOSE = `${DUR.quick}ms ${EASE_CSS.standard}`;

export function ChatShell() {
  useEffect(() => bindChat(), []);
  const snap = useChat((s) => s.snapshot);
  const mode = snap?.mode ?? 'closed';
  const expanded = mode === 'floating';
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // 从停靠卡回到浮层：直接以展开态出现，不播开合
  const prev = useRef(mode);
  const instant = prev.current === 'docked';
  useEffect(() => {
    prev.current = mode;
  }, [mode]);

  const sx = PILL.width / Math.max(size.w, 1);
  const sy = PILL.height / Math.max(size.h, 1);
  const transition = instant ? 'none' : expanded ? OPEN : CLOSE;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-transparent text-foreground">
      {/* 外壳：恒以浮窗尺寸渲染，收起 = 非均匀 scale 到药丸矩形（锚点右下） */}
      <div
        className="absolute inset-0 origin-bottom-right"
        style={{ transform: expanded ? 'none' : `scale(${sx}, ${sy})`, transition: `transform ${transition}` }}
      >
        {/* 面板底纹 + 阴影：收起时淡出，免得非均匀缩放的圆角与阴影从药丸四角露出来 */}
        <div
          className="absolute inset-0 rounded-3xl border border-border bg-card"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)', opacity: expanded ? 1 : 0, transition: `opacity ${transition}` }}
        />
        {/* 展开内容 */}
        <div className={cn('absolute inset-0 overflow-hidden rounded-3xl', !expanded && 'pointer-events-none')} style={{ opacity: expanded ? 1 : 0, transition: `opacity ${transition}` }}>
          <ChatPanel variant="floating" />
        </div>
        {/* 药丸：钉在右下，反缩放抵消外壳变形以保形（Laper counterScale） */}
        <div
          className={cn('absolute right-0 bottom-0 origin-bottom-right', expanded && 'pointer-events-none')}
          style={{ width: PILL.width, height: PILL.height, transform: expanded ? 'none' : `scale(${1 / sx}, ${1 / sy})`, opacity: expanded ? 0 : 1, transition: `transform ${transition}, opacity ${transition}` }}
        >
          <Fab
            active={!expanded}
            busy={!!snap?.generating}
            unread={snap?.unread ?? 0}
            onEnter={() => chatSend({ type: 'chat.hover', over: true })}
            onLeave={() => chatSend({ type: 'chat.hover', over: false })}
            onClick={() => chatSend({ type: 'chat.setMode', mode: 'floating' })}
          />
        </div>
      </div>
      {expanded && <ResizeGrips />}
    </div>
  );
}

// ---- 缩放热区：透明窗口没有原生缩放，四边八角各 8px，拖拽换算成屏幕坐标交给主进程 setBounds ----
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const EDGES: { edge: Edge; className: string; cursor: string }[] = [
  { edge: 'n', className: 'top-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { edge: 's', className: 'bottom-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { edge: 'e', className: 'top-2 bottom-2 right-0 w-2', cursor: 'ew-resize' },
  { edge: 'w', className: 'top-2 bottom-2 left-0 w-2', cursor: 'ew-resize' },
  { edge: 'ne', className: 'top-0 right-0 h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'sw', className: 'bottom-0 left-0 h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'nw', className: 'top-0 left-0 h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'se', className: 'bottom-0 right-0 h-3 w-3', cursor: 'nwse-resize' },
];

function ResizeGrips() {
  const drag = useRef<{ edge: Edge; sx: number; sy: number; x: number; y: number; w: number; h: number; raf: number } | null>(null);
  const onDown = (edge: Edge) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { edge, sx: e.screenX, sy: e.screenY, x: window.screenX, y: window.screenY, w: window.outerWidth, h: window.outerHeight, raf: 0 };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.screenX - d.sx;
    const dy = e.screenY - d.sy;
    let { x, y, w, h } = d;
    if (d.edge.includes('e')) w = Math.max(CHAT_DEFAULTS.minWidth, d.w + dx);
    if (d.edge.includes('s')) h = Math.max(CHAT_DEFAULTS.minHeight, d.h + dy);
    if (d.edge.includes('w')) {
      w = Math.max(CHAT_DEFAULTS.minWidth, d.w - dx);
      x = d.x + (d.w - w);
    }
    if (d.edge.includes('n')) {
      h = Math.max(CHAT_DEFAULTS.minHeight, d.h - dy);
      y = d.y + (d.h - h);
    }
    cancelAnimationFrame(d.raf);
    d.raf = requestAnimationFrame(() => chatSend({ type: 'chat.setBounds', x, y, width: w, height: h }));
  };
  const onUp = () => {
    drag.current = null;
  };
  return (
    <>
      {EDGES.map(({ edge, className, cursor }) => (
        <div key={edge} className={cn('no-drag absolute z-3', className)} style={{ cursor }} onPointerDown={onDown(edge)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      ))}
    </>
  );
}
