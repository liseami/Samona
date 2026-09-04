/**
 * [INPUT]: 依赖 react，window.samo 桥（onEvent: openUserMenu），../store/browser 的 send，./UserMenu
 * [OUTPUT]: 对外提供 UserMenuOverlay 组件：住在 overlay 子窗口里的用户菜单宿主——收到 openUserMenu 后在给定锚点（壳视图 CSS px，与 overlay 同一坐标系）弹出 UserMenu，全窗透明幕点击 / Esc / 菜单动作即关（palette.close 收起子窗口，主进程再向壳发 overlayClosed）
 * [POS]: shell 弹层里唯一能整个压在网页之上的用户菜单实现；UserButton 只负责算锚点并发 userMenu.open，不再在壳里 Portal
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import { send } from '../store/browser';
import { UserMenu } from './UserMenu';

export function UserMenuOverlay() {
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);

  useEffect(
    () =>
      window.samo.onEvent((event) => {
        if (event.type === 'openUserMenu') setAnchor({ left: event.left, bottom: event.bottom });
      }),
    [],
  );
  const close = () => {
    setAnchor(null);
    send({ type: 'palette.close' });
  };
  useEffect(() => {
    if (!anchor) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  });

  if (!anchor) return null;
  if (window.samo.host === 'chromium') {
    return (
      <div className="p-1">
        <UserMenu onClose={close} />
      </div>
    ); // 气泡承载：菜单即文档
  }
  return (
    <div className="fixed inset-0 z-4">
      <div className="absolute inset-0" onMouseDown={close} aria-hidden="true" />
      <div className="fixed" style={{ left: anchor.left, bottom: anchor.bottom }}>
        <UserMenu onClose={close} />
      </div>
    </div>
  );
}
