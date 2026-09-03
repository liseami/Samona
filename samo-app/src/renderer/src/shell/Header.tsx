/**
 * [INPUT]: 依赖 ../icons 的 SidebarClose/SidebarOpen，../store/browser 的 useBrowser/send，../components/ui/{button,tooltip}，../lib/utils 的 cn，./WindowControls，../modules/registry 的 MODULE_REGISTRY
 * [OUTPUT]: 对外提供 Header 组件：40px 拖拽行——自绘红绿灯 + 侧栏折叠/展开 + 当前模块的头部动作（浏览器：后退/前进/刷新）；双击空白处缩放窗口
 * [POS]: shell 的顶行；展开态嵌在左列（rail + 侧栏）顶部，折叠态绝对定位横贯整窗
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { SidebarClose, SidebarOpen } from '../icons';
import { cn } from '../lib/utils';
import { send, useBrowser } from '../store/browser';
import { Button } from '../components/ui/button';
import { Tip } from '../components/ui/tooltip';
import { MODULE_REGISTRY } from '../modules/registry';
import { WindowControls } from './WindowControls';

export function Header({ collapsed = false }: { collapsed?: boolean }) {
  const module = useBrowser((s) => s.snapshot?.layout.module ?? 'browser');
  const Actions = MODULE_REGISTRY[module].HeaderActions;
  return (
    <div
      className={cn('drag flex h-10 shrink-0 items-center gap-0.5 pr-2 pl-3', collapsed && 'absolute inset-x-0 top-0 z-30')}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) send({ type: 'window.zoom', fullscreen: false });
      }}
    >
      <WindowControls />
      <div className="w-1" />
      <Tip label={collapsed ? 'Show sidebar ⌘S' : 'Hide sidebar ⌘S'}>
        <Button size="icon" className="no-drag" onClick={() => send({ type: 'layout.sidebar', collapsed: !collapsed })}>
          {collapsed ? <SidebarOpen size={15} /> : <SidebarClose size={15} />}
        </Button>
      </Tip>
      <div className="flex-1" />
      {Actions && <Actions />}
    </div>
  );
}
