/**
 * [INPUT]: 依赖 ../store/browser 的 useBrowser/send，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 WindowControls 组件：自绘的 macOS 红绿灯——12px 圆点、8px 间距、组悬停显示符号、窗口失焦变灰；关闭/最小化/全屏（⌥点击 = 最大化）
 * [POS]: shell 的窗口控制，替代被 setWindowButtonVisibility(false) 隐藏的原生按钮，与 header 里的图标按钮同一基线
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { cn } from '../lib/utils';
import { send, useBrowser } from '../store/browser';

const LIGHTS = [
  { key: 'close', label: 'Close', tone: 'bg-[#FF5F57] border-[#E0443E]', glyph: 'M2.2 2.2l3.6 3.6M5.8 2.2L2.2 5.8' },
  { key: 'minimize', label: 'Minimize', tone: 'bg-[#FEBC2E] border-[#DEA123]', glyph: 'M1.6 4h4.8' },
  { key: 'zoom', label: 'Full screen (⌥ zoom)', tone: 'bg-[#28C840] border-[#1AAB29]', glyph: 'M1.6 6.4V3.4l3 3zM6.4 1.6v3l-3-3z' },
] as const;

export function WindowControls() {
  const focused = useBrowser((s) => s.snapshot?.windowFocused ?? true);
  const act = (key: (typeof LIGHTS)[number]['key'], alt: boolean) => {
    if (key === 'close') send({ type: 'window.close' });
    else if (key === 'minimize') send({ type: 'window.minimize' });
    else send({ type: 'window.zoom', fullscreen: !alt });
  };
  return (
    <div className="group no-drag flex shrink-0 items-center gap-2 pl-1 pr-1" role="group" aria-label="Window controls">
      {LIGHTS.map((l) => (
        <button
          key={l.key}
          type="button"
          aria-label={l.label}
          onClick={(e) => act(l.key, e.altKey)}
          className={cn(
            'flex h-3 w-3 items-center justify-center rounded-full border transition-colors duration-150',
            focused ? l.tone : 'border-[#CFCFCF] bg-[#DFDFDF] dark:border-[#3A3A3A] dark:bg-[#4B4B4B]',
          )}
        >
          <svg viewBox="0 0 8 8" width="8" height="8" className="opacity-0 transition-opacity duration-100 group-hover:opacity-100" aria-hidden="true">
            <path d={l.glyph} fill={l.key === 'zoom' ? 'rgba(0,0,0,0.6)' : 'none'} stroke="rgba(0,0,0,0.6)" strokeWidth={l.key === 'zoom' ? 0 : 1.2} strokeLinecap="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
