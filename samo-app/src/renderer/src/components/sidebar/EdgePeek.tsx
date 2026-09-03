/**
 * [INPUT]: 依赖 ../../icons 的 PanelLeftOpen，../../store/browser 的 send，../ui/button 的 Button，../ui/tooltip 的 Tip
 * [OUTPUT]: 对外提供 EdgePeek 组件：折叠态的两块热区——左缘 8px 贴边条（悬停临时展开侧栏 = peek）与顶部拖拽条里的展开按钮
 * [POS]: renderer/components/sidebar 的折叠替身；主进程在折叠时把内容视图右移 8px，正好露出这条边
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { SidebarOpen } from '../../icons';
import { send } from '../../store/browser';
import { Button } from '../ui/button';
import { Tip } from '../ui/tooltip';

export function EdgePeek() {
  const isMac = window.samo.platform === 'darwin';
  return (
    <>
      <div className="absolute top-10 bottom-0 left-0 z-30 w-2 cursor-e-resize" onMouseEnter={() => send({ type: 'layout.peek', peek: true })} />
      <div className="drag absolute inset-x-0 top-0 flex h-10 items-center" style={{ paddingLeft: isMac ? 78 : 8 }}>
        <Tip label="Show sidebar ⌘S">
          <Button size="icon" className="no-drag" onClick={() => send({ type: 'layout.sidebar', collapsed: false })}>
            <SidebarOpen size={15} />
          </Button>
        </Tip>
      </div>
    </>
  );
}
