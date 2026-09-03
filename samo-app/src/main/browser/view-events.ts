/**
 * [INPUT]: 依赖 electron 的 WebContents/shell，./store 的 BrowserStore，./history 的 HistoryStore，@shared/model 的 Tab
 * [OUTPUT]: 对外提供 wireTabEvents(host, tabId, wc)：把 webContents 的事件流投影为 Tab 字段变化、历史记录与 window.open 转新标签
 * [POS]: browser 模块的感知层，engine 在创建视图时调用一次；它只写 store/history，不做导航决策（决策在 engine）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { shell, type WebContents } from 'electron';
import type { Tab } from '@shared/model';
import type { BrowserStore } from './store';
import type { HistoryStore } from './history';

export interface ViewEventHost {
  store: BrowserStore;
  history: HistoryStore;
  publicUrl(url: string): string;
  openFromTab(openerId: string, url: string, background: boolean): void;
  onViewGone(tabId: string, wc: WebContents): void;
}

export function wireTabEvents(host: ViewEventHost, tabId: string, wc: WebContents): void {
  const patch = (p: Partial<Tab>) => host.store.updateTab(tabId, p);
  const nav = () =>
    patch({
      url: host.publicUrl(wc.getURL()),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    });

  wc.on('did-start-loading', () => patch({ loading: true }));
  wc.on('did-stop-loading', () => {
    patch({ loading: false });
    nav();
  });
  wc.on('did-navigate', (_e, url) => {
    nav();
    host.history.record(url, wc.getTitle());
  });
  wc.on('did-navigate-in-page', (_e, url, isMainFrame) => {
    nav();
    if (isMainFrame) host.history.record(url, wc.getTitle());
  });
  wc.on('page-title-updated', (_e, title) => {
    patch({ title: title || host.publicUrl(wc.getURL()) });
    host.history.touchTitle(wc.getURL(), title);
  });
  wc.on('page-favicon-updated', (_e, favicons) => patch({ favicon: favicons[0] ?? null }));
  wc.on('media-started-playing', () => patch({ audible: wc.isCurrentlyAudible() || true }));
  wc.on('media-paused', () => patch({ audible: wc.isCurrentlyAudible() }));
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3) patch({ loading: false, title: `${desc} (${code})`, url: host.publicUrl(url) });
  });
  wc.on('destroyed', () => host.onViewGone(tabId, wc));

  // 新窗口请求 → 同 Space 新标签（Arc 语义：紧随其后；后台标签不抢焦点）
  wc.setWindowOpenHandler(({ url, disposition }) => {
    if (/^(https?|file|about):/i.test(url)) host.openFromTab(tabId, url, disposition === 'background-tab');
    else void shell.openExternal(url);
    return { action: 'deny' };
  });
}
