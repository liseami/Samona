/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry，../../icons 的 AppLocal/AppCloud，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 AppLogo 组件：应用的圆角方形 logo——优先网页的 favicon，加载失败或没有时回退到本地（终端）/ 云端（云）图标
 * [POS]: modules/apps 的图形原子，固定区、列表行、面板头部共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import type { AppEntry } from '@shared/model';
import { AppCloud, AppLocal } from '../../icons';
import { cn } from '../../lib/utils';

export function AppLogo({ app, size, className }: { app: AppEntry; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [app.icon]);
  const Fallback = app.kind === 'cloud' ? AppCloud : AppLocal;
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
