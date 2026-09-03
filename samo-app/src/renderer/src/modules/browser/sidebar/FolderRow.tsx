/**
 * [INPUT]: 依赖 @dnd-kit/core 的 useDroppable，@dnd-kit/sortable（SortableContext/verticalListSortingStrategy），../../icons 的 ChevronRight/Folder，../../lib/dnd 的 folderContainerId/folderHeadId/tabDragId，../../lib/utils 的 cn，../../store/browser，./TabItem，./InlineEdit，@shared/model 的 Folder/Tab/IDENTITY_COLOR_HEX
 * [OUTPUT]: 对外提供 FolderRow 组件：文件夹头（折叠箭头 + 着色文件夹图标 + 名称/内联重命名 + 计数；本身是落点）+ 成员标签的排序上下文（缩进一级）
 * [POS]: renderer/components/sidebar 的分组单元，TabList 为每个文件夹渲染一个
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronRight, Folder as FolderIcon } from '../../../icons';
import { IDENTITY_COLOR_HEX, type Folder, type Tab } from '@shared/model';
import { folderContainerId, folderHeadId, tabDragId } from '../../../lib/dnd';
import { cn } from '../../../lib/utils';
import { send, useBrowser } from '../../../store/browser';
import { InlineEdit } from './InlineEdit';
import { TabItem } from './TabItem';

export function FolderRow({ folder, tabs, activeId }: { folder: Folder; tabs: Tab[]; activeId: string | null }) {
  const rename = useBrowser((s) => s.rename);
  const requestRename = useBrowser((s) => s.requestRename);
  const renaming = rename?.value.kind === 'folder' && rename.value.id === folder.id;
  const head = useDroppable({ id: folderHeadId(folder.id) });
  const body = useDroppable({ id: folderContainerId(folder.id) });
  const color = folder.color === 'grey' ? undefined : IDENTITY_COLOR_HEX[folder.color];
  const containsActive = tabs.some((t) => t.id === activeId);

  return (
    <div className="mb-0.5">
      <div
        ref={head.setNodeRef}
        role="button"
        tabIndex={0}
        onClick={() => !renaming && send({ type: 'folder.update', folderId: folder.id, collapsed: !folder.collapsed })}
        onDoubleClick={() => requestRename('folder', folder.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          send({ type: 'menu.folder', folderId: folder.id });
        }}
        className={cn(
          'no-drag flex h-7 cursor-default items-center gap-1.5 rounded-lg border border-transparent pl-1 pr-2 text-base transition-colors duration-200 hover:bg-sidebar-accent/66',
          head.isOver && 'border-primary bg-accent/60',
          folder.collapsed && containsActive && 'text-foreground',
        )}
      >
        <ChevronRight size={13} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', !folder.collapsed && 'rotate-90')} />
        <FolderIcon size={14} className="shrink-0" color={color ?? 'var(--muted-foreground)'} />
        {renaming ? (
          <InlineEdit
            value={folder.name}
            onCommit={(v) => {
              send({ type: 'folder.update', folderId: folder.id, name: v.trim() || folder.name });
              useBrowser.setState({ rename: null });
            }}
            onCancel={() => useBrowser.setState({ rename: null })}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{folder.name}</span>
        )}
        <span className="text-xs text-muted-foreground">{tabs.length}</span>
      </div>
      {!folder.collapsed && (
        <div ref={body.setNodeRef} className={cn('flex flex-col gap-0.5 rounded-lg', body.isOver && 'bg-accent/30')}>
          <SortableContext items={tabs.map((t) => tabDragId(t.id))} strategy={verticalListSortingStrategy}>
            {tabs.map((tab) => (
              <TabItem key={tab.id} tab={tab} active={tab.id === activeId} indent />
            ))}
          </SortableContext>
          {tabs.length === 0 && <div className="h-2" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}
