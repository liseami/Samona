/**
 * [INPUT]: 依赖 react，zustand，@shared/model 的 Tab/tabTitle，../../store/browser 的 useBrowser/send，../../icons 的 Close，../../lib/utils 的 cn，./sidebar/Favicon，window.samo.query（thumbnails）
 * [OUTPUT]: 对外提供 TabOverview 组件（Safari 式标签矩阵：当前身份所有标签的截图卡片，交错入场，点选切换、悬停关闭、Esc/点空白退出）与 openOverview(identityId)（先截图再打开，避免网页视图隐藏后截不到）
 * [POS]: modules/browser 面板的第二形态；网页视图由主进程在 layout.overview 时隐藏，这里以面板卡的底色铺满
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { tabTitle, type Tab } from '@shared/model';
import { Close } from '../../icons';
import { cn } from '../../lib/utils';
import { send, useBrowser } from '../../store/browser';
import { Favicon } from './sidebar/Favicon';

interface OverviewState {
  thumbs: Record<string, string>;
  setThumbs(thumbs: Record<string, string>): void;
}
const useOverview = create<OverviewState>((set) => ({ thumbs: {}, setThumbs: (thumbs) => set({ thumbs }) }));

/** 先截图再切换：网页视图隐藏后 capturePage 拿不到活动页 */
export async function openOverview(identityId: number): Promise<void> {
  try {
    const list = await window.samo.query({ type: 'thumbnails', identityId });
    useOverview.getState().setThumbs(Object.fromEntries(list.map((t) => [t.tabId, t.dataUrl])));
  } catch {
    useOverview.getState().setThumbs({});
  }
  send({ type: 'layout.overview', open: true });
}
export const closeOverview = () => send({ type: 'layout.overview', open: false });

export function TabOverview() {
  const identityId = useBrowser((s) => s.snapshot?.activeIdentityId ?? -1);
  const allTabs = useBrowser((s) => s.snapshot?.tabs);
  const activeTabId = useBrowser((s) => s.snapshot?.activeTabIdByIdentity[identityId] ?? null);
  const thumbs = useOverview((s) => s.thumbs);
  const tabs = useMemo(() => (allTabs ?? []).filter((t) => t.identityId === identityId && !t.appId), [allTabs, identityId]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && closeOverview();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="no-drag absolute inset-0 overflow-y-auto bg-panel p-6" onClick={(e) => e.target === e.currentTarget && closeOverview()}>
      {tabs.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No open tabs</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {tabs.map((tab, i) => (
            <OverviewCard key={tab.id} tab={tab} thumb={thumbs[tab.id]} active={tab.id === activeTabId} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewCard({ tab, thumb, active, index }: { tab: Tab; thumb?: string; active: boolean; index: number }) {
  const open = () => {
    send({ type: 'tab.activate', tabId: tab.id });
    closeOverview();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className={cn(
        'overview-in group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md',
        active ? 'border-primary/50 ring-2 ring-primary/25' : 'border-border',
      )}
      style={{ animationDelay: `${index * 28}ms` }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover object-top" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Favicon tab={tab} size={28} />
          </div>
        )}
        <button
          type="button"
          aria-label="Close tab"
          onClick={(e) => {
            e.stopPropagation();
            send({ type: 'tab.close', tabId: tab.id });
          }}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Close size={11} />
        </button>
      </div>
      <div className="flex h-9 items-center gap-2 border-t border-border px-3">
        <Favicon tab={tab} size={14} />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{tabTitle(tab)}</span>
      </div>
    </div>
  );
}
