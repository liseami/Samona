/**
 * [INPUT]: 依赖 zustand 的 create
 * [OUTPUT]: 对外提供 useAssetsTab：资产维度当前 tab（downloads | generated）
 * [POS]: modules/assets 的壳内瞬时状态；资产数据本身来自主进程快照（downloads），AI 生成的资产接入时在这里加 tab
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from 'zustand';

export type AssetsTab = 'downloads' | 'generated';
export const ASSET_TABS: { id: AssetsTab; label: string; hint: string }[] = [
  { id: 'downloads', label: 'Downloads', hint: 'Files saved from the web' },
  { id: 'generated', label: 'Generated', hint: 'Made by Samo AI' },
];

export const useAssetsTab = create<{ tab: AssetsTab; setTab(tab: AssetsTab): void }>((set) => ({ tab: 'downloads', setTab: (tab) => set({ tab }) }));
