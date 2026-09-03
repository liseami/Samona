/**
 * [INPUT]: 依赖 ../../lib/dnd 的 CONTAINER，../../store/browser 的 useIdentityTabs/useBrowser/selectActiveTabId，./IconGrid
 * [OUTPUT]: 对外提供 PinnedGrid 组件：活动 Identity 内的固定标签网格
 * [POS]: renderer/components/sidebar 的 Identity 固定区，位于收藏之下、标签列表之上
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { CONTAINER } from '../../lib/dnd';
import { selectActiveTabId, useBrowser, useIdentityTabs } from '../../store/browser';
import { IconGrid } from './IconGrid';

export function PinnedGrid() {
  const pinned = useIdentityTabs().filter((t) => t.pinned);
  const activeId = useBrowser(selectActiveTabId);
  return <IconGrid containerId={CONTAINER.pinned} tabs={pinned} activeId={activeId} emptyLabel="Drop here to pin" />;
}
