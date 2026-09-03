/**
 * [INPUT]: 依赖 react，../chat/store 的 useChat/bindChat/chatSend，../icons 的 ArrowLeftUpIcon，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Launcher 组件：Laper FAB 药丸（130×44、rounded-3xl、强调色受光底、ArrowLeftUp 18 + "Samo AI" text-sm font-semibold、primary 40% 的 20px 投影、AI 忙时换双弧 spinner、未读角标）；点击打开浮窗
 * [POS]: renderer/launcher 的唯一界面；主进程只在 closed 形态显示这个视图（Laper：展开后 FAB 即面板本身）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowLeftUpIcon } from '../icons';
import { cn } from '../lib/utils';
import { bindChat, chatSend, useChat } from '../chat/store';

export function Launcher() {
  useEffect(() => bindChat(), []);
  const snap = useChat((s) => s.snapshot);
  const busy = !!snap?.generating;
  const [spec, setSpec] = useState({ x: 50, y: 50 });
  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSpec({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  return (
    <div className="flex h-full w-full items-end justify-end bg-transparent p-6">
      <button
        type="button"
        aria-label="Open Samo AI (⌘I)"
        onMouseMove={onMove}
        onClick={() => chatSend({ type: 'chat.setMode', mode: 'floating' })}
        className="group relative isolate flex h-11 w-[130px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-3xl border-0 text-white"
        style={{
          boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 40%, transparent)',
          background: 'linear-gradient(135deg, color-mix(in oklch, var(--primary), black 8%) 0%, var(--primary) 50%, color-mix(in oklch, var(--primary), white 18%) 100%)',
        }}
      >
        {/* 受光：跟手的高光 + 顶部 1px 内高光（Laper 的 PrismaticEffect 是 WebGL 多色，这里用同一层次的 CSS 近似） */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-1 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: `radial-gradient(120px 60px at ${spec.x}% ${spec.y}%, rgba(255,255,255,0.28), transparent 70%)` }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-1 rounded-[inherit] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]" />
        <span className="relative z-2 flex items-center justify-center gap-2">
          {busy ? <Spinner /> : <ArrowLeftUpIcon size={18} color="#ffffff" />}
          <span className="text-sm font-semibold text-white">Samo AI</span>
        </span>
        {!!snap?.unread && (
          <span className={cn('absolute top-1.5 right-2 z-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-primary')}>{snap.unread}</span>
        )}
      </button>
    </div>
  );
}

/** Laper FABSpinner：双弧 r=9 strokeWidth=3，第二弧 35% 透明 */
function Spinner() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.35" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
