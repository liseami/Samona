/**
 * [INPUT]: 依赖 react，../../store/browser 的 useBrowser/send，../../chat/store 的 bindChat，../../chat/ChatPanel，../../icons 的 Folder/Plus，../../components/ui/button
 * [OUTPUT]: 对外提供 WorkspacePanel 组件：选中工作区时是它的对话（Codex 式：ChatPanel variant=workspace，线程绑定目录），否则空态引导添加目录
 * [POS]: modules/workspace 的面板；对话真相仍在主进程 ChatStore，工作区只是把线程与目录绑定
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { send, useBrowser } from '../../store/browser';
import { bindChat } from '../../chat/store';
import { ChatPanel } from '../../chat/ChatPanel';
import { Folder, Plus } from '../../icons';
import { Button } from '../../components/ui/button';

export function WorkspacePanel() {
  useEffect(() => bindChat(), []);
  const ws = useBrowser((s) => s.snapshot?.workspaces.find((w) => w.id === s.snapshot?.activeWorkspaceId) ?? null);
  if (!ws) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Folder size={18} />
        </span>
        <div className="mb-1 text-lg font-medium text-foreground">Pick a workspace</div>
        <div className="mb-5 max-w-80 text-sm leading-relaxed text-muted-foreground">Each workspace is a folder on this Mac. The agent will work inside it.</div>
        <Button variant="primary" size="medium" onClick={() => send({ type: 'workspace.add' })}>
          <Plus size={14} /> Add folder
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto h-full w-full max-w-[880px]">
      <ChatPanel variant="workspace" />
    </div>
  );
}
