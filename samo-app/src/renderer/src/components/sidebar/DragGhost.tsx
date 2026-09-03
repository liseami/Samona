/**
 * [INPUT]: 依赖 ../../icons 的 IDENTITY_ICON，../../lib/dnd 的 parseDndId，../../store/browser 的 useBrowser，./Favicon，@shared/model 的 tabTitle
 * [OUTPUT]: 对外提供 DragGhost 组件：DragOverlay 里跟随指针的浮起卡片（标签行 / Identity pip）
 * [POS]: renderer/components/sidebar 的拖拽视觉，只读快照
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { tabTitle } from '@shared/model';
import { parseDndId } from '../../lib/dnd';
import { useBrowser } from '../../store/browser';
import { IDENTITY_ICON } from '../../icons';
import { Favicon } from './Favicon';

export function DragGhost({ dndId }: { dndId: string }) {
  const snapshot = useBrowser((s) => s.snapshot);
  const parsed = parseDndId(dndId);
  if (!snapshot || !parsed) return null;
  if (parsed.kind === 'identity') {
    const identity = snapshot.identities.find((s) => s.id === parsed.id);
    if (!identity) return null;
    const Icon = IDENTITY_ICON[identity.icon] ?? IDENTITY_ICON.user;
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-md">
        <Icon size={15} />
      </div>
    );
  }
  if (parsed.kind === 'tab') {
    const tab = snapshot.tabs.find((t) => t.id === parsed.id);
    return tab ? (
      <div className="flex h-8 max-w-56 items-center gap-2 rounded-lg border border-border bg-card pl-2 pr-3 text-base shadow-md">
        <Favicon tab={tab} />
        <span className="truncate">{tabTitle(tab)}</span>
      </div>
    ) : null;
  }
  return null;
}
