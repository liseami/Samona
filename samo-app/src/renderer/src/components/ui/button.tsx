/**
 * [INPUT]: 依赖 react，@radix-ui/react-slot 的 Slot，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Button 组件（variant: primary/info/warning/danger/secondary/ghost/outline/selected/icon/dashed；size: small/medium/large；leftIcon/rightIcon/loading/asChild）与 emphasisStyle/VARIANT_STYLES 常量
 * [POS]: components/ui 的按钮原语——设计系统的「魂」。有色强调钮是 Kumo 配方（Laper 同源）：底 = token 混 30% 白，ring = token 混 10% 黑，受光层自上而下 token+15% 白 → token，顶部 1px 内高光，hover 渐变起点抬到底色；悬停 1.02 / 按压 0.98；禁用点击摇晃；加载走扫光基元
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'info' | 'warning' | 'danger' | 'secondary' | 'ghost' | 'outline' | 'selected' | 'icon' | 'dashed';
export type ButtonSize = 'small' | 'medium' | 'large';

// ============ 尺寸（Laper SIZE_CONFIG / PADDING_CONFIG / ICON_SIZE_MAP 原样） ============
const SIZE: Record<ButtonSize, string> = {
  small: 'h-7 gap-1.5 text-sm font-medium',
  medium: 'h-8 gap-2 text-base font-medium',
  large: 'h-9 xl:h-10 gap-2 text-base font-medium',
};
const PADDING: Record<ButtonSize, { base: string; left: string; right: string; both: string }> = {
  small: { base: 'px-3', left: 'pl-2.5 pr-3.5', right: 'pl-3.5 pr-2.5', both: 'px-2.5' },
  medium: { base: 'px-4', left: 'pl-3 pr-5', right: 'pl-5 pr-3', both: 'px-3' },
  large: { base: 'px-4 xl:px-5', left: 'pl-3.5 pr-5 xl:pl-4 xl:pr-6', right: 'pl-5 pr-3.5 xl:pl-6 xl:pr-4', both: 'px-3.5 xl:px-4' },
};
export const ICON_PX: Record<ButtonSize, number> = { small: 14, medium: 16, large: 16 };

// ============ 变体（Laper VARIANT_STYLES 原样；强调钮的立体感由 EmphasisEffect 给） ============
const EMPHASIS = 'group relative overflow-hidden bg-(--btn-emphasis-bg) ring ring-(--btn-emphasis-ring) shadow-xs border-0';
export const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: `${EMPHASIS} text-primary-foreground`,
  info: `${EMPHASIS} text-white`,
  warning: `${EMPHASIS} text-white`,
  danger: `${EMPHASIS} text-destructive-foreground`,
  secondary: 'bg-background text-foreground border border-border relative overflow-hidden shadow-sm hover:bg-accent',
  ghost: 'bg-transparent shadow-none! border-0 text-foreground hover:bg-accent',
  outline: 'bg-transparent text-foreground border border-border hover:border-primary hover:text-primary shadow-none!',
  selected: 'bg-sidebar-accent text-foreground border-0 shadow-none!',
  icon: 'bg-transparent shadow-none! p-0 w-7 h-7 text-foreground hover:text-primary',
  dashed: 'bg-transparent text-muted-foreground border border-dashed border-border shadow-none! hover:border-primary/50 hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground',
};

// ============ 强调钮质感（Kumo 配方，颜色全走 token） ============
const EMPHASIS_TOKENS: Partial<Record<ButtonVariant, string>> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  danger: 'var(--destructive)',
};
export function emphasisStyle(variant: ButtonVariant): CSSProperties | undefined {
  const token = EMPHASIS_TOKENS[variant];
  if (!token) return undefined;
  return {
    '--btn-emphasis-ring': `color-mix(in oklch, ${token}, black 10%)`,
    '--btn-emphasis-bg': `color-mix(in oklch, ${token}, white 30%)`,
    '--btn-emphasis-from': `color-mix(in oklch, ${token}, white 15%)`,
    '--btn-emphasis-to': token,
  } as CSSProperties;
}

/** 受光层：自上而下渐变 + 顶部 1px 内高光，hover 整体提亮（Laper EmphasisEffect 原样） */
function EmphasisEffect() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-1 rounded-[inherit] bg-linear-to-b from-(--btn-emphasis-from) to-(--btn-emphasis-to) shadow-[inset_0_1px_0_0_var(--btn-emphasis-bg)] transition-colors duration-150 group-hover:from-(--btn-emphasis-bg)"
    />
  );
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  asChild?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'small',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  asChild = false,
  className,
  style,
  onClick,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const [shaking, setShaking] = useState(false);
  const isEmphasis = variant in EMPHASIS_TOKENS;
  const isDisabled = disabled || loading;
  const iconOnly = !children && (leftIcon || rightIcon);
  const pad = PADDING[size];
  const padding = iconOnly || (leftIcon && rightIcon) ? pad.both : leftIcon ? pad.left : rightIcon ? pad.right : pad.base;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        // 禁用态点击：摇晃提示而非死寂（Laper）
        e.preventDefault();
        if (disabled && !loading) {
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
        }
        return;
      }
      onClick?.(e);
    },
    [isDisabled, disabled, loading, onClick],
  );

  const classes = cn(
    'isolate inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl transition-[background-color,box-shadow,transform,color,border-color] duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
    variant !== 'icon' && SIZE[size],
    variant !== 'icon' && padding,
    VARIANT_STYLES[variant],
    // 强调钮：悬停 1.02 / 按压 0.98（Laper SCALE.hover / SCALE.tap，spring 400/40 的 CSS 近似）
    isEmphasis && !isDisabled && 'hover:scale-[1.02] active:scale-[0.98] ease-[cubic-bezier(0.22,0.8,0.36,1)]',
    isDisabled && 'opacity-60',
    shaking && 'animate-shake',
    className,
  );
  const mergedStyle = { ...(isEmphasis ? emphasisStyle(variant) : undefined), ...style };
  const iconPx = ICON_PX[size];
  const content = (
    <span className={cn('relative z-2 flex items-center justify-center', variant !== 'icon' && SIZE[size].split(' ')[1])}>
      {loading ? (
        <span className="flex shrink-0 items-center justify-center" aria-hidden="true">
          <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        </span>
      ) : leftIcon ? (
        <span className="flex shrink-0 items-center justify-center">{leftIcon}</span>
      ) : null}
      {/* children 里常常直接放「图标 + 文字」：用 flex 行承接，否则块级 svg 会把文字挤到下一行 */}
      {children !== null && children !== undefined && children !== false && children !== '' && (
        <span className={cn('inline-flex items-center whitespace-nowrap', variant !== 'icon' && SIZE[size].split(' ')[1], loading && 'opacity-50')}>{children}</span>
      )}
      {!loading && rightIcon && <span className="flex shrink-0 items-center justify-center">{rightIcon}</span>}
    </span>
  );

  if (asChild) {
    return (
      <Slot className={classes} style={mergedStyle} {...(rest as Record<string, unknown>)}>
        {children}
      </Slot>
    );
  }
  return (
    <button type={type} className={classes} style={mergedStyle} aria-disabled={isDisabled || undefined} onClick={handleClick} {...rest}>
      {isEmphasis && <EmphasisEffect />}
      {loading && <span aria-hidden="true" className="laper-shimmer-band z-1" />}
      {content}
    </button>
  );
}
