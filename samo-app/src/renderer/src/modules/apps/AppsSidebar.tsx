/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry，../../store/browser 的 useBrowser/send，../../icons 的 AppLocal/AppCloud/Refresh，../../components/ui/{sidebar-button,button,tooltip}，../../lib/utils 的 cn，./AppLogo
 * [OUTPUT]: 对外提供 AppsSidebar 组件：应用维度的侧栏——顶部固定区（一排最多 4 个圆角方形 logo）+ 列表（logo + 名称 + 端口/云端），选中态走 SidebarButton 语言；右键原生菜单（固定/在浏览器打开/复制地址/重扫）；空态提示启动 dev server
 * [POS]: modules/apps 的侧栏；固定区即用户的应用位（Samo 的产品主张：vibe coding 的工作台常驻侧栏一键打开）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import type { AppEntry } from '@shared/model';
import { Refresh } from '../../icons';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { cn } from '../../lib/utils';
import { AppLogo } from './AppLogo';

export function AppsSidebar() {
  const apps = useBrowser((s) => s.snapshot?.apps);
  const activeId = useBrowser((s) => s.snapshot?.activeAppId ?? null);
  const pinned = useMemo(() => (apps ?? []).filter((a) => a.pinned), [apps]);
  const rest = useMemo(() => (apps ?? []).filter((a) => !a.pinned), [apps]);
  const menu = (app: AppEntry) => (e: React.MouseEvent) => {
    e.preventDefault();
    send({ type: 'menu.app', id: app.id });
  };
  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-2 pb-2 text-sidebar-foreground scrollbar-hide">
      {pinned.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-2 px-2">
          {pinned.map((app) => (
            <Tip key={app.id} label={app.offline ? `${app.name} · offline` : app.name}>
              <button
                type="button"
                onClick={() => send({ type: 'apps.open', id: app.id })}
                onContextMenu={menu(app)}
                className={sidebarButtonClass({ active: app.id === activeId, className: cn('aspect-square h-auto w-full justify-center p-0', app.offline && 'opacity-45') })}
              >
                <AppLogo app={app} size={22} />
              </button>
            </Tip>
          ))}
        </div>
      )}
      <div className="flex h-7 items-center gap-1.5 px-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Apps</span>
        <span className="text-xs text-muted-foreground/70">{rest.length}</span>
        <div className="flex-1" />
        <Tip label="Rescan localhost">
          <Button variant="icon" className="h-6 w-6 text-muted-foreground" onClick={() => send({ type: 'apps.rescan' })}>
            <Refresh size={13} />
          </Button>
        </Tip>
      </div>
      {rest.length === 0 ? (
        <div className="mx-2 rounded-2xl border border-dashed border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">No app is running on localhost. Start a dev server and it shows up here.</div>
      ) : (
        <div className="flex flex-col gap-0.5 px-2">
          {rest.map((app) => (
            <AppRow key={app.id} app={app} active={app.id === activeId} onContextMenu={menu(app)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 一行应用：logo + 名称 + 端口（本地）或 cloud，选中态与标签行同一语言 */
function AppRow({ app, active, onContextMenu }: { app: AppEntry; active: boolean; onContextMenu: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={() => send({ type: 'apps.open', id: app.id })}
      onContextMenu={onContextMenu}
      title={app.url}
      className={sidebarButtonClass({ active, className: 'h-8 gap-2 py-1 pr-2 pl-2 text-base' })}
    >
      <AppLogo app={app} size={16} />
      <span className="min-w-0 flex-1 truncate text-foreground">{app.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{app.kind === 'local' ? `:${app.port}` : 'cloud'}</span>
    </button>
  );
}
