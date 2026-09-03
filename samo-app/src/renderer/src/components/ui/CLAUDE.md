# components/ui/
> L2 | 父级: ../../../CLAUDE.md

shadcn 形态的原子组件，基于 @radix-ui 分包（与 Laper 一致），样式令牌全部来自 styles.css：配色是用户的 oklch 中性灰体系，阴影/圆角/密度取自 Laper（淡雅平阴影、Apple squircle、压缩字号阶）。只有强调色按钮带阴影，ghost/outline 无阴影无缩放；菜单类表面统一 rounded-xl + border/60 + shadow-lg + pop-in 动画。

## 成员清单
avatar.tsx: Avatar——圆形头像：真实头像优先，否则 lib/avatar 的算法渐变 + 显示字（Laper AvatarGenerator）；presence 角点。
menu-row.tsx: MenuRow——自绘浮层菜单的整行可点项（Laper MenuRowButton：w-full px-2 py-2 rounded-lg hover 底色；justify/align/tone/as）。
sidebar-button.tsx: sidebarButton（cva）/ sidebarButtonClass——全应用唯一的「可选行」语言（Laper SidebarButton）：rounded-2xl、常驻 border、选中 = bg-card + border-border + shadow-sm、悬停 sidebar-accent/66、300ms ease-out；rail 项、标签行、文件夹头、网格格、身份 pip 全部只用它。
button.tsx: Button——设计系统的「魂」，逐 class 复刻 Laper/Kumo：variant primary/info/warning/danger（强调钮：底 token+30% 白、ring token+10% 黑、EmphasisEffect 受光层 token+15% 白 → token + 顶部 1px 内高光、hover 提亮并 1.02 缩放、按压 0.98）与 secondary/ghost/outline/selected/icon/dashed（平钮，无阴影）；size small/medium/large（h-7/8/9，padding 随图标变）；loading 走扫光基元；禁用点击摇晃；children 里的「图标 + 文字」用 inline-flex 行承接（块级 svg 不会把文字挤到下一行）；根元素 shrink-0；根元素 isolate 把内层 z 关在按钮里；asChild 经 Radix Slot。
input.tsx: Input——h-8、bg-input，聚焦 primary 边框 + 3px 柔光（Laper glow-input）。
tooltip.tsx: TooltipProvider/Tooltip/TooltipTrigger/TooltipContent 与一行式 Tip——浅色表面（bg-popover + outline-border + shadow-md），600ms 延迟，z-3。
popover.tsx: Popover/PopoverTrigger/PopoverAnchor/PopoverContent——菜单表面契约，z-2。
scroll-area.tsx: ScrollArea——Radix 滚动容器 + 2px 细滚动条。
kbd.tsx: Kbd——快捷键小标签。
keycap.tsx: Keycap——Laper KeyboardHint 形态的键帽（渐变 muted 底、1.5px 边线 + 4px 底边），命令面板页脚用。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
