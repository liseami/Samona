/**
 * [INPUT]: 依赖 class-variance-authority 的 cva，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 sidebarButton(cva) 与 sidebarButtonClass({active,disabled,className})：全应用唯一的「可选行」语言——rounded-2xl、常驻 border、选中 = bg-card + border-border + shadow-sm 的浮起白卡，悬停 = sidebar-accent/66，300ms ease-out
 * [POS]: components/ui 的选中态原语（Laper SidebarButton）；rail 项、标签行、文件夹头、网格格、身份 pip 全部只用它，禁止各自定义选中样式
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const sidebarButton = cva('flex items-center rounded-2xl border text-left transition-colors duration-300 ease-out', {
  variants: {
    active: {
      true: 'border-border bg-card shadow-sm',
      false: 'border-transparent hover:bg-sidebar-accent/66',
    },
    disabled: {
      true: 'cursor-not-allowed opacity-50 hover:bg-transparent',
      false: 'cursor-pointer',
    },
  },
  defaultVariants: { active: false, disabled: false },
});

export function sidebarButtonClass(opts: { active?: boolean; disabled?: boolean; className?: string } = {}): string {
  return cn(sidebarButton({ active: !!opts.active, disabled: !!opts.disabled }), opts.className);
}
