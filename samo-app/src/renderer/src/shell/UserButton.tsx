/**
 * [INPUT]: 依赖 react，window.samo 桥（onEvent: overlayClosed），../store/session 的 useSession，../store/browser 的 send，../components/ui/{avatar,sidebar-button,button,tooltip}，../icons 的 ChevronDown
 * [OUTPUT]: 对外提供 UserButton 组件：rail 底部的账户入口——折叠态是 20px 头像占图标位（Laper CollapsedUserButton），展开态是项目页极简用户卡（Laper ProjectUserButton：bg-background 圆角卡 + 36px 头像 + 昵称 + 等级 · 积分 + 下拉箭头）；未登录折叠态灰头像、展开态 Sign in 按钮。点击按当下按钮位置算锚点、发 userMenu.open 把菜单开进 overlay 子窗口（整个菜单含子菜单都压在网页之上），主进程收起 overlay 时发 overlayClosed 复位；打开与否经 onOpenChange 告诉 rail 保持展开
 * [POS]: shell 的账户入口（Laper CollapsedUserButton + SidebarUserMenu 的 rail 合体）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../store/session';
import { send } from '../store/browser';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { sidebarButtonClass } from '../components/ui/sidebar-button';
import { Tip } from '../components/ui/tooltip';
import { ChevronDown } from '../icons';

const MENU_GAP = 8;

export function UserButton({ expanded, onOpenChange }: { expanded: boolean; onOpenChange?: (open: boolean) => void }) {
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);

  // 打开：按当下按钮位置算锚点（Laper：left = rect.left，bottom = innerHeight - rect.top + gap），交给 overlay 子窗口去弹
  const toggle = () => {
    if (open) {
      send({ type: 'palette.close' });
      return;
    }
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    setOpen(true);
    send({ type: 'userMenu.open', left: rect.left, bottom: window.innerHeight - rect.top + MENU_GAP });
  };
  useEffect(() => window.samo.onEvent((e) => e.type === 'overlayClosed' && setOpen(false)), []);
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  if (!user) {
    if (expanded) {
      return (
        <Button variant="primary" size="medium" className="w-full" onClick={signIn}>
          Sign in
        </Button>
      );
    }
    return (
      <Tip label="Sign in" side="right">
        <button type="button" onClick={signIn} aria-label="Sign in" className={sidebarButtonClass({ className: 'h-8 w-full shrink-0' })}>
          <span className="flex w-8 shrink-0 items-center justify-center">
            <span aria-hidden="true" className="size-5 rounded-full bg-muted-foreground/30" />
          </span>
        </button>
      </Tip>
    );
  }

  const name = user.nickname || user.email.split('@')[0];
  return (
    <>
      <div ref={trigger}>
        {expanded ? (
          /* Laper ProjectUserButton：项目页极简用户卡——底部贴边禁外投影，用内高光 */
          <button
            type="button"
            onClick={toggle}
            aria-label="Account menu"
            className="group flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
            style={{ boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--background) 85%, white 15%)' }}
          >
            <Avatar user={user} size={36} presence="online" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm leading-5 font-medium text-foreground">{name}</span>
              <span className="block truncate text-xs leading-4 font-medium text-muted-foreground">
                <span className="capitalize">{user.tier}</span>
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">{user.credits.toLocaleString()}</span>
              </span>
            </span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        ) : (
          <button type="button" onClick={toggle} aria-label="Account menu" title={name} className={sidebarButtonClass({ active: open, className: 'h-8 w-full shrink-0' })}>
            {/* 头像与图标同构（icon 18 + 2 = 20px）；不裁剪，留住状态点 */}
            <span className="flex w-8 shrink-0 items-center justify-center">
              <Avatar user={user} size={20} presence="online" />
            </span>
          </button>
        )}
      </div>
    </>
  );
}
