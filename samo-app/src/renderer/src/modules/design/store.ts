/**
 * [INPUT]: 依赖 zustand 的 create
 * [OUTPUT]: 对外提供 useDesignNav：当前章节 id 与 jump()（侧栏点击 → 面板滚动）、SECTIONS 章节表
 * [POS]: modules/design 的模块内状态；只在渲染层，不落盘、不进主进程
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from 'zustand';

export const SECTIONS = [
  { id: 'buttons', label: 'Button' },
  { id: 'sidebar-button', label: 'SidebarButton' },
  { id: 'inputs', label: 'Input' },
  { id: 'overlays', label: 'Tooltip & Popover' },
  { id: 'keycaps', label: 'Keycap & Kbd' },
  { id: 'surfaces', label: 'Surfaces & Shadows' },
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'icons', label: 'Icons' },
] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];

interface DesignNav {
  section: SectionId;
  nonce: number;
  jump(section: SectionId): void;
  setSection(section: SectionId): void;
}

export const useDesignNav = create<DesignNav>((set) => ({
  section: 'buttons',
  nonce: 0,
  jump: (section) => set({ section, nonce: Date.now() }),
  setSection: (section) => set({ section }),
}));
