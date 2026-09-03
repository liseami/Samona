/**
 * [INPUT]: 依赖 ../../store/browser 的 useBrowser/send，../../chat/store 的 chatSend，../../icons 的 Folder/NewChat，../../components/ui/{button,tooltip}，../../shell/PanelHeader
 * [OUTPUT]: 对外提供 WorkspacePanelHeader 组件：左 空；中 当前工作区（Folder + 目录名 + 路径）；右 新对话
 * [POS]: modules/workspace 的头部（Laper PanelHeader 三槽）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useBrowser } from '../../store/browser';
import { chatSend } from '../../chat/store';
import { Folder, NewChat } from '../../icons';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { PanelHeader } from '../../shell/PanelHeader';

export function WorkspacePanelHeader() {
  const ws = useBrowser((s) => s.snapshot?.workspaces.find((w) => w.id === s.snapshot?.activeWorkspaceId) ?? null);
  const center = (
    <div className="flex h-7 w-full items-center gap-2 rounded-2xl border border-border bg-input px-2.5 text-left">
      <Folder size={12} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-center text-base text-foreground">{ws ? ws.name : 'Workspace'}</span>
      {ws && <span className="shrink-0 truncate text-xs text-muted-foreground">{ws.path.replace(/^\/Users\/[^/]+/, '~')}</span>}
    </div>
  );
  const actions = (
    <Tip label="New conversation">
      <Button variant="icon" className="text-muted-foreground" disabled={!ws} onClick={() => ws && chatSend({ type: 'workspace.select', id: ws.id })}>
        <NewChat size={15} />
      </Button>
    </Tip>
  );
  return <PanelHeader title={<span className="w-2" />} center={center} actions={actions} />;
}
