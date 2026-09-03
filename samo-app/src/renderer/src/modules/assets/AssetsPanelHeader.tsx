/**
 * [INPUT]: 依赖 ../../store/browser 的 useBrowser/send，../../components/ui/button，../../shell/PanelHeader，./store 的 useAssetsTab/ASSET_TABS
 * [OUTPUT]: 对外提供 AssetsPanelHeader 组件：中 当前 tab 名；右 Clear（下载 tab：清掉已完成/失败项）
 * [POS]: modules/assets 的头部（Laper PanelHeader 三槽）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { PanelHeader } from '../../shell/PanelHeader';
import { ASSET_TABS, useAssetsTab } from './store';

export function AssetsPanelHeader() {
  const tab = useAssetsTab((s) => s.tab);
  const downloads = useBrowser((s) => s.snapshot?.downloads ?? []);
  const label = ASSET_TABS.find((t) => t.id === tab)?.label ?? 'Assets';
  const center = (
    <div className="flex h-7 w-full items-center justify-center rounded-2xl border border-border bg-input px-2.5">
      <span className="truncate text-base text-foreground">{label}</span>
    </div>
  );
  const actions =
    tab === 'downloads' ? (
      <Button variant="ghost" size="small" className="text-muted-foreground" disabled={downloads.length === 0 || downloads.every((d) => d.state === 'progressing')} onClick={() => send({ type: 'download.clear' })}>
        Clear
      </Button>
    ) : null;
  return <PanelHeader title={<span className="w-2" />} center={center} actions={actions} />;
}
