/**
 * [INPUT]: 依赖 ../../icons 的 Bug/Plus，../../store/browser 的 send，../ui/button 的 Button，../ui/tooltip 的 Tip，./DownloadsPopover
 * [OUTPUT]: 对外提供 SidebarFooter 组件：底栏——左侧下载浮层与新建 Space，右侧开发者工具
 * [POS]: renderer/components/sidebar 的收尾行
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Bug, Plus } from '../../icons';
import { send } from '../../store/browser';
import { Button } from '../ui/button';
import { Tip } from '../ui/tooltip';
import { DownloadsPopover } from './DownloadsPopover';

export function SidebarFooter() {
  return (
    <div className="no-drag flex h-9 shrink-0 items-center gap-0.5 px-2 pb-1">
      <DownloadsPopover />
      <Tip label="New space ⇧⌘N">
        <Button size="icon" onClick={() => send({ type: 'space.create', name: 'New Space', edit: true })}>
          <Plus size={15} />
        </Button>
      </Tip>
      <div className="flex-1" />
      <Tip label="Developer tools ⌥⌘I">
        <Button size="icon" onClick={() => send({ type: 'shell.openDevTools' })}>
          <Bug size={14} />
        </Button>
      </Tip>
    </div>
  );
}
