/**
 * [INPUT]: 依赖 react 的 useState，@shared/model 的 MODULES/ModuleId，../icons 的 MODULE_ICON，../lib/utils 的 cn，../store/browser 的 useBrowser/send，../components/ui/tooltip 的 Tip，../assets/logo.png
 * [OUTPUT]: 对外提供 NavRail 组件：左缘 40px 的模块导航（icon navi）——悬停 150ms ease-snap 展开到 240px 并换成 panel 表面 + 边线 + 阴影（Laper ProjectNavRail），选中即收回；顶部 logo 行（HEADER_HEIGHT）与侧栏卡头部对齐
 * [POS]: shell 的第一层：切换「维度」（浏览器 / 邮件 / 知识库 / 网盘）；模块的侧栏与面板由 modules/registry 决定
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { HEADER_HEIGHT, MODULES, type ModuleId } from '@shared/model';
import { MODULE_ICON } from '../icons';
import { cn } from '../lib/utils';
import { send, useBrowser } from '../store/browser';
import { Tip } from '../components/ui/tooltip';
import { sidebarButtonClass } from '../components/ui/sidebar-button';
import logo from '../assets/logo.png';

export function NavRail() {
  const active = useBrowser((s) => s.snapshot?.layout.module ?? 'browser');
  const [expanded, setExpanded] = useState(false);
  const select = (id: ModuleId) => {
    send({ type: 'module.activate', module: id });
    setExpanded(false);
  };
  return (
    <div className="relative h-full w-10 shrink-0">
      {/* 无 overflow-hidden（会切掉选中卡片的阴影）；折叠态无边框（1px 透明边也会把 32×32 压扁）——Laper 的两条教训 */}
      <div
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          'absolute inset-y-0 left-0 z-5 flex flex-col rounded-r-2xl transition-[width,background-color,box-shadow] duration-150 ease-snap',
          'no-drag',
          expanded ? 'w-60 border border-border bg-panel shadow-lg' : 'w-10 bg-sidebar',
        )}
      >
        {/* ---- logo 行：与侧栏卡头部同高（Laper：mt-px h-12 pl-2，Samo 压到 40） ---- */}
        <div className="mt-px flex shrink-0 items-center pl-2 pr-0" style={{ height: HEADER_HEIGHT }}>
          <span className="flex w-8 shrink-0 items-center justify-center">
            <img src={logo} alt="" width={24} height={24} className="size-6 select-none" draggable={false} />
          </span>
          <span className={cn('truncate pl-1 text-base font-semibold text-foreground transition-opacity duration-100', expanded ? 'opacity-100' : 'opacity-0')}>Samo</span>
        </div>
        <nav className={cn('flex min-h-0 flex-1 flex-col gap-1 pl-2 pt-1', expanded ? 'pr-2' : 'pr-0')}>
          {MODULES.filter((m) => !m.dev || import.meta.env.DEV).map((m) => {
            const Icon = MODULE_ICON[m.id];
            const isActive = m.id === active;
            const button = (
              <button
                key={m.id}
                type="button"
                onClick={() => select(m.id)}
                className={sidebarButtonClass({ active: isActive, className: 'h-8 w-full shrink-0' })}
              >
                <span className="flex w-8 shrink-0 items-center justify-center">
                  <Icon size={18} className={isActive ? 'text-foreground' : 'text-muted-foreground'} />
                </span>
                <span className={cn('min-w-0 flex-1 truncate pr-2 text-base font-semibold text-foreground transition-opacity duration-100', expanded ? 'opacity-100' : 'opacity-0')}>
                  {m.label}
                  {!m.ready && <span className="ml-2 text-xs font-normal text-muted-foreground">Soon</span>}
                </span>
              </button>
            );
            return expanded ? (
              button
            ) : (
              <Tip key={m.id} label={m.label} side="right">
                {button}
              </Tip>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
