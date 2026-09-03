/**
 * [INPUT]: 依赖 ../../icons 的 Plus，../store/browser 的 send，./ui/button 的 Button，./ui/kbd 的 Kbd
 * [OUTPUT]: 对外提供 EmptyState 组件：Identity 无活动标签时的内容区空态（Laper Placeholder 形态）
 * [POS]: renderer/components 的内容区占位，与主进程无标签时不挂 WebContentsView 的行为配对
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Plus } from '../icons';
import { send } from '../store/browser';
import { Button } from './ui/button';
import { Kbd } from './ui/kbd';

export function EmptyState({ identityName }: { identityName: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-2 text-lg font-medium text-foreground">{identityName}</div>
      <div className="mb-5 max-w-80 text-sm leading-relaxed text-muted-foreground">This identity is empty. Open something to get started.</div>
      <Button variant="default" size="md" onClick={() => send({ type: 'palette.open', mode: 'newTab' })} className="no-drag">
        <Plus size={14} /> New Tab <Kbd className="ml-1 border-primary-foreground/30 bg-transparent text-primary-foreground/80">⌘T</Kbd>
      </Button>
    </div>
  );
}
