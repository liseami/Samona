/**
 * [INPUT]: 依赖 react（createPortal），../store/session 的 useSession，../components/ui/{avatar,sidebar-button,button,tooltip}，../icons 的 ChevronDown，../lib/utils 的 cn，./UserMenu
 * [OUTPUT]: 对外提供 UserButton 组件：rail 底部的账户入口——折叠态是 20px 头像占图标位（Laper CollapsedUserButton），展开态是项目页极简用户卡（Laper ProjectUserButton：bg-background 圆角卡 + 36px 头像 + 昵称 + 等级 · 积分 + 下拉箭头）；未登录折叠态灰头像、展开态 Sign in 按钮。菜单经 Portal 以固定锚点从按钮上方弹出（打开那一刻算一次，rail 伸缩不再牵动它），全屏透明幕点击/Esc 关闭；打开与否经 onOpenChange 告诉 rail 保持展开
 * [POS]: shell 的账户入口（Laper CollapsedUserButton + SidebarUserMenu 的 rail 合体）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../store/session';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { sidebarButtonClass } from '../components/ui/sidebar-button';
import { Tip } from '../components/ui/tooltip';
import { ChevronDown } from '../icons';
import { cn } from '../lib/utils';
import { UserMenu } from './UserMenu';

const MENU_GAP = 8;

export function UserButton({ expanded, onOpenChange }: { expanded: boolean; onOpenChange?: (open: boolean) => void }) {
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ left: 0, bottom: 0 });

  // 锚点：打开那一刻按触发器位置算一次（Laper：left = rect.left，bottom = innerHeight - rect.top + gap），只随窗口 resize 重算
  const computeAnchor = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({ left: rect.left, bottom: window.innerHeight - rect.top + MENU_GAP });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    computeAnchor();
    window.addEventListener('resize', computeAnchor);
    return () => window.removeEventListener('resize', computeAnchor);
  }, [open, computeAnchor]);
  useEffect(() => {
    onOpenChange?.(open);
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange]);
  const close = useCallback(() => setOpen(false), []);

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
            onClick={() => setOpen((v) => !v)}
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
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Account menu" title={name} className={sidebarButtonClass({ active: open, className: 'h-8 w-full shrink-0' })}>
            {/* 头像与图标同构（icon 18 + 2 = 20px）；不裁剪，留住状态点 */}
            <span className="flex w-8 shrink-0 items-center justify-center">
              <Avatar user={user} size={20} presence="online" />
            </span>
          </button>
        )}
      </div>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-5" onClick={close} aria-hidden="true" />
            <div className={cn('fixed z-5')} style={{ left: anchor.left, bottom: anchor.bottom }}>
              <UserMenu onClose={close} />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
