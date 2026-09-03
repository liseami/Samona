/**
 * [INPUT]: 依赖 react，@dnd-kit/core（DndContext/DragOverlay/sensors），../../store/browser，../../lib/dnd 的解析与碰撞检测，./{SidebarHeader,SpacesStrip,SpaceEditor,Omnibox,AgentBanner,FavoritesGrid,PinnedGrid,TabList,SidebarFooter,Resizer,DragGhost}，./useSpaceSwipe
 * [OUTPUT]: 对外提供 Sidebar 组件：Arc 式纵向侧栏的骨架（头部 → Space 条 → 地址栏 → agent 横幅 → 收藏 → 固定 → 文件夹与标签 → 底栏）+ 唯一的 DndContext（所有拖拽落点在 onDragEnd 统一换算为 tab.move / space.reorder）+ 双指横滑切 Space + 折叠态 peek 的收回
 * [POS]: renderer/components/sidebar 的容器，只负责纵向编排、拖拽仲裁与宽度；每个分段自管数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createContext, useContext, useMemo, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { parseDndId, resolveDrop, sidebarCollision } from '../../lib/dnd';
import { send, useBrowser } from '../../store/browser';
import { SidebarHeader } from './SidebarHeader';
import { SpacesStrip } from './SpacesStrip';
import { SpaceEditor } from './SpaceEditor';
import { Omnibox } from './Omnibox';
import { AgentBanner } from './AgentBanner';
import { FavoritesGrid } from './FavoritesGrid';
import { PinnedGrid } from './PinnedGrid';
import { TabList } from './TabList';
import { SidebarFooter } from './SidebarFooter';
import { Resizer } from './Resizer';
import { DragGhost } from './DragGhost';
import { useSpaceSwipe } from './useSpaceSwipe';

/** 正在拖拽的元素 id（dnd id），分区用它决定是否显示空态落点 */
export const DraggingContext = createContext<string | null>(null);
export const useDragging = () => useContext(DraggingContext);

export function Sidebar() {
  const snapshot = useBrowser((s) => s.snapshot)!;
  const width = snapshot.layout.sidebarWidth;
  const peeking = snapshot.sidebarPeek;
  const [dragging, setDragging] = useState<string | null>(null);
  const onWheel = useSpaceSwipe();

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
    if (!active || !over) return;
    if (active.kind === 'space') {
      if (over.kind === 'space' && over.id !== active.id) {
        const overId = over.id;
        const index = snapshot.spaces.findIndex((s) => s.id === overId);
        if (index >= 0) send({ type: 'space.reorder', spaceId: active.id, index });
      }
      return;
    }
    if (active.kind !== 'tab') return;
    const activeId = active.id;
    const tab = snapshot.tabs.find((t) => t.id === activeId);
    if (!tab) return;
    const target = resolveDrop(tab, over, snapshot.tabs, snapshot.activeSpaceId);
    if (target) send({ type: 'tab.move', tabId: tab.id, to: target });
  };

  const ghost = useMemo(() => (dragging ? <DragGhost dndId={dragging} /> : null), [dragging]);

  return (
    <aside
      data-panel="sidebar"
      className="relative flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground"
      style={{ width }}
      onWheel={onWheel}
      onMouseLeave={() => peeking && send({ type: 'layout.peek', peek: false })}
    >
      <DraggingContext.Provider value={dragging}>
        <DndContext sensors={sensors} collisionDetection={sidebarCollision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <SidebarHeader />
          <SpaceEditor>
            <SpacesStrip />
          </SpaceEditor>
          <Omnibox />
          <AgentBanner />
          <FavoritesGrid />
          <PinnedGrid />
          <TabList />
          <SidebarFooter />
          <DragOverlay dropAnimation={null}>{ghost}</DragOverlay>
        </DndContext>
      </DraggingContext.Provider>
      <Resizer />
    </aside>
  );
}
