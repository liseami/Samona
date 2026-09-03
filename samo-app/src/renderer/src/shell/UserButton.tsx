/**
 * [INPUT]: 依赖 react，../store/session 的 useSession，../components/ui/{avatar,popover,sidebar-button,tooltip}，../lib/utils 的 cn，./UserMenu
 * [OUTPUT]: 对外提供 UserButton 组件：rail 底部的账户入口——已登录：头像（折叠态 20px 头像占据图标位，展开态头像 + 昵称 + 等级 + 下拉箭头）点击弹 UserMenu；未登录：灰色头像占位 / 展开态 "Log in"，点击登录
 * [POS]: shell 的账户入口（Laper CollapsedUserButton + UserButton 的 rail 合体）；菜单用 Popover 逃逸 rail 容器，向右贴出
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { useSession } from '../store/session';
import { Avatar } from '../components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { sidebarButtonClass } from '../components/ui/sidebar-button';
import { Tip } from '../components/ui/tooltip';
import { ChevronDown } from '../icons';
import { cn } from '../lib/utils';
import { UserMenu } from './UserMenu';

export function UserButton({ expanded }: { expanded: boolean }) {
  const user = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const [open, setOpen] = useState(false);

  if (!user) {
    const button = (
      <button type="button" onClick={signIn} aria-label="Log in" className={sidebarButtonClass({ className: 'h-8 w-full shrink-0' })}>
        <span className="flex w-8 shrink-0 items-center justify-center">
          <span aria-hidden="true" className="size-5 rounded-full bg-muted-foreground/30" />
        </span>
        <span className={cn('min-w-0 flex-1 truncate pr-2 text-base font-semibold text-foreground transition-opacity duration-100', expanded ? 'opacity-100' : 'opacity-0')}>Log in</span>
      </button>
    );
    return expanded ? (
      button
    ) : (
      <Tip label="Log in" side="right">
        {button}
      </Tip>
    );
  }

  const name = user.nickname || user.email.split('@')[0];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Account menu" title={name} className={sidebarButtonClass({ active: open, className: 'h-8 w-full shrink-0' })}>
          {/* 头像与图标同构（icon 18 + 2 = 20px）；不裁剪，留住状态点 */}
          <span className="flex w-8 shrink-0 items-center justify-center">
            <Avatar user={user} size={20} presence="online" />
          </span>
          <span className={cn('flex min-w-0 flex-1 items-center gap-1 pr-2 transition-opacity duration-100', expanded ? 'opacity-100' : 'opacity-0')}>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className="w-full truncate text-base leading-tight font-semibold text-foreground">{name}</span>
              <span className="w-full truncate text-xs leading-tight text-muted-foreground capitalize">{user.tier}</span>
            </span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-auto border-0 bg-transparent p-0 shadow-none">
        <UserMenu onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
