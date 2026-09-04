/**
 * [INPUT]: 依赖 react，../../components/ui/sidebar-button 的 sidebarButtonClass，./mock 的 STORE_APPS/STORE_CATEGORIES，./store 的 useAppStore/StoreFilter
 * [OUTPUT]: 对外提供 StoreSidebar 组件：应用商店的侧栏——Discover（All / Featured / Added，带计数）+ Categories 分组（各分类计数）；行与标签行同一选中语言
 * [POS]: modules/appstore 的侧栏：只负责筛选，陈列在面板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { STORE_APPS, STORE_CATEGORIES } from './mock';
import { useAppStore, type StoreFilter } from './store';

export function StoreSidebar() {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const added = useAppStore((s) => s.added);
  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const a of STORE_APPS) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    return { all: STORE_APPS.length, featured: STORE_APPS.filter((a) => a.featured).length, added: Object.keys(added).length, byCategory };
  }, [added]);

  const Row = ({ id, label, count }: { id: StoreFilter; label: string; count: number }) => (
    <button type="button" onClick={() => setFilter(id)} className={sidebarButtonClass({ active: filter === id, className: 'h-8 gap-2 px-2.5 text-base' })}>
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>
    </button>
  );

  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-2 pb-2 text-sidebar-foreground scrollbar-hide">
      <Group label="Discover">
        <Row id="all" label="All apps" count={counts.all} />
        <Row id="featured" label="Featured" count={counts.featured} />
        <Row id="added" label="Added" count={counts.added} />
      </Group>
      <Group label="Categories">
        {STORE_CATEGORIES.map((c) => (
          <Row key={c.id} id={c.id} label={c.label} count={counts.byCategory[c.id] ?? 0} />
        ))}
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex h-7 items-center px-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2">{children}</div>
    </div>
  );
}
