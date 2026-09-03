/**
 * [INPUT]: 依赖 ./store 的 useDesignNav/SECTIONS，../../components/ui/sidebar-button 的 sidebarButtonClass
 * [OUTPUT]: 对外提供 DesignSidebar 组件：设计系统陈列的章节导航（Laper PanelHeader 标题 + SidebarButton 行）
 * [POS]: modules/design 的侧栏；点击章节让面板滚动到位
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { SECTIONS, useDesignNav } from './store';

export function DesignSidebar() {
  const section = useDesignNav((s) => s.section);
  const jump = useDesignNav((s) => s.jump);
  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center px-4 pt-3.5 pb-3">
        <span className="text-base font-normal text-foreground">Design system</span>
        <span className="ml-auto rounded-md border border-border bg-muted px-1.5 text-xs text-muted-foreground">dev</span>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => jump(s.id)} className={sidebarButtonClass({ active: section === s.id, className: 'h-8 w-full gap-2 pl-3 pr-3 text-base' })}>
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
