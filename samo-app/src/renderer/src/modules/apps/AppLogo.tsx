/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry/AppVisibility，../../icons 的 AppLocal/AppPrivate/AppPublic，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 AppLogo（圆角方形 logo：优先 favicon，失败回退可见性图标）与 VISIBILITY_ICON（local 终端 / private 锁 / public 地球）
 * [POS]: modules/apps 的图形原子，桌面、固定区、列表行、面板头部共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState, type ComponentType } from 'react';
import type { AppEntry, AppVisibility } from '@shared/model';
import { AppLocal, AppPrivate, AppPublic, type IconProps } from '../../icons';
import { cn } from '../../lib/utils';

export const VISIBILITY_ICON: Record<AppVisibility, ComponentType<IconProps>> = { local: AppLocal, private: AppPrivate, public: AppPublic };

export function AppLogo({ app, size, className }: { app: AppEntry; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [app.icon]);
  const Fallback = VISIBILITY_ICON[app.visibility];
  const radius = size >= 20 ? 'rounded-lg' : 'rounded-md';
  if (app.icon && !broken) {
    return <img src={app.icon} alt="" width={size} height={size} draggable={false} onError={() => setBroken(true)} className={cn('shrink-0 object-cover', radius, className)} style={{ width: size, height: size }} />;
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center border border-border bg-card text-muted-foreground', radius, className)} style={{ width: size, height: size }}>
      <Fallback size={Math.round(size * 0.62)} />
    </span>
  );
}
