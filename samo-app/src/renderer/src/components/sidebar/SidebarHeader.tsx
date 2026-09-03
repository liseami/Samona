/**
 * [INPUT]: 依赖 icons 语义图标，../../store/browser 的 useBrowser/send/selectActiveTab，../ui/button 的 Button，../ui/tooltip 的 Tip
 * [OUTPUT]: 对外提供 SidebarHeader 组件：40px 拖拽行——左侧为 macOS 交通灯留白(78px) + 折叠按钮，右侧后退/前进/刷新
 * [POS]: renderer/components/sidebar 的首行，唯一的窗口拖拽热区
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ArrowLeft, ArrowRight, SidebarClose, Refresh, Close } from '../../icons';
import { selectActiveTab, send, useBrowser } from '../../store/browser';
import { Button } from '../ui/button';
import { Tip } from '../ui/tooltip';

export function SidebarHeader() {
  const tab = useBrowser(selectActiveTab);
  const isMac = window.samo.platform === 'darwin';
  return (
    <div className="drag flex h-10 shrink-0 items-center gap-0.5 pr-2" style={{ paddingLeft: isMac ? 78 : 8 }}>
      <Tip label="Hide sidebar ⌘S">
        <Button size="icon" className="no-drag" onClick={() => send({ type: 'layout.sidebar', collapsed: true })}>
          <SidebarClose size={15} />
        </Button>
      </Tip>
      <div className="flex-1" />
      <Tip label="Back ⌘[">
        <Button size="icon" className="no-drag" disabled={!tab?.canGoBack} onClick={() => send({ type: 'tab.back' })}>
          <ArrowLeft size={15} />
        </Button>
      </Tip>
      <Tip label="Forward ⌘]">
        <Button size="icon" className="no-drag" disabled={!tab?.canGoForward} onClick={() => send({ type: 'tab.forward' })}>
          <ArrowRight size={15} />
        </Button>
      </Tip>
      <Tip label={tab?.loading ? 'Stop' : 'Reload ⌘R'}>
        <Button size="icon" className="no-drag" disabled={!tab} onClick={() => send({ type: tab?.loading ? 'tab.stop' : 'tab.reload' })}>
          {tab?.loading ? <Close size={15} /> : <Refresh size={14} />}
        </Button>
      </Tip>
    </div>
  );
}
