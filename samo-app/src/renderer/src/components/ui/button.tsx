/**
 * [INPUT]: 依赖 react，@radix-ui/react-slot 的 Slot，class-variance-authority 的 cva，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 Button 组件与 buttonVariants（variant: default/secondary/ghost/outline/destructive；size: sm/md/icon/iconSm）
 * [POS]: components/ui 的按钮原子（shadcn 形态，Laper 的变体语义：只有强调色按钮带 shadow-xs，ghost/outline 无阴影无缩放）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,box-shadow,transform,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:translate-y-px active:shadow-none',
        secondary: 'border border-border bg-card text-foreground shadow-sm hover:bg-accent/60 active:translate-y-px active:shadow-none',
        ghost: 'bg-transparent text-foreground hover:bg-accent/60',
        outline: 'border border-border bg-transparent text-foreground hover:border-primary hover:text-primary',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:translate-y-px active:shadow-none',
      },
      size: {
        sm: 'h-7 px-3 text-sm',
        md: 'h-8 px-4 text-base',
        icon: 'h-7 w-7 p-0 text-muted-foreground hover:text-foreground',
        iconSm: 'h-6 w-6 p-0 text-muted-foreground hover:text-foreground',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
