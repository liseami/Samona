/**
 * [INPUT]: 依赖 @dnd-kit/core 的碰撞检测函数与类型，@shared/model 的 Tab，@shared/ipc 的 TabTarget
 * [OUTPUT]: 对外提供拖拽 id 编解码（tabDragId/containerId/parseDndId）、sectionOf(tab)、resolveDrop（把 dnd-kit 的 over 解析为 tab.move 的落点）、sidebarCollision（元素优先于容器的碰撞检测）
 * [POS]: renderer/lib 的拖拽语义层——组件只负责把元素登记为 draggable/droppable，落点如何换算为主进程命令全在这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core';
import type { Tab } from '@shared/model';
import type { TabTarget } from '@shared/ipc';

export type DndId = string;
export type Parsed =
  | { kind: 'tab'; id: string }
  | { kind: 'favorites' }
  | { kind: 'pinned' }
  | { kind: 'loose' }
  | { kind: 'folder'; id: string }
  | { kind: 'folderHead'; id: string };

export const tabDragId = (id: string): DndId => `tab:${id}`;
export const CONTAINER = { favorites: 'c:favorites', pinned: 'c:pinned', loose: 'c:loose' } as const;
export const folderContainerId = (id: string): DndId => `c:folder:${id}`;
export const folderHeadId = (id: string): DndId => `head:folder:${id}`;

export function parseDndId(raw: DndId): Parsed | null {
  if (raw.startsWith('tab:')) return { kind: 'tab', id: raw.slice(4) };
  if (raw === CONTAINER.favorites) return { kind: 'favorites' };
  if (raw === CONTAINER.pinned) return { kind: 'pinned' };
  if (raw === CONTAINER.loose) return { kind: 'loose' };
  if (raw.startsWith('c:folder:')) return { kind: 'folder', id: raw.slice(9) };
  if (raw.startsWith('head:folder:')) return { kind: 'folderHead', id: raw.slice(12) };
  return null;
}

const isContainer = (id: DndId) => id.startsWith('c:') || id.startsWith('head:');

/** 指针所在处优先命中元素，其次容器；都没有再退回最近中心（跨分区拖拽时不至于丢 over） */
export const sidebarCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const items = within.filter((c) => !isContainer(String(c.id)));
  if (items.length) return items;
  if (within.length) return within;
  return closestCenter(args);
};

export function sectionOf(tab: Tab): Pick<TabTarget, 'identityId' | 'pinned' | 'folderId'> {
  return { identityId: tab.identityId, pinned: tab.pinned, folderId: tab.folderId };
}

const sameSection = (a: Pick<TabTarget, 'identityId' | 'pinned' | 'folderId'>, b: Pick<TabTarget, 'identityId' | 'pinned' | 'folderId'>) =>
  a.identityId === b.identityId && a.pinned === b.pinned && a.folderId === b.folderId;

/**
 * 把 dnd-kit 的 over 解析为 tab.move 的落点。
 * 落在元素上 = 插到该元素的位置（同分区内等价于 arrayMove）；落在容器/文件夹头上 = 追加到末尾。
 */
export function resolveDrop(active: Tab, over: Parsed, tabs: Tab[], activeIdentityId: number): TabTarget | null {
  const END = Number.MAX_SAFE_INTEGER;
  switch (over.kind) {
    case 'tab': {
      const target = tabs.find((t) => t.id === over.id);
      if (!target || target.id === active.id) return null;
      const section = sectionOf(target);
      const siblings = tabs.filter((t) => sameSection(sectionOf(t), section));
      const index = siblings.findIndex((t) => t.id === target.id);
      return { ...section, index: sameSection(sectionOf(active), section) ? index : index };
    }
    case 'favorites':
      return { identityId: null, pinned: true, folderId: null, index: END };
    case 'pinned':
      return { identityId: activeIdentityId, pinned: true, folderId: null, index: END };
    case 'loose':
      return { identityId: activeIdentityId, pinned: false, folderId: null, index: END };
    case 'folder':
    case 'folderHead':
      return { identityId: activeIdentityId, pinned: false, folderId: over.id, index: END };
    default:
      return null;
  }
}
