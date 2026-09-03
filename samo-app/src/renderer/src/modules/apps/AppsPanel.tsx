/**
 * [INPUT]: 依赖 ../../store/browser 的 useBrowser，../../icons 的 AppLocal
 * [OUTPUT]: 对外提供 AppsPanel 组件：应用维度的面板体——有打开的应用时渲染空（网页视图叠在面板上），否则提示从左侧选一张卡
 * [POS]: modules/apps 的面板；网页本身由浏览器引擎承载（应用 = 一个被记住的标签）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { AppLocal } from '../../icons';
import { useBrowser } from '../../store/browser';

export function AppsPanel() {
  const activeId = useBrowser((s) => s.snapshot?.activeAppId ?? null);
  const count = useBrowser((s) => s.snapshot?.apps.length ?? 0);
  if (activeId) return null;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
        <AppLocal size={18} />
      </span>
      <div className="mb-1 text-lg font-medium text-foreground">{count ? 'Pick an app' : 'No apps yet'}</div>
      <div className="max-w-80 text-sm leading-relaxed text-muted-foreground">{count ? 'Choose one from the sidebar to open it here.' : 'Run a project on localhost and Samo will find it.'}</div>
    </div>
  );
}
