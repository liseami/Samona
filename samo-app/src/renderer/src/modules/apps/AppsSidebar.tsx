/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry/APP_VISIBILITIES，../../store/browser 的 useBrowser/send，../../icons 的 Refresh，../../components/ui/{sidebar-button,button,tooltip}，../../lib/utils 的 cn，./AppLogo
 * [OUTPUT]: 对外提供 AppsSidebar 组件：应用维度的侧栏——顶部固定区（一排最多 4 个圆角方形 logo）+ 按可见性分组的列表（Local / Private / Public，像 git 仓库），行 = logo + 名称 + 端口或可见性；右键原生菜单（固定/复制地址/重扫）；空组给出去处
 * [POS]: modules/apps 的侧栏；固定区即用户的应用位（Samo 的产品主张：vibe coding 的工作台常驻侧栏一键打开）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { APP_VISIBILITIES, type AppEntry, type AppVisibility } from '@shared/model';
import { Refresh } from '../../icons';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { cn } from '../../lib/utils';
import { AppLogo, VISIBILITY_ICON } from './AppLogo';

const EMPTY_HINT: Record<AppVisibility, string> = {
  local: 'No app is running on localhost. Start a dev server and it shows up here.',
  private: 'Deploy an app with Samo and it lives here, only for you.',
  public: 'Publish an app with Samo and share the link.',
};

export function AppsSidebar() {
  const apps = useBrowser((s) => s.snapshot?.apps);
  const activeId = useBrowser((s) => s.snapshot?.activeAppId ?? null);
  const pinned = useMemo(() => (apps ?? []).filter((a) => a.pinned), [apps]);
  const groups = useMemo(() => APP_VISIBILITIES.map((v) => ({ ...v, apps: (apps ?? []).filter((a) => !a.pinned && a.visibility === v.id) })), [apps]);
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
      {groups.map((g, i) => {
        const Icon = VISIBILITY_ICON[g.id];
        return (
          <div key={g.id} className="mb-2">
            <div className="flex h-7 items-center gap-1.5 px-3">
              <Icon size={12} className="text-muted-foreground" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</span>
              <span className="text-xs text-muted-foreground/70">{g.apps.length}</span>
              <div className="flex-1" />
              {i === 0 && (
                <Tip label="Rescan localhost">
                  <Button variant="icon" className="h-6 w-6 text-muted-foreground" onClick={() => send({ type: 'apps.rescan' })}>
                    <Refresh size={13} />
                  </Button>
                </Tip>
              )}
            </div>
            {g.apps.length === 0 ? (
              <div className="mx-2 rounded-2xl border border-dashed border-border px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">{EMPTY_HINT[g.id]}</div>
            ) : (
              <div className="flex flex-col gap-0.5 px-2">
                {g.apps.map((app) => (
                  <AppRow key={app.id} app={app} active={app.id === activeId} onContextMenu={menu(app)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 一行应用：logo + 名称 + 端口（本地）或可见性，选中态与标签行同一语言 */
function AppRow({ app, active, onContextMenu }: { app: AppEntry; active: boolean; onContextMenu: (e: React.MouseEvent) => void }) {
  return (
    <button type="button" onClick={() => send({ type: 'apps.open', id: app.id })} onContextMenu={onContextMenu} title={app.url} className={sidebarButtonClass({ active, className: 'h-8 gap-2 py-1 pr-2 pl-2 text-base' })}>
      <AppLogo app={app} size={16} />
      <span className="min-w-0 flex-1 truncate text-foreground">{app.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{app.visibility === 'local' ? `:${app.port}` : app.visibility}</span>
    </button>
  );
}
