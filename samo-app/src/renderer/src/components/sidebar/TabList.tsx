/**
 * [INPUT]: 依赖 @dnd-kit/core 的 useDroppable，@dnd-kit/sortable（SortableContext/verticalListSortingStrategy），../../icons 的 Plus/Eraser，../../lib/dnd 的 CONTAINER/tabDragId，../../lib/utils 的 cn，../../store/browser，./FolderRow，./TabItem，../ui/tooltip 的 Tip
 * [OUTPUT]: 对外提供 TabList 组件：活动 Space 的主体——文件夹（各自排序上下文）→ 分隔线（悬停出现 Clear = 关闭全部非固定）→ 散装标签排序上下文 → 末尾 New Tab 行；空白处右键原生菜单
 * [POS]: renderer/components/sidebar 的滚动主体，占据剩余高度
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Eraser, Plus } from '../../icons';
import { CONTAINER, tabDragId } from '../../lib/dnd';
import { cn } from '../../lib/utils';
import { selectActiveTabId, send, useBrowser, useSpaceFolders, useSpaceTabs } from '../../store/browser';
import { FolderRow } from './FolderRow';
import { TabItem } from './TabItem';
import { Tip } from '../ui/tooltip';

export function TabList() {
  const spaceId = useBrowser((s) => s.snapshot?.activeSpaceId ?? 0);
  const tabs = useSpaceTabs();
  const folders = useSpaceFolders();
  const activeId = useBrowser(selectActiveTabId);
  const requestOmnibox = useBrowser((s) => s.requestOmnibox);
  const loose = tabs.filter((t) => !t.pinned && !t.folderId);
  const hasPinned = tabs.some((t) => t.pinned);
  const { setNodeRef, isOver } = useDroppable({ id: CONTAINER.loose });

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-1"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          send({ type: 'menu.tabList', spaceId });
        }
      }}
    >
      {folders.map((folder) => (
        <FolderRow key={folder.id} folder={folder} tabs={tabs.filter((t) => t.folderId === folder.id)} activeId={activeId} />
      ))}

      {(hasPinned || folders.length > 0) && (
        <div className="group/divider my-1 flex h-4 items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border" />
          {loose.length > 0 && (
            <Tip label="Close all unpinned tabs ⇧⌘W">
              <button
                type="button"
                onClick={() => send({ type: 'tab.closeUnpinned', spaceId })}
                className="flex h-4 items-center gap-1 rounded px-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/divider:opacity-100"
              >
                <Eraser size={11} /> Clear
              </button>
            </Tip>
          )}
        </div>
      )}

      <div ref={setNodeRef} className={cn('flex flex-1 flex-col gap-0.5 rounded-lg transition-colors', isOver && 'bg-accent/30')}>
        <SortableContext items={loose.map((t) => tabDragId(t.id))} strategy={verticalListSortingStrategy}>
          {loose.map((tab) => (
            <TabItem key={tab.id} tab={tab} active={tab.id === activeId} />
          ))}
        </SortableContext>
        <button
          type="button"
          onClick={() => requestOmnibox('newTab')}
          className="no-drag flex h-8 shrink-0 items-center gap-2 rounded-lg border border-transparent pl-2 pr-1 text-base text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/66 hover:text-foreground"
        >
          <Plus size={15} className="shrink-0" />
          <span>New Tab</span>
        </button>
        <div className="min-h-6 flex-1" onContextMenu={(e) => { e.preventDefault(); send({ type: 'menu.tabList', spaceId }); }} />
      </div>
    </div>
  );
}
