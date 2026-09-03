/**
 * [INPUT]: 依赖 react，../../icons 的 Copy/Copied/TabsOverview，../../store/browser 的 useBrowser/send/selectActiveTab，../../components/ui/{button,tooltip}，../../shell/PanelHeader，./NavButtons，./UrlField，./TabOverview 的 openOverview/closeOverview
 * [OUTPUT]: 对外提供 BrowserPanelHeader 组件：面板卡头部——左：后退/前进/刷新（加载中变停止）；中：地址栏（点击开 ⌘T 同款命令面板）；右：复制地址、标签矩阵开关
 * [POS]: modules/browser 的头部（Laper PanelHeader 三槽）；导航从侧栏搬到这里，侧栏只留标签与身份
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import { Copied, Copy, TabsOverview } from '../../icons';
import { selectActiveTab, send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Tip } from '../../components/ui/tooltip';
import { PanelHeader } from '../../shell/PanelHeader';
import { cn } from '../../lib/utils';
import { UrlField } from './UrlField';
import { FindBar } from './FindBar';
import { NavButtons } from './NavButtons';
import { closeOverview, openOverview } from './TabOverview';

export function BrowserPanelHeader() {
  const tab = useBrowser(selectActiveTab);
  const overview = useBrowser((s) => s.snapshot?.layout.overview ?? false);
  const identityId = useBrowser((s) => s.snapshot?.activeIdentityId ?? -1);
  const [copied, setCopied] = useState(false);
  const [finding, setFinding] = useState(false); // ⌘F：中槽从地址栏切成查找条
  useEffect(() => window.samo.onEvent((e) => e.type === 'focusFind' && setFinding(true)), []);

  const tools = (
    <>
      <Tip label={copied ? 'Copied' : 'Copy URL ⇧⌘C'}>
        <Button
          variant="icon"
          className="text-muted-foreground"
          disabled={!tab}
          onClick={() => {
            send({ type: 'shell.copyUrl' });
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Copied size={15} /> : <Copy size={15} />}
        </Button>
      </Tip>
      <Tip label={overview ? 'Hide all tabs ⇧⌘\\' : 'Show all tabs ⇧⌘\\'}>
        <Button
          variant="icon"
          className={cn(overview ? 'bg-accent text-foreground' : 'text-muted-foreground')}
          onClick={() => (overview ? closeOverview() : void openOverview(identityId))}
        >
          <TabsOverview size={15} />
        </Button>
      </Tip>
    </>
  );
  return <PanelHeader title={<NavButtons />} center={finding ? <FindBar onClose={() => setFinding(false)} /> : <UrlField />} actions={tools} />;
}
