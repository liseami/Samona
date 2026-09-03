/**
 * [INPUT]: 依赖 react，../../lib/avatar 的 avatarGradient/avatarText，../../lib/utils 的 cn，../../store/session 的 SessionUser
 * [OUTPUT]: 对外提供 Avatar 组件：圆形头像——真实头像优先，否则算法渐变 + 显示字（Laper AvatarGenerator）；可选 presence 角点（online 绿 / local 黄）
 * [POS]: components/ui 的头像原子；UserButton / UserMenu / 应用桌面共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { avatarGradient, avatarText } from '../../lib/avatar';
import { cn } from '../../lib/utils';
import type { SessionUser } from '../../store/session';

export function Avatar({ user, size = 40, className, presence }: { user: Pick<SessionUser, 'nickname' | 'email' | 'avatarUrl'> | null; size?: number; className?: string; presence?: 'online' | 'local' }) {
  const [broken, setBroken] = useState(false);
  const seed = user ? user.email || user.nickname : '';
  return (
    <span className={cn('relative inline-flex shrink-0 select-none', className)} style={{ width: size, height: size }}>
      {user?.avatarUrl && !broken ? (
        <img src={user.avatarUrl} alt="" width={size} height={size} draggable={false} onError={() => setBroken(true)} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full text-white" style={{ background: user ? avatarGradient(seed) : 'var(--muted)', fontSize: Math.max(10, Math.round(size * 0.38)), fontWeight: 600, letterSpacing: '-0.01em' }}>
          {user ? avatarText(user.nickname, user.email) : ''}
        </span>
      )}
      {presence && <span className={cn('absolute -right-px -bottom-px h-2 w-2 rounded-full ring-2 ring-panel', presence === 'online' ? 'bg-emerald-500' : 'bg-amber-500')} />}
    </span>
  );
}
