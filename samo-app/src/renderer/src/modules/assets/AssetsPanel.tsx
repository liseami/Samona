/**
 * [INPUT]: 依赖 @shared/model 的 Download，../../store/browser 的 useBrowser/send，../../icons 的 FolderOpen/Close/Download/SparkleIcon，../../components/ui/button，../../lib/utils 的 cn，./store 的 useAssetsTab
 * [OUTPUT]: 对外提供 AssetsPanel 组件：Downloads tab = 下载列表（文件名点击打开、进度条、在访达中显示、取消、状态与大小）；Generated tab = AI 生成资产的空态
 * [POS]: modules/assets 的面板；下载数据来自快照 downloads（原侧栏下载浮层的能力搬到这里）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Download as DownloadItem } from '@shared/model';
import { Close, Download, FolderOpen, SparkleIcon } from '../../icons';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useAssetsTab } from './store';

export function AssetsPanel() {
  const tab = useAssetsTab((s) => s.tab);
  const downloads = useBrowser((s) => s.snapshot?.downloads ?? []);
  if (tab === 'generated') {
    return (
      <Empty icon={<SparkleIcon size={18} />} title="Nothing generated yet" blurb="Images, files and pages made by Samo AI will be collected here." />
    );
  }
  if (downloads.length === 0) return <Empty icon={<Download size={18} />} title="No downloads" blurb="Files you save from the web show up here." />;
  return (
    <div className="no-drag h-full w-full overflow-y-auto scrollbar-hide">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-2 px-8 py-8">
        {downloads.map((d) => (
          <Row key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
}

function Empty({ icon, title, blurb }: { icon: React.ReactNode; title: string; blurb: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">{icon}</span>
      <div className="mb-1 text-lg font-medium text-foreground">{title}</div>
      <div className="max-w-80 text-sm leading-relaxed text-muted-foreground">{blurb}</div>
    </div>
  );
}

function Row({ d }: { d: DownloadItem }) {
  const pct = d.total > 0 ? Math.round((d.received / d.total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-panel text-muted-foreground">
          <Download size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" className="block w-full truncate text-left text-base text-foreground hover:underline disabled:no-underline" disabled={d.state !== 'completed'} onClick={() => send({ type: 'download.open', id: d.id })}>
            {d.filename}
          </button>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {d.state === 'progressing' ? (
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            ) : (
              <span className={cn(d.state !== 'completed' && 'text-destructive')}>{d.state}</span>
            )}
            <span className="shrink-0">{formatBytes(d.state === 'progressing' ? d.received : d.total)}</span>
            <span className="min-w-0 truncate text-muted-foreground/70">{d.url}</span>
          </div>
        </div>
        <Button variant="icon" className="text-muted-foreground" onClick={() => send({ type: 'download.reveal', id: d.id })}>
          <FolderOpen size={14} />
        </Button>
        {d.state === 'progressing' && (
          <Button variant="icon" className="text-muted-foreground" onClick={() => send({ type: 'download.cancel', id: d.id })}>
            <Close size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
