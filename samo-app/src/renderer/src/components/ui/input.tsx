/**
 * [INPUT]: 依赖 react，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Input 组件：h-8、rounded-lg、bg-input，聚焦时 primary 边框 + 柔光（Laper 的 glow-input）
 * [POS]: components/ui 的输入原子，地址栏与各编辑器共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      spellCheck={false}
      autoComplete="off"
      className={cn(
        'flex h-8 w-full rounded-lg border border-border bg-input px-3 text-base text-foreground placeholder:text-muted-foreground',
        'transition-[border-color,box-shadow] duration-200 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
