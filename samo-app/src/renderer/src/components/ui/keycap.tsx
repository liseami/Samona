/**
 * [INPUT]: 依赖 react，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Keycap：Laper KeyboardHint 形态的键帽（h-6、渐变 muted 底、1.5px 边线 + 4px 底边）
 * [POS]: components/ui 的文字原子，命令面板页脚与提示共用；Kbd 是它的轻量版
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Keycap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-gradient-to-b from-muted/60 to-muted px-2 font-sans text-[10px] font-semibold tracking-wider text-muted-foreground', className)}
      style={{ border: '1.5px solid var(--border)', borderBottomWidth: 4 }}
    >
      {children}
    </kbd>
  );
}
