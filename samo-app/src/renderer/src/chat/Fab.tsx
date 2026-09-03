/**
 * [INPUT]: 依赖 react，../icons 的 ArrowLeftUpIcon，../components/effects/PrismaticBurst，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Fab 组件：Laper FAB 药丸的 Samo 版（130×44、rounded-3xl）——primary 渐变底 + PrismaticBurst 银灰光线层（blur 6px，performance high）+ Kumo 白色受光层 + 悬停光晕脉冲；ArrowLeftUp 18 + "Samo AI"；AI 忙时双弧 spinner；未读角标
 * [POS]: renderer/chat 的收起态形象，住在 ChatShell 的右下角并随外壳反缩放；配色遵循银灰范式，不出彩色
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { ArrowLeftUpIcon } from '../icons';
import { cn } from '../lib/utils';
import { PrismaticBurst } from '../components/effects/PrismaticBurst';

/** Laper PRISMATIC_CONFIG 的参数，配色换成银灰阶（设计系统只有中性灰） */
const PRISMATIC_COLORS = ['#52525b', '#a1a1aa', '#e4e4e7', '#71717a', '#d4d4d8', '#3f3f46'];
const ISOLATED_LAYER = { transform: 'translateZ(0)', backfaceVisibility: 'hidden', contain: 'strict', filter: 'blur(6px)' } as const;

export function Fab({ busy, unread, active, onClick }: { busy: boolean; unread: number; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      aria-label="Open Samo AI (⌘I)"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="group relative isolate flex h-full w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-3xl border-0 text-white transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
      style={{ boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)' }}
    >
      {/* 底层渐变：primary 的三段（Laper：主题色三段渐变） */}
      <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(135deg, color-mix(in oklch, var(--primary), black 10%) 0%, var(--primary) 55%, color-mix(in oklch, var(--primary), white 14%) 100%)' }} />
      {/* PrismaticBurst 银灰光线层（Laper：blur 6px，独立合成层，performance high）；忙时让位给 spinner */}
      {active && !busy && (
        <span aria-hidden="true" className="absolute inset-0 overflow-hidden" style={ISOLATED_LAYER}>
          <PrismaticBurst intensity={15} speed={0.4} animationType="rotate3d" distort={30} rayCount={18} mixBlendMode="normal" performanceMode="high" colors={PRISMATIC_COLORS} />
        </span>
      )}
      {/* Kumo 同款受光层（白色透明度版）：上亮下透 + 顶部 1px 高光 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.34)', opacity: hovered ? 1 : 0.85 }}
      />
      {/* 悬停光晕脉冲（Laper：opacity 0→0.2→0，scale 1→1.3→1.6，1.2s 循环）——灰白光 */}
      <span aria-hidden="true" className={cn('launcher-pulse pointer-events-none absolute inset-0 opacity-0', hovered && 'is-on')} style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
      <span className="relative z-2 flex items-center justify-center gap-2">
        {busy ? <Spinner /> : <ArrowLeftUpIcon size={18} color="#ffffff" />}
        <span className="text-sm font-semibold text-white">Samo AI</span>
      </span>
      {unread > 0 && <span className="absolute top-1.5 right-2 z-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-primary">{unread}</span>}
    </button>
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
