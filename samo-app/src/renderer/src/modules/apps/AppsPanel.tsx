/**
 * [INPUT]: 依赖 ../../shell/ContentHole 的 ContentHole， ../../store/browser 的 useBrowser，./AppsDashboard
 * [OUTPUT]: 对外提供 AppsPanel 组件：应用维度的面板体——打开了应用就渲染空（应用视图叠在面板上），否则是桌面 AppsDashboard
 * [POS]: modules/apps 的面板；应用视图由浏览器引擎承载（不落盘、不进浏览器的 appId 视图）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useBrowser } from '../../store/browser';
import { AppsDashboard } from './AppsDashboard';
import { ContentHole } from '../../shell/ContentHole';

export function AppsPanel() {
  const activeId = useBrowser((s) => s.snapshot?.activeAppId ?? null);
  if (activeId) return <ContentHole />; // 应用视图落在这里：量矩形交给宿主
  return <AppsDashboard />;
}
