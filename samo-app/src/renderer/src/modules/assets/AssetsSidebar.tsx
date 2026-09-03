/**
 * [INPUT]: 依赖 ../../store/browser 的 useBrowser，../../icons 的 Download/Sparkle，../../components/ui/sidebar-button，./store 的 useAssetsTab/ASSET_TABS
 * [OUTPUT]: 对外提供 AssetsSidebar 组件：资产的两个 tab（Downloads / Generated）作侧栏行，带计数与进行中脉冲点
 * [POS]: modules/assets 的侧栏；tab 区分资产来源，面板陈列
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Download, SparkleIcon } from '../../icons';
import { useBrowser } from '../../store/browser';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { ASSET_TABS, useAssetsTab } from './store';

export function AssetsSidebar() {
  const tab = useAssetsTab((s) => s.tab);
  const setTab = useAssetsTab((s) => s.setTab);
  const downloads = useBrowser((s) => s.snapshot?.downloads ?? []);
  const busy = downloads.some((d) => d.state === 'progressing');
  const counts = { downloads: downloads.length, generated: 0 };
  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col pt-2 pb-2 text-sidebar-foreground">
      <div className="flex h-7 items-center gap-1.5 px-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Assets</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {ASSET_TABS.map((t) => {
          const Icon = t.id === 'downloads' ? Download : SparkleIcon;
          const active = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={sidebarButtonClass({ active, className: 'h-10 gap-2 py-1 pr-2 pl-2 text-base' })}>
              <span className="relative flex w-5 shrink-0 items-center justify-center">
                <Icon size={15} className={active ? 'text-foreground' : 'text-muted-foreground'} />
                {t.id === 'downloads' && busy && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-agent" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="w-full truncate leading-tight text-foreground">{t.label}</span>
                <span className="w-full truncate text-xs leading-tight text-muted-foreground">{t.hint}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
