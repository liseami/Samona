/**
 * [INPUT]: 依赖 ../../icons 的 Lock/Search，../../store/browser 的 useBrowser/send/selectActiveTab，../ui/kbd 的 Kbd，@shared/url 的 displayUrl
 * [OUTPUT]: 对外提供 Omnibox 组件：侧栏内的地址展示条——显示当前标签的短地址，点击打开命令面板（editUrl 模式）；无标签时提示 ⌘T
 * [POS]: renderer/components/sidebar 的地址入口；输入、建议与键盘全在 overlay 的 Palette 里，这里只做「看」与「进入」，避免两套建议 UI
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { displayUrl } from '@shared/url';
import { Lock, Search } from '../../icons';
import { selectActiveTab, send, useBrowser } from '../../store/browser';
import { Kbd } from '../ui/kbd';

export function Omnibox() {
  const tab = useBrowser(selectActiveTab);
  const shown = displayUrl(tab?.url ?? '');
  const secure = tab?.url.startsWith('https://');
  return (
    <div className="no-drag px-2 pt-1 pb-1.5">
      <button
        type="button"
        onClick={() => send({ type: 'palette.open', mode: tab && shown ? 'editUrl' : 'newTab' })}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-input pl-2.5 pr-2 text-left transition-colors duration-200 hover:bg-accent/40"
      >
        {secure ? <Lock size={12} className="shrink-0 text-muted-foreground" /> : <Search size={13} className="shrink-0 text-muted-foreground" />}
        <span className={shown ? 'min-w-0 flex-1 truncate text-base text-foreground' : 'min-w-0 flex-1 truncate text-base text-muted-foreground'}>{shown || 'Search or enter URL'}</span>
        <Kbd className="shrink-0">{shown ? '⌘L' : '⌘T'}</Kbd>
      </button>
    </div>
  );
}
