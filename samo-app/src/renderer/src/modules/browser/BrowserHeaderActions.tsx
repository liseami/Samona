/**
 * [INPUT]: 依赖 ../../icons 的 ArrowLeft/ArrowRight/Refresh/Close，../../store/browser 的 useBrowser/send/selectActiveTab，../../components/ui/{button,tooltip}
 * [OUTPUT]: 对外提供 BrowserHeaderActions 组件：后退/前进/刷新（加载中变停止），挂在壳 Header 的右侧
 * [POS]: modules/browser 的头部动作；Header 按当前模块取用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ArrowLeft, ArrowRight, Close, Refresh } from '../../icons';
import { selectActiveTab, send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';

export function BrowserHeaderActions() {
  const tab = useBrowser(selectActiveTab);
  return (
    <>
      <Tip label="Back ⌘[">
        <Button variant="icon" className="no-drag text-muted-foreground" disabled={!tab?.canGoBack} onClick={() => send({ type: 'tab.back' })}>
          <ArrowLeft size={15} />
        </Button>
      </Tip>
      <Tip label="Forward ⌘]">
        <Button variant="icon" className="no-drag text-muted-foreground" disabled={!tab?.canGoForward} onClick={() => send({ type: 'tab.forward' })}>
          <ArrowRight size={15} />
        </Button>
      </Tip>
      <Tip label={tab?.loading ? 'Stop' : 'Reload ⌘R'}>
        <Button variant="icon" className="no-drag text-muted-foreground" disabled={!tab} onClick={() => send({ type: tab?.loading ? 'tab.stop' : 'tab.reload' })}>
          {tab?.loading ? <Close size={15} /> : <Refresh size={14} />}
        </Button>
      </Tip>
    </>
  );
}
