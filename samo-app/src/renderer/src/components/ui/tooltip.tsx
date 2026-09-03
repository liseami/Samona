/**
 * [INPUT]: 依赖 @radix-ui/react-tooltip，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 TooltipProvider/Tooltip/TooltipTrigger/TooltipContent 与 Tip（一行式包装）
 * [POS]: components/ui 的提示原子——Laper 的浅色表面（bg-popover + outline-border + shadow-md），600ms 延迟
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 8, ...props }: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'laper-tooltip-motion z-[2147483647] flex max-w-[280px] flex-col rounded-md bg-popover px-2.5 py-1.5 text-sm text-popover-foreground shadow-md outline outline-border',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** 一行式：<Tip label="…"><button/></Tip> */
export function Tip({ label, side = 'bottom', children }: { label: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
