/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry，../../store/browser 的 useBrowser/send，../../icons 的 AppLocal/AppCloud/Refresh，../../components/ui/{sidebar-button,button,tooltip}，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 AppsSidebar 组件：应用维度的侧栏——「Local」与「Cloud」两组，每组一排两张卡（图标 + 名称 + 地址），选中态走 SidebarButton 语言；右上角重扫；空态提示启动一个 dev server
 * [POS]: modules/apps 的侧栏；卡片即用户的应用位（Samo 的产品主张：vibe coding 的工作台常驻侧栏一键打开）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import type { AppEntry } from '@shared/model';
import { AppCloud, AppLocal, Refresh } from '../../icons';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { cn } from '../../lib/utils';

export function AppsSidebar() {
  const apps = useBrowser((s) => s.snapshot?.apps);
  const activeId = useBrowser((s) => s.snapshot?.activeAppId ?? null);
  const local = useMemo(() => (apps ?? []).filter((a) => a.kind === 'local'), [apps]);
  const cloud = useMemo(() => (apps ?? []).filter((a) => a.kind === 'cloud'), [apps]);
  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-2 pb-2 text-sidebar-foreground scrollbar-hide">
      <Section title="Local" count={local.length} action={
        <Tip label="Rescan localhost">
          <Button variant="icon" className="h-6 w-6 text-muted-foreground" onClick={() => send({ type: 'apps.rescan' })}>
            <Refresh size={13} />
          </Button>
        </Tip>
      }>
        {local.length === 0 ? (
          <Empty>No app is running on localhost. Start a dev server and it shows up here.</Empty>
        ) : (
          <Grid>
            {local.map((app) => (
              <AppCard key={app.id} app={app} active={app.id === activeId} />
            ))}
          </Grid>
        )}
      </Section>
      <Section title="Cloud" count={cloud.length}>
        {cloud.length === 0 ? <Empty>Apps deployed by Samo will live here.</Empty> : (
          <Grid>
            {cloud.map((app) => (
              <AppCard key={app.id} app={app} active={app.id === activeId} />
            ))}
          </Grid>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex h-7 items-center gap-1.5 px-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
        <span className="text-xs text-muted-foreground/70">{count}</span>
        <div className="flex-1" />
        {action}
      </div>
      {children}
    </div>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-2 px-2">{children}</div>;
const Empty = ({ children }: { children: React.ReactNode }) => <div className="mx-2 rounded-2xl border border-dashed border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">{children}</div>;

/** 一张应用卡：本地 = 终端图标，云端 = 云图标；选中态与侧栏行同一语言 */
function AppCard({ app, active }: { app: AppEntry; active: boolean }) {
  const Icon = app.kind === 'local' ? AppLocal : AppCloud;
  const sub = app.kind === 'local' ? `localhost:${app.port}` : 'cloud';
  return (
    <button
      type="button"
      onClick={() => send({ type: 'apps.open', id: app.id })}
      title={`${app.name} · ${app.url}`}
      className={sidebarButtonClass({ active, className: cn('h-auto flex-col items-start gap-1.5 px-2.5 py-2.5 text-left') })}
    >
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card', active ? 'text-foreground' : 'text-muted-foreground')}>
        <Icon size={15} />
      </span>
      <span className="w-full truncate text-base leading-tight text-foreground">{app.name}</span>
      <span className="w-full truncate text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}
