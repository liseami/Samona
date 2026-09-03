/**
 * [INPUT]: 依赖 react，../chat/store 的 useChat/bindChat/chatSend，../icons 的 ArrowLeftUpIcon，../components/effects/PrismaticBurst，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Launcher 组件：Laper FAB 药丸的 Samo 版（130×44、rounded-3xl）——底层 primary→agent 渐变 + PrismaticBurst WebGL 炫彩层（blur 6px，performance high）+ Kumo 白色受光层（上亮下透 + 顶部 1px 高光）+ 悬停光晕脉冲；编舞相位 launcherIn/launcherOut 播放入场/退场；ArrowLeftUp 18 + "Samo AI"；AI 忙时换双弧 spinner；未读角标；点击打开浮窗
 * [POS]: renderer/launcher 的唯一界面；承载它的是主进程的 LauncherWindow 子窗口（透明、不可聚焦），只在 closed 形态显示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import { ArrowLeftUpIcon } from '../icons';
import { cn } from '../lib/utils';
import { PrismaticBurst } from '../components/effects/PrismaticBurst';
import { bindChat, chatSend, useChat } from '../chat/store';

/** Laper PRISMATIC_CONFIG 的参数，配色换成 Samo 的 agent 色系（靛蓝 / 紫 / 青） */
const PRISMATIC_COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#8b5cf6', '#2563eb', '#a855f7'];
const ISOLATED_LAYER = { transform: 'translateZ(0)', backfaceVisibility: 'hidden', contain: 'strict', filter: 'blur(6px)' } as const;

export function Launcher() {
  useEffect(() => bindChat(), []);
  const snap = useChat((s) => s.snapshot);
  const busy = !!snap?.generating;
  const [hovered, setHovered] = useState(false);
  const [phase, setPhase] = useState<'in' | 'out' | null>(null);
  useEffect(
    () =>
      window.samo.onEvent((e) => {
        if (e.type === 'chatPhase' && (e.phase === 'launcherIn' || e.phase === 'launcherOut')) setPhase(e.phase === 'launcherIn' ? 'in' : 'out');
      }),
    [],
  );
  return (
    <div className="flex h-full w-full items-end justify-end bg-transparent p-6">
      <button
        type="button"
        aria-label="Open Samo AI (⌘I)"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => chatSend({ type: 'chat.setMode', mode: 'floating' })}
        className={cn(
          'group relative isolate flex h-11 w-[130px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-3xl border-0 text-white transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]',
          phase === 'in' && 'launcher-in',
          phase === 'out' && 'launcher-out',
        )}
        style={{ boxShadow: '0 4px 20px color-mix(in srgb, var(--agent) 40%, transparent)' }}
      >
        {/* 底层渐变：primary → agent 色（Laper：主题色三段渐变） */}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary), var(--agent) 35%) 55%, color-mix(in oklch, var(--agent), black 25%) 100%)' }} />
        {/* PrismaticBurst 炫彩层（Laper：blur 6px，独立合成层，performance high） */}
        {!busy && (
          <span aria-hidden="true" className="absolute inset-0 overflow-hidden" style={ISOLATED_LAYER}>
            <PrismaticBurst intensity={15} speed={0.4} animationType="rotate3d" distort={30} rayCount={18} mixBlendMode="normal" performanceMode="high" colors={PRISMATIC_COLORS} />
          </span>
        )}
        {/* Kumo 同款受光层（白色透明度版）：上亮下透 + 顶部 1px 高光，压在 WebGL 之上、内容之下 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.34)', opacity: hovered ? 1 : 0.85 }}
        />
        {/* 悬停光晕脉冲（Laper：opacity 0→0.2→0，scale 1→1.3→1.6，1.2s 循环） */}
        <span aria-hidden="true" className={cn('launcher-pulse pointer-events-none absolute inset-0 opacity-0', hovered && 'is-on')} style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--agent) 55%, transparent), transparent 70%)' }} />
        <span className="relative z-2 flex items-center justify-center gap-2">
          {busy ? <Spinner /> : <ArrowLeftUpIcon size={18} color="#ffffff" />}
          <span className="text-sm font-semibold text-white">Samo AI</span>
        </span>
        {!!snap?.unread && (
          <span className="absolute top-1.5 right-2 z-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-primary">{snap.unread}</span>
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
