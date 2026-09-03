/**
 * [INPUT]: 依赖 icons 语义图标，../../store/browser 的 useBrowser/send，../ui/{popover,button,tooltip}，../../lib/utils 的 cn，@shared/model 的 Download
 * [OUTPUT]: 对外提供 DownloadsPopover 组件：下载按钮（进行中显示进度点）+ 列表浮层（进度条、打开/在访达中显示/取消、清空）
 * [POS]: renderer/components/sidebar 底栏的下载入口；数据来自快照的 downloads
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Download as DownloadIcon, FolderOpen, Close } from '../../icons';
import type { Download } from '@shared/model';
import { cn } from '../../lib/utils';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tip } from '../ui/tooltip';

export function DownloadsPopover() {
  const downloads = useBrowser((s) => s.snapshot?.downloads ?? []);
  const busy = downloads.some((d) => d.state === 'progressing');
  return (
    <Popover>
      <Tip label="Downloads">
        <PopoverTrigger asChild>
          <Button size="icon" className="relative">
            <DownloadIcon size={15} />
            {busy && <span className="absolute top-1 right-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent className="w-72 p-2" side="top">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-sm font-semibold">Downloads</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground" onClick={() => send({ type: 'download.clear' })} disabled={downloads.every((d) => d.state === 'progressing')}>
            Clear
          </Button>
        </div>
        {downloads.length === 0 ? (
          <div className="px-1 py-4 text-center text-sm text-muted-foreground">Nothing downloaded yet.</div>
        ) : (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {downloads.map((d) => (
              <Row key={d.id} d={d} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Row({ d }: { d: Download }) {
  const pct = d.total > 0 ? Math.round((d.received / d.total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5 shadow-xs">
      <div className="flex items-center gap-2">
        <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:underline" disabled={d.state !== 'completed'} onClick={() => send({ type: 'download.open', id: d.id })}>
          {d.filename}
        </button>
        <Tip label="Show in Finder">
          <Button size="iconSm" onClick={() => send({ type: 'download.reveal', id: d.id })}>
            <FolderOpen size={12} />
          </Button>
        </Tip>
        {d.state === 'progressing' && (
          <Tip label="Cancel">
            <Button size="iconSm" onClick={() => send({ type: 'download.cancel', id: d.id })}>
              <Close size={12} />
            </Button>
          </Tip>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {d.state === 'progressing' ? (
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <span className={cn(d.state !== 'completed' && 'text-destructive')}>{d.state}</span>
        )}
        <span>{formatBytes(d.state === 'progressing' ? d.received : d.total)}</span>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
