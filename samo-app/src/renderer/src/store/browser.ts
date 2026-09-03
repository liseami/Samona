/**
 * [INPUT]: 依赖 react 的 useMemo，zustand 的 create，@shared/model 的 BrowserSnapshot/Identity/Tab/Folder，@shared/ipc 的 Command/Query/QueryResult/ShellEvent，window.samo 桥
 * [OUTPUT]: 对外提供 useBrowser store（snapshot 镜像 + 壳内一次性请求：rename）、bindBridge()、send()/query()、选择器 selectActiveIdentity/selectPrimaryIdentity/selectActiveTab/selectActiveTabId 与 memo 化的 useIdentityTabs/useFavorites/useIdentityFolders
 * [POS]: renderer 的状态镜像：主进程是唯一真相，这里只做只读投影与命令出口；组件不直接触碰 window.samo
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import type { BrowserSnapshot, Folder, Identity, Tab } from '@shared/model';
import type { Command, Query, QueryResult, ShellEvent } from '@shared/ipc';

interface Request<T> {
  value: T;
  nonce: number;
}

interface BrowserState {
  snapshot: BrowserSnapshot | null;
  rename: Request<{ kind: 'tab' | 'folder'; id: string }> | null;
  setSnapshot(snapshot: BrowserSnapshot): void;
  requestRename(kind: 'tab' | 'folder', id: string): void;
}

export const useBrowser = create<BrowserState>((set) => ({
  snapshot: null,
  rename: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  requestRename: (kind, id) => set({ rename: { value: { kind, id }, nonce: Date.now() } }),
}));

/** 命令出口：所有 UI 动作都经此进入主进程 */
export function send(command: Command): void {
  void window.samo.invoke(command);
}
// 重载而非泛型：对象字面量里带条件表达式时 TS 会把 Q 推成整个联合，返回类型就散了
export function query(q: Extract<Query, { type: 'suggest' }>): Promise<QueryResult<Extract<Query, { type: 'suggest' }>>>;
export function query(q: Extract<Query, { type: 'thumbnails' }>): Promise<QueryResult<Extract<Query, { type: 'thumbnails' }>>>;
export function query(q: Query): Promise<unknown> {
  return window.samo.query(q);
}

/** 在应用启动时绑定一次 preload 桥 */
export function bindBridge(): () => void {
  const { setSnapshot, requestRename } = useBrowser.getState();
  void window.samo.getState().then(setSnapshot);
  const offState = window.samo.onState(setSnapshot);
  const offEvent = window.samo.onEvent((event: ShellEvent) => {
    switch (event.type) {
      case 'renameTab':
        requestRename('tab', event.tabId);
        break;
      case 'renameFolder':
        requestRename('folder', event.folderId);
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
export const selectActiveIdentity = (s: BrowserState): Identity | undefined =>
  s.snapshot?.identities.find((sp) => sp.id === s.snapshot?.activeIdentityId);
/** 用户的主工作区（恰有一个 ownership='user'）：侧栏的收藏/固定/文件夹/标签都属于它；agent 的任务空间另成分组 */
export const selectPrimaryIdentity = (s: BrowserState): Identity | undefined => s.snapshot?.identities.find((sp) => sp.ownership === 'user');

export const selectActiveTabId = (s: BrowserState): string | null =>
  s.snapshot ? (s.snapshot.activeTabIdByIdentity[s.snapshot.activeIdentityId] ?? null) : null;

export const selectActiveTab = (s: BrowserState): Tab | undefined => {
  const id = selectActiveTabId(s);
  return id ? s.snapshot?.tabs.find((t) => t.id === id) : undefined;
};

/** 活动 Identity 的标签（派生数组必须 memo：zustand 选择器返回新引用会触发无限重渲染） */
export function useIdentityTabs(): Tab[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => {
    const primary = snapshot?.identities.find((i) => i.ownership === 'user');
    return snapshot && primary ? snapshot.tabs.filter((t) => t.identityId === primary.id && !t.appId) : []; // 应用维度的标签不进浏览器侧栏
  }, [snapshot]);
}
export function useFavorites(): Tab[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => (snapshot ? snapshot.tabs.filter((t) => t.identityId === null) : []), [snapshot]);
}
export function useIdentityFolders(): Folder[] {
  const snapshot = useBrowser((s) => s.snapshot);
  return useMemo(() => {
    const primary = snapshot?.identities.find((i) => i.ownership === 'user');
    return snapshot && primary ? snapshot.folders.filter((f) => f.identityId === primary.id) : [];
  }, [snapshot]);
}
