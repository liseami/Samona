/**
 * [INPUT]: 依赖 react 的 useMemo，zustand 的 create，@shared/model 的 BrowserSnapshot/Space/Tab/Folder，@shared/ipc 的 Command/Query/QueryResult/ShellEvent，window.samo 桥
 * [OUTPUT]: 对外提供 useBrowser store（snapshot 镜像 + 壳内一次性请求：omnibox/rename/spaceEditor）、bindBridge()、send()/query()、选择器 selectActiveSpace/selectActiveTab/selectActiveTabId 与 memo 化的 useSpaceTabs/useFavorites/useSpaceFolders
 * [POS]: renderer 的状态镜像：主进程是唯一真相，这里只做只读投影与命令出口；组件不直接触碰 window.samo
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import type { BrowserSnapshot, Folder, Space, Tab } from '@shared/model';
import type { Command, Query, QueryResult, ShellEvent } from '@shared/ipc';

export type OmniboxMode = 'newTab' | 'editUrl' | 'searchTabs';
interface Request<T> {
  value: T;
  nonce: number;
}

interface BrowserState {
  snapshot: BrowserSnapshot | null;
  omnibox: Request<OmniboxMode> | null;
  rename: Request<{ kind: 'tab' | 'folder'; id: string }> | null;
  spaceEditor: Request<number> | null;
  setSnapshot(snapshot: BrowserSnapshot): void;
  requestOmnibox(mode: OmniboxMode): void;
  requestRename(kind: 'tab' | 'folder', id: string): void;
  openSpaceEditor(spaceId: number): void;
}

export const useBrowser = create<BrowserState>((set) => ({
  snapshot: null,
  omnibox: null,
  rename: null,
  spaceEditor: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  requestOmnibox: (mode) => set({ omnibox: { value: mode, nonce: Date.now() } }),
  requestRename: (kind, id) => set({ rename: { value: { kind, id }, nonce: Date.now() } }),
  openSpaceEditor: (spaceId) => set({ spaceEditor: { value: spaceId, nonce: Date.now() } }),
}));

/** 命令出口：所有 UI 动作都经此进入主进程 */
export function send(command: Command): void {
  void window.samo.invoke(command);
}
export function query<Q extends Query>(q: Q): Promise<QueryResult<Q>> {
  return window.samo.query(q);
}

/** 在应用启动时绑定一次 preload 桥 */
export function bindBridge(): () => void {
  const { setSnapshot, requestOmnibox, requestRename, openSpaceEditor } = useBrowser.getState();
  void window.samo.getState().then(setSnapshot);
  const offState = window.samo.onState(setSnapshot);
  const offEvent = window.samo.onEvent((event: ShellEvent) => {
    switch (event.type) {
      case 'focusOmnibox':
        requestOmnibox(event.mode);
        break;
      case 'renameTab':
        requestRename('tab', event.tabId);
        break;
      case 'renameFolder':
        requestRename('folder', event.folderId);
        break;
      case 'editSpace':
        openSpaceEditor(event.spaceId);
        break;
      default:
        break;
    }
  });
  return () => {
    offState();
    offEvent();
  };
}

// ============ 派生选择器 ============
export const selectActiveSpace = (s: BrowserState): Space | undefined =>
  s.snapshot?.spaces.find((sp) => sp.id === s.snapshot?.activeSpaceId);

export const selectActiveTabId = (s: BrowserState): string | null =>
  s.snapshot ? (s.snapshot.activeTabIdBySpace[s.snapshot.activeSpaceId] ?? null) : null;

export const selectActiveTab = (s: BrowserState): Tab | undefined => {
  const id = selectActiveTabId(s);
  return id ? s.snapshot?.tabs.find((t) => t.id === id) : undefined;
};

/** 活动 Space 的标签（派生数组必须 memo：zustand 选择器返回新引用会触发无限重渲染） */
export function useSpaceTabs(): Tab[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => (snapshot ? snapshot.tabs.filter((t) => t.spaceId === snapshot.activeSpaceId) : []), [snapshot]);
}
export function useFavorites(): Tab[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => (snapshot ? snapshot.tabs.filter((t) => t.spaceId === null) : []), [snapshot]);
}
export function useSpaceFolders(): Folder[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => (snapshot ? snapshot.folders.filter((f) => f.spaceId === snapshot.activeSpaceId) : []), [snapshot]);
}
