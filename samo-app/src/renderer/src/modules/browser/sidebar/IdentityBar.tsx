/**
 * [INPUT]: 依赖 @dnd-kit/sortable（SortableContext/useSortable/horizontalListSortingStrategy）与 @dnd-kit/utilities 的 CSS，../../icons 的 IDENTITY_ICON/Plus/Bug，../../lib/dnd 的 identityDragId，../../lib/utils 的 cn，../../store/browser，../ui/{tooltip,button}，./DownloadsPopover，@shared/model 的 Identity/IDENTITY_COLOR_HEX
 * [OUTPUT]: 对外提供 IdentityBar 组件：侧栏底部一行——身份 pip（Pika 图标，可拖排序，活动项浮起白卡 + 强调色短线，agent 角标；pip 也是「拖标签到此身份」的落点）+ 新建身份；右侧下载与 DevTools
 * [POS]: renderer/components/sidebar 的身份切换器与底栏（合一）；双击或右键进入编辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IDENTITY_COLOR_HEX, type Identity } from '@shared/model';
import { Bug, IDENTITY_ICON, Plus } from '../../../icons';
import { identityDragId } from '../../../lib/dnd';
import { cn } from '../../../lib/utils';
import { send, useBrowser } from '../../../store/browser';
import { Button } from '../../../components/ui/button';
import { Tip } from '../../../components/ui/tooltip';
import { DownloadsPopover } from './DownloadsPopover';

export function IdentityBar() {
  const identities = useBrowser((s) => s.snapshot?.identities ?? []);
  const activeId = useBrowser((s) => s.snapshot?.activeIdentityId);
  const ids = identities.map((i) => identityDragId(i.id));
  return (
    <div className="no-drag flex h-11 shrink-0 items-center gap-1 border-t border-border/60 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          {identities.map((identity) => (
            <Pip key={identity.id} identity={identity} active={identity.id === activeId} />
          ))}
        </SortableContext>
        <Tip label="New identity ⇧⌘N">
          <button
            type="button"
            onClick={() => send({ type: 'identity.create', name: `Identity ${identities.length + 1}`, edit: true })}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/66 hover:text-foreground"
          >
            <Plus size={14} />
          </button>
        </Tip>
      </div>
      <DownloadsPopover />
      <Tip label="Developer tools ⌥⌘I">
        <Button size="icon" onClick={() => send({ type: 'shell.openDevTools' })}>
          <Bug size={14} />
        </Button>
      </Tip>
    </div>
  );
}

function Pip({ identity, active }: { identity: Identity; active: boolean }) {
  const openEditor = useBrowser((s) => s.openIdentityEditor);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: identityDragId(identity.id) });
  const Icon = IDENTITY_ICON[identity.icon] ?? IDENTITY_ICON.user;
  return (
    <Tip label={identity.name} side="top">
      <button
        ref={setNodeRef}
        type="button"
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={() => send({ type: 'identity.activate', identityId: identity.id })}
        onDoubleClick={() => openEditor(identity.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          send({ type: 'menu.identity', identityId: identity.id });
        }}
        className={cn(
          'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200',
          active ? 'border-border bg-card text-foreground shadow-sm' : 'border-transparent text-muted-foreground hover:bg-sidebar-accent/66 hover:text-foreground',
          isDragging && 'opacity-50',
          isOver && !isDragging && 'border-primary bg-accent/60',
        )}
      >
        <Icon size={15} color={active ? IDENTITY_COLOR_HEX[identity.color] : undefined} />
        <AgentBadge identity={identity} />
      </button>
    </Tip>
  );
}

/** phi 的角标语义：agent 工作中=绿点，用户接管=橙点，agent 空闲=灰点 */
function AgentBadge({ identity }: { identity: Identity }) {
  if (identity.ownership === 'user') return null;
  const color = identity.ownership === 'agentDelegatedToUser' ? 'bg-orange-500' : identity.agentState ? 'bg-emerald-500' : 'bg-muted-foreground';
  return <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar', color)} />;
}
