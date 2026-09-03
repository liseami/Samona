/**
 * [INPUT]: 依赖 @shared/url 的 displayUrl，../../icons 的 Home，./AppLogo，../../store/browser 的 useBrowser/send，../../components/ui/{button,tooltip}，../../shell/PanelHeader，../browser/NavButtons
 * [OUTPUT]: 对外提供 AppsPanelHeader 组件：应用维度的面板头部——左 后退/前进/刷新；中 当前应用（图标 + 名称 + 地址）；右 回桌面
 * [POS]: modules/apps 的头部（Laper PanelHeader 三槽），与浏览器头部共用 NavButtons
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { displayUrl } from '@shared/url';
import { Home } from '../../icons';
import { AppLogo } from './AppLogo';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { PanelHeader } from '../../shell/PanelHeader';
import { NavButtons } from '../browser/NavButtons';

export function AppsPanelHeader() {
  const app = useBrowser((s) => s.snapshot?.apps.find((a) => a.id === s.snapshot?.activeAppId) ?? null);
  const center = (
    <div className="flex h-7 w-full items-center gap-2 rounded-2xl border border-border bg-input px-2.5 text-left">
      {app && <AppLogo app={app} size={14} />}
      <span className="min-w-0 flex-1 truncate text-center text-base text-foreground">{app ? app.name : 'Desktop'}</span>
      {app && <span className="shrink-0 text-xs text-muted-foreground">{displayUrl(app.url)}</span>}
    </div>
  );
  const actions = (
    <Tip label="Desktop">
      <Button variant="icon" className={app ? 'text-muted-foreground' : 'bg-accent text-foreground'} onClick={() => send({ type: 'apps.home' })}>
        <Home size={15} />
      </Button>
    </Tip>
  );
  return <PanelHeader title={<NavButtons />} center={center} actions={actions} />;
}
