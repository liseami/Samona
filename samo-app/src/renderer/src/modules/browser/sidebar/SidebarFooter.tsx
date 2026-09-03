/**
 * [INPUT]: 依赖 ../../../icons 的 Bug，../../../store/browser 的 send，../../../components/ui/{button,tooltip}，./DownloadsPopover
 * [OUTPUT]: 对外提供 SidebarFooter 组件：侧栏底部一行——下载浮层 + DevTools
 * [POS]: modules/browser/sidebar 的底栏（原身份栏拔除后只剩工具）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Bug } from '../../../icons';
import { send } from '../../../store/browser';
import { Button } from '../../../components/ui/button';
import { Tip } from '../../../components/ui/tooltip';
import { DownloadsPopover } from './DownloadsPopover';

export function SidebarFooter() {
  return (
    <div className="no-drag flex h-11 shrink-0 items-center justify-end gap-1 border-t border-border/60 px-2">
      <DownloadsPopover />
      <Tip label="Developer tools ⌥⌘I">
        <Button variant="icon" className="text-muted-foreground" onClick={() => send({ type: 'shell.openDevTools' })}>
          <Bug size={14} />
        </Button>
      </Tip>
    </div>
  );
}
