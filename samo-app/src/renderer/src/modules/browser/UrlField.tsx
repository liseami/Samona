/**
 * [INPUT]: 依赖 @shared/url 的 displayUrl，../../icons 的 Lock/Search，../../store/browser 的 useBrowser/send/selectActiveTab，../../components/ui/kbd
 * [OUTPUT]: 对外提供 UrlField 组件：面板头部居中的地址栏——只做「看」与「进入」：显示当前标签的短地址（https 带锁），点击打开 ⌘T 同款命令面板（有地址时 editUrl 模式并带入全地址，否则 newTab）
 * [POS]: modules/browser 头部的地址入口；输入、建议与键盘全在 overlay 的 Palette 里，避免两套建议 UI
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { displayUrl } from '@shared/url';
import { Lock, Search } from '../../icons';
import { selectActiveTab, send, useBrowser } from '../../store/browser';
import { Kbd } from '../../components/ui/kbd';
import { cn } from '../../lib/utils';

export function UrlField() {
  const tab = useBrowser(selectActiveTab);
  const url = tab?.url ?? '';
  const shown = displayUrl(url);
  const secure = url.startsWith('https://');
  return (
    <button
      type="button"
      onClick={() => send({ type: 'palette.open', mode: tab && shown ? 'editUrl' : 'newTab' })}
      title={url || undefined}
      className="flex h-7 w-full items-center gap-2 rounded-2xl border border-border bg-input pr-1.5 pl-2.5 text-left transition-colors duration-300 ease-out hover:border-primary/40"
    >
      {secure ? <Lock size={11} className="shrink-0 text-muted-foreground" /> : <Search size={12} className="shrink-0 text-muted-foreground" />}
      <span className={cn('min-w-0 flex-1 truncate text-center text-base', shown ? 'text-foreground' : 'text-muted-foreground')}>{shown || 'Search or enter URL'}</span>
      <Kbd className="shrink-0">{shown ? '⌘L' : '⌘T'}</Kbd>
    </button>
  );
}
