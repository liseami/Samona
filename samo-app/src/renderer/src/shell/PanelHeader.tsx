/**
 * [INPUT]: 依赖 react 的 ReactNode，@shared/model 的 HEADER_HEIGHT，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 PanelHeader 组件：Laper PanelHeader 的三槽头部壳——title 左 / center 绝对居中 / actions 右，h-10、border-b、可拖动窗口
 * [POS]: shell 的面板卡头部原语；模块把自己的导航、地址与工具塞进三个槽（浏览器：后退前进刷新 · 地址栏 · 复制/标签矩阵），壳只定几何与质感
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ReactNode } from 'react';
import { HEADER_HEIGHT } from '@shared/model';
import { cn } from '../lib/utils';

export function PanelHeader({ title, center, actions, className }: { title?: ReactNode; center?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('drag relative flex shrink-0 items-center border-b border-border px-2', className)} style={{ height: HEADER_HEIGHT }}>
      {title && <div className="no-drag flex shrink-0 items-center gap-0.5">{title}</div>}
      {center && <div className="no-drag absolute top-1/2 left-1/2 flex w-[clamp(180px,56%,560px)] -translate-x-1/2 -translate-y-1/2 justify-center">{center}</div>}
      {actions && <div className="no-drag ml-auto flex items-center gap-0.5">{actions}</div>}
    </div>
  );
}
