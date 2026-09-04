/**
 * [INPUT]: 依赖 ../../shell/PanelHeader，./mock 的 STORE_CATEGORIES，./store 的 useAppStore
 * [OUTPUT]: 对外提供 StorePanelHeader 组件：应用商店的面板头部——左 标题，中 当前筛选（All apps / Featured / Added / 分类）
 * [POS]: modules/appstore 的头部（Laper PanelHeader 三槽），无导航按钮：商店不是网页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { PanelHeader } from '../../shell/PanelHeader';
import { STORE_CATEGORIES } from './mock';
import { useAppStore } from './store';

const LABEL: Record<string, string> = { all: 'All apps', featured: 'Featured', added: 'Added' };

export function StorePanelHeader() {
  const filter = useAppStore((s) => s.filter);
  const label = LABEL[filter] ?? STORE_CATEGORIES.find((c) => c.id === filter)?.label ?? 'All apps';
  const center = (
    <div className="flex h-7 w-full items-center justify-center rounded-2xl border border-border bg-input px-2.5">
      <span className="truncate text-base text-foreground">{label}</span>
    </div>
  );
  return <PanelHeader title={<span className="px-2 text-sm font-medium text-foreground">App Store</span>} center={center} />;
}
