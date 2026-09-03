/**
 * [INPUT]: 依赖 ../../lib/dnd 的 CONTAINER，../../store/browser 的 useFavorites/useBrowser/selectActiveTabId，./IconGrid
 * [OUTPUT]: 对外提供 FavoritesGrid 组件：跨 Space 常驻的收藏网格（Arc 的 Favorites，Samo 的「App」位）
 * [POS]: renderer/components/sidebar 的顶部网格；spaceId 为 null 的标签在此
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { CONTAINER } from '../../lib/dnd';
import { selectActiveTabId, useBrowser, useFavorites } from '../../store/browser';
import { IconGrid } from './IconGrid';

export function FavoritesGrid() {
  const favorites = useFavorites();
  const activeId = useBrowser(selectActiveTabId);
  return <IconGrid containerId={CONTAINER.favorites} tabs={favorites} activeId={activeId} emptyLabel="Drop here to add to Favorites" />;
}
