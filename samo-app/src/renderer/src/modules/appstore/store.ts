/**
 * [INPUT]: 依赖 zustand 的 create，localStorage（samo.appstore.added），./mock 的 STORE_APPS/StoreCategory
 * [OUTPUT]: 对外提供 useAppStore：筛选（filter：all / featured / added / 某分类）、搜索词、已添加集合与 add/remove，以及 visibleApps() 选择器
 * [POS]: modules/appstore 的视图状态；「添加」在接上 Samo 商店与 apps.install 命令之前只落本地（未来：添加 = 安装为用户的 Public/云端应用）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from 'zustand';
import { STORE_APPS, type StoreApp, type StoreCategory } from './mock';

export type StoreFilter = 'all' | 'featured' | 'added' | StoreCategory;

interface AppStoreState {
  filter: StoreFilter;
  query: string;
  added: Record<string, true>;
  setFilter(filter: StoreFilter): void;
  setQuery(query: string): void;
  add(id: string): void;
  remove(id: string): void;
}

const KEY = 'samo.appstore.added';
function load(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, true>;
  } catch {
    return {};
  }
}
function save(added: Record<string, true>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(added));
  } catch {
    /* 私密模式 */
  }
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  filter: 'all',
  query: '',
  added: load(),
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  add: (id) => {
    const added = { ...get().added, [id]: true as const };
    save(added);
    set({ added });
  },
  remove: (id) => {
    const added = { ...get().added };
    delete added[id];
    save(added);
    set({ added });
  },
}));

/** 当前筛选 + 搜索下可见的应用 */
export function visibleApps(state: Pick<AppStoreState, 'filter' | 'query' | 'added'>): StoreApp[] {
  const q = state.query.trim().toLowerCase();
  return STORE_APPS.filter((a) => {
    if (state.filter === 'featured' && !a.featured) return false;
    if (state.filter === 'added' && !state.added[a.id]) return false;
    if (state.filter !== 'all' && state.filter !== 'featured' && state.filter !== 'added' && a.category !== state.filter) return false;
    return !q || `${a.name} ${a.tagline} ${a.author}`.toLowerCase().includes(q);
  });
}
