/**
 * [INPUT]: 依赖 react，@shared/model 的 AppEntry，../../store/browser 的 useBrowser/send，../../components/ui/button，../../icons 的 Copy/Settings，../../lib/utils 的 cn，./AppLogo，./mock
 * [OUTPUT]: 对外提供 AppsDashboard 组件：应用维度的桌面——居中的一列：用户主页（头像 + 名字 + 句柄 + Share/Edit）→ Apps（用户的作品：Local / Private / Public 三组 OS 桌面式图标，角标标可见性，点击即开）→ 四项指标 → 一年活跃度点阵热力图 → Tokens 面积图 → Agents 柱图；数据来自 mock
 * [POS]: modules/apps 的默认面板（没有打开应用时）；图表用内联 SVG，配色只用中性灰（银灰范式）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { APP_VISIBILITIES, type AppEntry, type AppVisibility } from '@shared/model';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Copy, Settings } from '../../icons';
import { cn } from '../../lib/utils';
import { AppLogo, VISIBILITY_ICON } from './AppLogo';
import { MOCK_AGENTS, MOCK_PROFILE, MOCK_STATS, MOCK_TOKENS, MONTHS, mockHeatmap } from './mock';

export function AppsDashboard() {
  const apps = useBrowser((s) => s.snapshot?.apps);
  return (
    <div className="no-drag h-full w-full overflow-y-auto scrollbar-hide">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-12 px-8 py-12">
        <ProfileHeader />
        <AppsSection apps={apps ?? []} />
        <StatsRow />
        <Heatmap />
        <AreaChart />
        <BarChart />
      </div>
    </div>
  );
}

// ---- 应用 = 用户的作品：按可见性三组（像 git 仓库），每组是一行 OS 桌面式图标 ----
const EMPTY_HINT: Record<AppVisibility, string> = {
  local: 'Nothing running on localhost — start a dev server and it appears here.',
  private: 'Deploy an app with Samo and it lives here, only for you.',
  public: 'Publish an app with Samo and share the link.',
};
function AppsSection({ apps }: { apps: AppEntry[] }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="text-sm font-medium text-muted-foreground">Apps</div>
      {APP_VISIBILITIES.map((v) => {
        const list = apps.filter((a) => a.visibility === v.id);
        const Icon = VISIBILITY_ICON[v.id];
        return (
          <div key={v.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon size={12} />
              <span className="font-medium tracking-wide uppercase">{v.label}</span>
              <span className="text-muted-foreground/70">{list.length}</span>
              <span className="ml-1 text-muted-foreground/70">· {v.hint}</span>
            </div>
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">{EMPTY_HINT[v.id]}</div>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-4">
                {list.map((app) => (
                  <AppTile key={app.id} app={app} Badge={Icon} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function AppTile({ app, Badge }: { app: AppEntry; Badge: (typeof VISIBILITY_ICON)[AppVisibility] }) {
  return (
    <button
      type="button"
      onClick={() => !app.offline && send({ type: 'apps.open', id: app.id })}
      onContextMenu={(e) => {
        e.preventDefault();
        send({ type: 'menu.app', id: app.id });
      }}
      title={app.url}
      className={cn('group flex w-[84px] flex-col items-center gap-2 rounded-2xl px-1 py-2 transition-colors duration-300 ease-out hover:bg-sidebar-accent/66', app.offline && 'opacity-45')}
    >
      <span className="relative rounded-2xl border border-border bg-card p-1.5 shadow-sm transition-transform duration-200 ease-out group-hover:scale-[1.04] group-active:scale-[0.97]">
        <AppLogo app={app} size={44} />
        {/* 可见性角标：像 git 仓库的 lock / globe */}
        <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs">
          <Badge size={9} />
        </span>
      </span>
      <span className="w-full truncate text-center text-xs text-foreground">{app.name}</span>
    </button>
  );
}

// ---- 用户主页 ----
function ProfileHeader() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <span className="text-lg leading-none font-bold tracking-tight">{MOCK_PROFILE.initials}</span>
        <span className="mt-1 text-[8px] leading-none opacity-70">{MOCK_PROFILE.since}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-semibold text-foreground">{MOCK_PROFILE.name}</div>
        <div className="truncate text-sm text-muted-foreground">{MOCK_PROFILE.handle}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="medium">
          <Copy size={13} /> Share
        </Button>
        <Button variant="secondary" size="medium">
          <Settings size={13} /> Edit
        </Button>
      </div>
    </div>
  );
}

function StatsRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {MOCK_STATS.map((s) => (
        <div key={s.label} className={cn('flex flex-col gap-1.5', 'muted' in s && s.muted && 'opacity-40')}>
          <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
          <span className="text-2xl font-medium tracking-tight text-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---- 热力图：53 周 × 7 天的点阵，月份在上、周几在左 ----
const LEVEL_CLASS = ['bg-foreground/8', 'bg-foreground/28', 'bg-foreground/55', 'bg-foreground/85'];
function Heatmap() {
  const cells = useMemo(() => mockHeatmap(), []);
  return (
    <div className="flex flex-col gap-2">
      <div className="ml-6 grid text-xs text-muted-foreground" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="grid shrink-0 grid-rows-7 text-xs text-muted-foreground" style={{ width: 16 }}>
          {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
            <span key={i} className="flex items-center">{d}</span>
          ))}
        </div>
        <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: 'repeat(53, 1fr)', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
          {cells.map((c) => (
            <span key={`${c.week}-${c.day}`} className={cn('aspect-square rounded-full', LEVEL_CLASS[c.level])} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- 面积图 / 柱图：内联 SVG，viewBox 归一化 ----
function usePath(series: number[], w: number, h: number) {
  return useMemo(() => {
    const max = Math.max(1, ...series);
    const step = w / (series.length - 1);
    const pts = series.map((v, i) => [i * step, h - (v / max) * h] as const);
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L${w},${h} L0,${h} Z` };
  }, [series, w, h]);
}

function AreaChart() {
  const W = 640;
  const H = 180;
  const { line, area } = usePath(MOCK_TOKENS.series, W, H);
  return (
    <section className="flex flex-col gap-3">
      <div className="text-sm font-medium text-muted-foreground">Tokens</div>
      <div className="text-2xl font-medium tracking-tight text-foreground">{MOCK_TOKENS.total} tokens</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-[180px] w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d={area} className="fill-foreground/10" />
        <path d={line} className="fill-none stroke-foreground/80" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1="0" y1={H} x2={W} y2={H} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{MOCK_TOKENS.from}</span>
        <span>{MOCK_TOKENS.to}</span>
      </div>
    </section>
  );
}

function BarChart() {
  const max = Math.max(1, ...MOCK_AGENTS.series);
  return (
    <section className="flex flex-col gap-3">
      <div className="text-sm font-medium text-muted-foreground">Agents</div>
      <div className="text-2xl font-medium tracking-tight text-foreground">{MOCK_AGENTS.total} agents</div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-foreground/35" /> Local ({MOCK_AGENTS.local})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-foreground/85" /> Cloud ({MOCK_AGENTS.cloud})
        </span>
      </div>
      <div className="mt-2 flex h-[160px] items-end gap-[3px] border-b border-border">
        {MOCK_AGENTS.series.map((v, i) => (
          <span key={i} className={cn('flex-1 rounded-t-sm', v ? 'bg-foreground/35' : 'bg-foreground/6')} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{MOCK_AGENTS.from}</span>
        <span>{MOCK_AGENTS.to}</span>
      </div>
    </section>
  );
}
