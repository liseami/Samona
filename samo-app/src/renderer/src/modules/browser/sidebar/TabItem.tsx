/**
 * [INPUT]: 依赖 @dnd-kit/sortable 的 useSortable 与 @dnd-kit/utilities 的 CSS，icons 语义图标，../../lib/dnd 的 tabDragId，../../lib/utils 的 cn，../../store/browser，./Favicon，./InlineEdit，@shared/model 的 Tab/tabTitle
 * [OUTPUT]: 对外提供 TabItem 组件：32px 标签行（Laper 密度）——favicon/标题/声音/加载/悬停关闭；活动态浮起白卡，悬停 sidebar-accent；可拖拽；双击或主进程事件进入内联重命名；中键关闭；右键原生菜单
 * [POS]: renderer/components/sidebar 的标签行原子，TabList 与 FolderRow 逐行渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Spinner, VolumeOn, VolumeMute, Close } from '../../../icons';
import { tabTitle, type Tab } from '@shared/model';
import { tabDragId } from '../../../lib/dnd';
import { cn } from '../../../lib/utils';
import { send, useBrowser } from '../../../store/browser';
import { Favicon } from './Favicon';
import { InlineEdit } from './InlineEdit';

export function TabItem({ tab, active, indent = false }: { tab: Tab; active: boolean; indent?: boolean }) {
  const rename = useBrowser((s) => s.rename);
  const requestRename = useBrowser((s) => s.requestRename);
  const renaming = rename?.value.kind === 'tab' && rename.value.id === tab.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tabDragId(tab.id) });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      title={tab.url}
      onClick={() => !renaming && send({ type: 'tab.activate', tabId: tab.id })}
      onDoubleClick={() => requestRename('tab', tab.id)}
      onAuxClick={(e) => {
        if (e.button === 1) send({ type: 'tab.close', tabId: tab.id });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        send({ type: 'menu.tab', tabId: tab.id });
      }}
      className={cn(
        'group no-drag flex h-8 cursor-default items-center gap-2 rounded-lg border py-1 pl-2 pr-1 text-base transition-colors duration-200',
        active ? 'border-border bg-card shadow-sm' : 'border-transparent hover:bg-sidebar-accent/66',
        isDragging && 'opacity-50',
        indent && 'ml-4',
      )}
    >
      <Favicon tab={tab} />
      {renaming ? (
        <InlineEdit
          value={tabTitle(tab)}
          onCommit={(v) => {
            send({ type: 'tab.rename', tabId: tab.id, title: v });
            useBrowser.setState({ rename: null });
          }}
          onCancel={() => useBrowser.setState({ rename: null })}
        />
      ) : (
        <span className={cn('min-w-0 flex-1 truncate text-foreground', tab.discarded && !active && 'text-muted-foreground')}>{tabTitle(tab)}</span>
      )}
      {tab.loading && <Spinner size={13} className="shrink-0 animate-spin text-muted-foreground" />}
      {(tab.audible || tab.muted) && (
        <button
          type="button"
          aria-label={tab.muted ? 'Unmute' : 'Mute'}
          onClick={(e) => {
            e.stopPropagation();
            send({ type: 'tab.mute', tabId: tab.id, muted: !tab.muted });
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          {tab.muted ? <VolumeMute size={13} /> : <VolumeOn size={13} />}
        </button>
      )}
      <button
        type="button"
        aria-label="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          send({ type: 'tab.close', tabId: tab.id });
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent/60 hover:text-foreground group-hover:opacity-100"
      >
        <Close size={13} />
      </button>
    </div>
  );
}
