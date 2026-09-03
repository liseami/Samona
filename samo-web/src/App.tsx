/**
 * [INPUT]: 依赖 react 的 useState/useEffect/useRef，依赖 ./components/Ferrofluid 背景、./components/ShinyText 文字、./i18n/lines 的 LINES
 * [OUTPUT]: 对外提供 App 根组件——铁磁流体背景 + 中央一行在 20 国语言间轮换的发光标语
 * [POS]: src 的合成层，编排背景与前景，被 main.tsx 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Ferrofluid from './components/Ferrofluid';
import ShinyText from './components/ShinyText';
import { LINES } from './i18n/lines';

// ============ 节奏：每句停留 + 换语言的淡入淡出 ============
const HOLD = 2800; // 每句停留（ms）
const FADE = 1100; // 淡入/淡出时长，与 CSS transition 对齐

export default function App() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const idxRef = useRef(0);

  // ---- auto-fit：量出单行自然宽度，缩放到刚好铺满可用宽度 ----
  const slotRef = useRef<HTMLDivElement>(null); // 可用宽度基准
  const lineRef = useRef<HTMLDivElement>(null); // 待缩放的单行
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const el = lineRef.current;
    if (!slot || !el) return;
    const measure = () => {
      el.style.transform = 'scale(1)'; // 先复位再量自然宽度
      const natural = el.scrollWidth;
      const avail = slot.clientWidth;
      setFit(natural > 0 ? Math.min(1, avail / natural) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    return () => ro.disconnect();
  }, [idx]);

  // 首帧点亮，避免闪现
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 轮换：淡出 → 换语言 → 淡入
  useEffect(() => {
    const tick = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % LINES.length;
        setIdx(idxRef.current);
        setShow(true);
      }, FADE);
    }, HOLD + FADE);
    return () => clearInterval(tick);
  }, []);

  const line = LINES[idx];

  return (
    <div className="relative h-full w-full">
      {/* ---- 背景：铁磁流体，慢而大，如熔银缓流 ---- */}
      <div className="pointer-events-none absolute inset-0">
        <Ferrofluid
          scale={3}
          speed={0.04}
          colors={['#ffffff', '#ffffff', '#ffffff']}
          flowDirection="down"
          mouseInteraction={false}
        />
      </div>

      {/* ---- 前景：中央那一行会呼吸、会发光的标语（强制单行，自动缩放铺满） ---- */}
      <main className="absolute inset-0 flex items-center justify-center px-[6vw]">
        <div
          ref={slotRef}
          className="w-full max-w-[64rem] transition-opacity duration-[1100ms] ease-in-out"
          style={{ opacity: show ? 1 : 0 }}
        >
          <div className="flex justify-center">
            <div
              ref={lineRef}
              key={idx}
              lang={line.lang}
              dir={line.dir ?? 'ltr'}
              className="whitespace-nowrap"
              style={{ transform: `scale(${fit})`, transformOrigin: 'center' }}
            >
              <ShinyText
                text={line.t}
                speed={4}
                color="#8a8a8a"
                shineColor="#ffffff"
                className="text-[clamp(1.5rem,5vw,3rem)] font-light tracking-[0.01em]"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ---- 角落一枚静默的签名 ---- */}
      <p className="pointer-events-none fixed inset-x-0 bottom-[max(1.4rem,env(safe-area-inset-bottom))] text-center text-[0.8rem] font-normal uppercase tracking-[0.32em] text-white/30">
        Samona
      </p>
    </div>
  );
}
