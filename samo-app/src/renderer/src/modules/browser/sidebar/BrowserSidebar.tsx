/**
 * [INPUT]: 依赖 react，@dnd-kit/core（DndContext/DragOverlay/sensors），../../store/browser，../../lib/dnd 的解析与碰撞检测，./{AgentBanner,FavoritesGrid,PinnedGrid,TabList,AgentGroups,SidebarFooter,DragGhost}
 * [OUTPUT]: 对外提供 BrowserSidebar 组件（浏览器模块的侧栏）：Arc 式纵向侧栏的骨架（agent 横幅 → 收藏 → 固定 → 文件夹与标签 → agent 分组 → 底栏；宽度、头部与拖拽调宽由壳负责）+ 唯一的 DndContext（所有拖拽落点在 onDragEnd 统一换算为 tab.move）+ 折叠态 peek 的收回
 * [POS]: modules/browser/sidebar 的容器，只负责纵向编排与拖拽仲裁；每个分段自管数据。没有「身份」：所有标签同一登录态，agent 的任务空间是分组
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createContext, useContext, useMemo, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { parseDndId, resolveDrop, sidebarCollision } from '../../../lib/dnd';
import { selectPrimaryIdentity, send, useBrowser } from '../../../store/browser';
import { AgentBanner } from './AgentBanner';
import { AgentGroups } from './AgentGroups';
import { FavoritesGrid } from './FavoritesGrid';
import { PinnedGrid } from './PinnedGrid';
import { TabList } from './TabList';
import { SidebarFooter } from './SidebarFooter';
import { DragGhost } from './DragGhost';

/** 正在拖拽的元素 id（dnd id），分区用它决定是否显示空态落点 */
export const DraggingContext = createContext<string | null>(null);
export const useDragging = () => useContext(DraggingContext);

export function BrowserSidebar() {
  const snapshot = useBrowser((s) => s.snapshot)!;
  const primary = useBrowser(selectPrimaryIdentity);
  const peeking = snapshot.sidebarPeek;
  const [dragging, setDragging] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (!e.over) return;
    const active = parseDndId(String(e.active.id));
    const over = parseDndId(String(e.over.id));
    if (!active || !over || active.kind !== 'tab') return;
    const activeId = active.id;
    const tab = snapshot.tabs.find((t) => t.id === activeId);
    if (!tab) return;
    const target = resolveDrop(tab, over, snapshot.tabs, primary?.id ?? snapshot.activeIdentityId);
    if (target) send({ type: 'tab.move', tabId: tab.id, to: target });
  };

  const ghost = useMemo(() => (dragging ? <DragGhost dndId={dragging} /> : null), [dragging]);

  return (
    <div data-panel="sidebar" className="no-drag flex min-h-0 min-w-0 flex-1 flex-col bg-transparent pt-2 text-sidebar-foreground" onMouseLeave={() => peeking && send({ type: 'layout.peek', peek: false })}>
      <DraggingContext.Provider value={dragging}>
        <DndContext sensors={sensors} collisionDetection={sidebarCollision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <AgentBanner />
          <FavoritesGrid />
          <PinnedGrid />
          <TabList />
          <AgentGroups />
          <SidebarFooter />
          <DragOverlay dropAnimation={null}>{ghost}</DragOverlay>
        </DndContext>
      </DraggingContext.Provider>
    </div>
  );
}
