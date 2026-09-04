/**
 * [INPUT]: 依赖 react，../../components/ui/input 的 Input，../../icons 的 Search，./mock 的 STORE_CATEGORIES/StoreApp，./store 的 useAppStore/visibleApps，./StoreLogo 的 StoreLogo/AddButton
 * [OUTPUT]: 对外提供 StorePanel 组件：应用商店的面板——与应用桌面同一居中列（max-w 720）：页头（标题 + 一句话 + 搜索）→ Featured 三张精选卡 → 按分类分组的列表卡（行 = logo + 名称/一句话 + 作者 · 安装量 · 评分 + 右侧 Add）；筛选/搜索为空时给出去处
 * [POS]: modules/appstore 的面板；数据来自 mock，「添加」落在本地状态（未来 = 安装为用户的应用）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { Input } from '../../components/ui/input';
import { Search } from '../../icons';
import { STORE_CATEGORIES, type StoreApp } from './mock';
import { useAppStore, visibleApps } from './store';
import { AddButton, StoreLogo } from './StoreLogo';

export function StorePanel() {
  const filter = useAppStore((s) => s.filter);
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const added = useAppStore((s) => s.added);
  const apps = useMemo(() => visibleApps({ filter, query, added }), [filter, query, added]);
  const showFeatured = filter === 'all' && !query.trim();
  const groups = useMemo(() => {
    if (filter !== 'all') return [{ id: filter, label: filter === 'featured' ? 'Featured' : filter === 'added' ? 'Added' : STORE_CATEGORIES.find((c) => c.id === filter)!.label, apps }];
    return STORE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, apps: apps.filter((a) => a.category === c.id) })).filter((g) => g.apps.length > 0);
  }, [filter, apps]);

  return (
    <div className="no-drag h-full w-full overflow-y-auto scrollbar-hide">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-8 py-12">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">App Store</h1>
            <p className="mt-1 text-sm text-muted-foreground">Apps built with Samo, by people like you. Add one and it lives in your sidebar.</p>
          </div>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps" className="h-9 rounded-2xl pl-8" />
          </div>
        </header>

        {showFeatured && <Featured apps={apps.filter((a) => a.featured)} />}

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {filter === 'added' ? 'Nothing added yet — pick an app and press Add.' : 'No app matches. Try another word.'}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium tracking-wide uppercase">{g.label}</span>
                <span className="text-muted-foreground/70">{g.apps.length}</span>
              </div>
              <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
                {g.apps.map((app) => (
                  <StoreRow key={app.id} app={app} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

// ---- 精选：三张卡 ----
function Featured({ apps }: { apps: StoreApp[] }) {
  if (apps.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-medium tracking-wide uppercase">Featured</span>
        <span className="text-muted-foreground/70">{apps.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {apps.slice(0, 3).map((app) => (
          <div key={app.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <StoreLogo app={app} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{app.name}</div>
              <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{app.tagline}</div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">{app.installs}</span>
              <AddButton app={app} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- 列表行：右侧永远是 Add ----
function StoreRow({ app }: { app: StoreApp }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <StoreLogo app={app} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{app.name}</div>
        <div className="truncate text-xs text-muted-foreground">{app.tagline}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground/70">
          {app.author} · {app.installs} · {app.rating.toFixed(1)}
        </div>
      </div>
      <AddButton app={app} />
    </div>
  );
}
