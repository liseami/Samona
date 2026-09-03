/**
 * [INPUT]: 依赖 react 的 ComponentType，@shared/model 的 ModuleId，./browser/{sidebar/BrowserSidebar,BrowserPanel,BrowserPanelHeader}，./placeholder/Placeholder
 * [OUTPUT]: 对外提供 ModuleDef 类型与 MODULE_REGISTRY：每个模块 = 侧栏 + 面板 + 可选的面板头部；壳按 layout.module 取用
 * [POS]: modules 的注册表——Samo 是「身份 × 模块」的应用，浏览器只是第一个模块；新模块 = 新目录 + 这里一行
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ComponentType } from 'react';
import type { ModuleId } from '@shared/model';
import { BrowserSidebar } from './browser/sidebar/BrowserSidebar';
import { BrowserPanel } from './browser/BrowserPanel';
import { BrowserPanelHeader } from './browser/BrowserPanelHeader';
import { PlaceholderPanel, PlaceholderSidebar } from './placeholder/Placeholder';
import { DesignSidebar } from './design/DesignSidebar';
import { DesignPanel } from './design/DesignPanel';

export interface ModuleDef {
  id: ModuleId;
  Sidebar: ComponentType;
  Panel: ComponentType;
  PanelHeader?: ComponentType; // 面板卡头部（Laper PanelHeader 三槽）；没有则面板体直接顶到卡顶
}

const placeholder = (id: ModuleId, label: string, blurb: string): ModuleDef => ({
  id,
  Sidebar: () => <PlaceholderSidebar label={label} />,
  Panel: () => <PlaceholderPanel label={label} blurb={blurb} />,
});

export const MODULE_REGISTRY: Record<ModuleId, ModuleDef> = {
  browser: { id: 'browser', Sidebar: BrowserSidebar, Panel: BrowserPanel, PanelHeader: BrowserPanelHeader },
  mail: placeholder('mail', 'Mail', 'One inbox per identity. Coming soon.'),
  knowledge: placeholder('knowledge', 'Knowledge', 'Everything you read, kept and searchable. Coming soon.'),
  drive: placeholder('drive', 'Drive', 'Your files, next to your apps. Coming soon.'),
  design: { id: 'design', Sidebar: DesignSidebar, Panel: DesignPanel },
};
