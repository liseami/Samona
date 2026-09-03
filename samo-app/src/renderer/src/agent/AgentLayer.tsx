/**
 * [INPUT]: 依赖 react，../icons 的 AgentCursor，../lib/utils 的 cn，window.samo.onEvent（agentPresence / agentCursor）
 * [OUTPUT]: 对外提供 AgentLayer 组件：agent 在页面上的「手」——临界阻尼弹簧跟随的光标（无回弹）、到点涟漪、光标旁的动作标签胶囊、沿网页边缘呼吸并有一束光环绕的发光圈；不活跃时整层淡出
 * [POS]: renderer/agent 页的唯一界面；坐标即网页 CSS 像素（子窗口与网页视图同矩形）；一切都是装饰，pointer-events 全关
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { AgentCursor } from '../icons';
import { cn } from '../lib/utils';

// 弹簧参数：ζ = c / (2√k) = 36 / (2·√320) ≈ 1.006 —— 临界阻尼，快而不回弹（Laper 禁回弹铁律）
const STIFFNESS = 320;
const DAMPING = 36;
const RIPPLE_DELAY_MS = 180; // 光标大约到点的时刻再起涟漪

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function AgentLayer() {
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cursorEl = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const pos = useRef({ x: -100, y: -100 });
  const vel = useRef({ x: 0, y: 0 });
  const seen = useRef(false);

  useEffect(
    () =>
      window.samo.onEvent((e) => {
        if (e.type === 'agentPresence') {
          setActive(e.active);
          setLabel(e.label);
          if (!e.active) seen.current = false;
        } else if (e.type === 'agentCursor') {
          if (!seen.current) {
            pos.current = { x: e.x, y: e.y }; // 第一次直接落位，不从角落飞来
            vel.current = { x: 0, y: 0 };
            seen.current = true;
          }
          target.current = { x: e.x, y: e.y };
          const id = Date.now() + Math.random();
          setRipples((r) => [...r.slice(-3), { id, x: e.x, y: e.y }]);
          setTimeout(() => setRipples((r) => r.filter((k) => k.id !== id)), 900);
        }
      }),
    [],
  );

  // ---- 弹簧积分：直接写 transform，不经 React 渲染 ----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const axis of ['x', 'y'] as const) {
        const a = -STIFFNESS * (pos.current[axis] - target.current[axis]) - DAMPING * vel.current[axis];
        vel.current[axis] += a * dt;
        pos.current[axis] += vel.current[axis] * dt;
      }
      const t = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      if (cursorEl.current) cursorEl.current.style.transform = t;
      if (labelEl.current) labelEl.current.style.transform = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={cn('pointer-events-none fixed inset-0 select-none transition-opacity duration-300 ease-out', active ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
      {/* 边缘发光：内侧柔光呼吸 + 一束光沿边环绕 */}
      <div className="agent-edge absolute inset-0 rounded-[13px]" />
      <div className="agent-ring absolute inset-0 rounded-[13px]" />
      {/* 到点涟漪 */}
      {ripples.map((r) => (
        <span key={r.id} className="agent-ripple absolute h-9 w-9 rounded-full" style={{ left: r.x - 18, top: r.y - 18, animationDelay: `${RIPPLE_DELAY_MS}ms` }} />
      ))}
      {/* 光标：agent 色描边 + 柔光 */}
      <div ref={cursorEl} className="absolute top-0 left-0 will-change-transform">
        <div className="-translate-x-[3px] -translate-y-[2px]" style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--agent) 70%, transparent)) drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
          <AgentCursor size={22} color="var(--agent)" />
        </div>
      </div>
      {/* 动作标签：贴在光标右下 */}
      <div ref={labelEl} className="absolute top-0 left-0 will-change-transform">
        <div className={cn('ml-5 mt-6 flex max-w-[280px] items-center gap-1.5 rounded-xl border border-border bg-card/95 px-2 py-1 text-xs text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-200', label ? 'opacity-100' : 'opacity-0')}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-agent" />
          <span className="truncate">{label}</span>
        </div>
      </div>
    </div>
  );
}
