/**
 * [INPUT]: 依赖 @dnd-kit/sortable（SortableContext/useSortable/horizontalListSortingStrategy）与 @dnd-kit/utilities 的 CSS，../../icons 的 Plus，../../lib/dnd 的 spaceDragId，../../lib/utils 的 cn，../../store/browser，../ui/tooltip 的 Tip，@shared/model 的 Space/SPACE_COLOR_HEX
 * [OUTPUT]: 对外提供 SpacesStrip 组件：一行可拖拽排序的 Space pip（28px，活动项浮起白卡 + 底部强调色短线），agent Space 带状态角标；pip 也是「拖标签到此 Space」的落点；尾部 + 新建并打开编辑器
 * [POS]: renderer/components/sidebar 的 Space 切换器；双击或右键进入编辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from '../../icons';
import { SPACE_COLOR_HEX, type Space } from '@shared/model';
import { spaceDragId } from '../../lib/dnd';
import { cn } from '../../lib/utils';
import { send, useBrowser } from '../../store/browser';
import { Tip } from '../ui/tooltip';

export function SpacesStrip() {
  const spaces = useBrowser((s) => s.snapshot?.spaces ?? []);
  const activeId = useBrowser((s) => s.snapshot?.activeSpaceId);
  const ids = spaces.map((s) => spaceDragId(s.id));
  return (
    <div className="no-drag flex h-9 shrink-0 items-center gap-1 overflow-x-auto px-2 scrollbar-hide">
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        {spaces.map((space) => (
          <Pip key={space.id} space={space} active={space.id === activeId} />
        ))}
      </SortableContext>
      <Tip label="New space ⇧⌘N">
        <button
          type="button"
          onClick={() => send({ type: 'space.create', name: `Space ${spaces.length + 1}`, edit: true })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/66 hover:text-foreground"
        >
          <Plus size={14} />
        </button>
      </Tip>
    </div>
  );
}

function Pip({ space, active }: { space: Space; active: boolean }) {
  const openEditor = useBrowser((s) => s.openSpaceEditor);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: spaceDragId(space.id) });
  return (
    <Tip label={space.name}>
      <button
        ref={setNodeRef}
        type="button"
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={() => send({ type: 'space.activate', spaceId: space.id })}
        onDoubleClick={() => openEditor(space.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          send({ type: 'menu.space', spaceId: space.id });
        }}
        className={cn(
          'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm leading-none transition-colors duration-200',
          active ? 'border-border bg-card shadow-sm' : 'border-transparent hover:bg-sidebar-accent/66',
          isDragging && 'opacity-50',
          isOver && !isDragging && 'border-primary bg-accent/60',
        )}
      >
        <span>{space.emoji}</span>
        {active && <span className="absolute -bottom-[3px] left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full" style={{ background: SPACE_COLOR_HEX[space.color] }} />}
        <AgentBadge space={space} />
      </button>
    </Tip>
  );
}

/** phi 的角标语义：agent 工作中=绿点，用户接管=橙点，agent 空闲=灰点 */
function AgentBadge({ space }: { space: Space }) {
  if (space.ownership === 'user') return null;
  const color = space.ownership === 'agentDelegatedToUser' ? 'bg-orange-500' : space.agentState ? 'bg-emerald-500' : 'bg-muted-foreground';
  return <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar', color)} />;
}
