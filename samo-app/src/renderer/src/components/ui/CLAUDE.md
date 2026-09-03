# components/ui/
> L2 | 父级: ../../../CLAUDE.md

shadcn 形态的原子组件，基于 @radix-ui 分包（与 Laper 一致），样式令牌全部来自 styles.css：配色是用户的 oklch 中性灰体系，阴影/圆角/密度取自 Laper（淡雅平阴影、Apple squircle、压缩字号阶）。只有强调色按钮带阴影，ghost/outline 无阴影无缩放；菜单类表面统一 rounded-xl + border/60 + shadow-lg + pop-in 动画。

## 成员清单
button.tsx: Button + buttonVariants（cva）——variant: default/secondary/ghost/outline/destructive；size: sm/md/icon/iconSm；asChild 经 Radix Slot。
input.tsx: Input——h-8、bg-input，聚焦 primary 边框 + 3px 柔光（Laper glow-input）。
tooltip.tsx: TooltipProvider/Tooltip/TooltipTrigger/TooltipContent 与一行式 Tip——浅色表面（bg-popover + outline-border + shadow-md），600ms 延迟。
popover.tsx: Popover/PopoverTrigger/PopoverAnchor/PopoverContent——菜单表面契约。
scroll-area.tsx: ScrollArea——Radix 滚动容器 + 2px 细滚动条。
kbd.tsx: Kbd——快捷键小标签。
keycap.tsx: Keycap——Laper KeyboardHint 形态的键帽（渐变 muted 底、1.5px 边线 + 4px 底边），命令面板页脚用。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
