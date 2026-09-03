/**
 * [INPUT]: 依赖 @radix-ui/react-popover，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Popover/PopoverTrigger/PopoverAnchor/PopoverContent
 * [POS]: components/ui 的浮层原子——Laper 的 MENU_SURFACE（rounded-xl + border/60 + shadow-lg + pop-in 动画）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }: PopoverPrimitive.PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('laper-menu-motion z-50 w-72 rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
