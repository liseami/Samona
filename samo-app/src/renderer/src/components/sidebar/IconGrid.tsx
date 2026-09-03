/**
 * [INPUT]: 依赖 @dnd-kit/core 的 useDroppable，@dnd-kit/sortable（SortableContext/useSortable/rectSortingStrategy）与 @dnd-kit/utilities 的 CSS，../../lib/dnd 的 tabDragId/parseDndId，../../lib/utils 的 cn，../../store/browser 的 send，./Favicon，../ui/tooltip 的 Tip，./Sidebar 的 useDragging，@shared/model 的 Tab/tabTitle
 * [OUTPUT]: 对外提供 IconGrid 组件：收藏/固定共用的图标网格（自动填充 44px 格、可拖拽排序、整块是落点、拖标签时显示空态虚线落点）
 * [POS]: renderer/components/sidebar 的网格原子，FavoritesGrid 与 PinnedGrid 只是给它不同的容器 id 与标签集合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tabTitle, type Tab } from '@shared/model';
import { parseDndId, tabDragId } from '../../lib/dnd';
import { cn } from '../../lib/utils';
import { send } from '../../store/browser';
import { Tip } from '../ui/tooltip';
import { Favicon } from './Favicon';
import { useDragging } from './Sidebar';

export function IconGrid({ containerId, tabs, activeId, emptyLabel }: { containerId: string; tabs: Tab[]; activeId: string | null; emptyLabel: string }) {
  const dragging = useDragging();
  const draggingTab = dragging ? parseDndId(dragging)?.kind === 'tab' : false;
  const { setNodeRef, isOver } = useDroppable({ id: containerId });
  if (tabs.length === 0 && !draggingTab) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn('no-drag mx-2 mb-1 grid gap-1.5 rounded-lg p-0.5 transition-colors', isOver && 'bg-accent/30')}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}
    >
      <SortableContext items={tabs.map((t) => tabDragId(t.id))} strategy={rectSortingStrategy}>
        {tabs.map((tab) => (
          <Cell key={tab.id} tab={tab} active={tab.id === activeId} />
        ))}
      </SortableContext>
      {tabs.length === 0 && <div className="col-span-full h-9 rounded-lg border border-dashed border-border text-center text-xs leading-9 text-muted-foreground">{emptyLabel}</div>}
    </div>
  );
}

function Cell({ tab, active }: { tab: Tab; active: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tabDragId(tab.id) });
  return (
    <Tip label={tabTitle(tab)}>
      <button
        ref={setNodeRef}
        type="button"
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={() => send({ type: 'tab.activate', tabId: tab.id })}
        onAuxClick={(e) => {
          if (e.button === 1) send({ type: 'tab.close', tabId: tab.id });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          send({ type: 'menu.tab', tabId: tab.id });
        }}
        className={cn(
          'flex h-9 items-center justify-center rounded-lg border transition-colors duration-200',
          active ? 'border-border bg-card shadow-sm' : 'border-transparent bg-background/40 hover:bg-sidebar-accent/66',
          isDragging && 'opacity-50',
          tab.discarded && !active && 'opacity-60',
        )}
      >
        <Favicon tab={tab} size={18} />
      </button>
    </Tip>
  );
}
