/**
 * [INPUT]: 依赖 react，@shared/model 的 Workspace，../../store/browser 的 useBrowser/send，../../icons 的 Folder/FolderOpen/Plus，../../components/ui/{sidebar-button,button,tooltip}，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 WorkspaceSidebar 组件：本机目录列表（Folder 图标 + 目录名 + 路径）+「Add folder」（原生目录选择器）；选中态走 SidebarButton 语言；右键原生菜单（访达显示 / 复制路径 / 移除）
 * [POS]: modules/workspace 的侧栏；一个工作区 = 一个目录
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Workspace } from '@shared/model';
import { Folder, FolderOpen, Plus } from '../../icons';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';

export function WorkspaceSidebar() {
  const workspaces = useBrowser((s) => s.snapshot?.workspaces ?? []);
  const activeId = useBrowser((s) => s.snapshot?.activeWorkspaceId ?? null);
  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-2 pb-2 text-sidebar-foreground scrollbar-hide">
      <div className="flex h-7 items-center gap-1.5 px-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Workspaces</span>
        <span className="text-xs text-muted-foreground/70">{workspaces.length}</span>
        <div className="flex-1" />
        <Tip label="Add a folder">
          <Button variant="icon" className="h-6 w-6 text-muted-foreground" onClick={() => send({ type: 'workspace.add' })}>
            <Plus size={13} />
          </Button>
        </Tip>
      </div>
      {workspaces.length === 0 ? (
        <div className="mx-2 rounded-2xl border border-dashed border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          A workspace is a folder on this Mac. Add one and talk to the agent about it.
          <div className="mt-2">
            <Button variant="secondary" size="small" onClick={() => send({ type: 'workspace.add' })}>
              <Plus size={12} /> Add folder
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 px-2">
          {workspaces.map((ws) => (
            <WorkspaceRow key={ws.id} ws={ws} active={ws.id === activeId} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceRow({ ws, active }: { ws: Workspace; active: boolean }) {
  const Icon = active ? FolderOpen : Folder;
  return (
    <button
      type="button"
      onClick={() => send({ type: 'workspace.select', id: ws.id })}
      onContextMenu={(e) => {
        e.preventDefault();
        send({ type: 'menu.workspace', id: ws.id });
      }}
      title={ws.path}
      className={sidebarButtonClass({ active, className: 'h-10 gap-2 py-1 pr-2 pl-2 text-base' })}
    >
      <Icon size={15} className={active ? 'text-foreground' : 'text-muted-foreground'} />
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="w-full truncate leading-tight text-foreground">{ws.name}</span>
        <span className="w-full truncate text-xs leading-tight text-muted-foreground">{ws.path.replace(/^\/Users\/[^/]+/, '~')}</span>
      </span>
    </button>
  );
}
