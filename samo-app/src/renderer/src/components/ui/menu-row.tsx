/**
 * [INPUT]: 依赖 react 的 forwardRef，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 MenuRow：自绘浮层菜单里的整行可点项（Laper MenuRowButton）——w-full · px-2 py-2 · rounded-lg · hover 底色；justify start|between、align、tone default|primary、as button|div
 * [POS]: components/ui 的菜单行原语；UserMenu 这类自绘（非 Radix）菜单的行项唯一长相，禁止再手写 `w-full hover:bg-accent px-2 py-2 rounded-lg`
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Props = {
  as?: 'button' | 'div';
  justify?: 'start' | 'between';
  align?: 'center' | 'start';
  tone?: 'default' | 'primary';
} & ButtonHTMLAttributes<HTMLButtonElement> &
  HTMLAttributes<HTMLDivElement>;

const TONE = { default: 'hover:bg-accent', primary: 'hover:bg-primary/10' };

export const MenuRow = forwardRef<HTMLButtonElement & HTMLDivElement, Props>(function MenuRow({ as = 'button', justify = 'start', align = 'center', tone = 'default', className, children, ...rest }, ref) {
  const classes = cn('flex w-full cursor-pointer gap-2 rounded-lg px-2 py-2 text-left transition-colors disabled:cursor-wait', align === 'start' ? 'items-start' : 'items-center', justify === 'between' && 'justify-between', TONE[tone], className);
  if (as === 'div') {
    return (
      <div ref={ref} className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
});
