/**
 * [INPUT]: 依赖 electron 的 WebContents/shell，./store 的 BrowserStore，./history 的 HistoryStore，./page-context-menu 的 showPageContextMenu，@shared/model 的 Tab
 * [OUTPUT]: 对外提供 wireTabEvents(host, tabId, wc)：把 webContents 的事件流投影为 Tab 字段变化、历史记录，以及 Electron 默认缺失的浏览器体验——window.open 的去向（⌘点击/后台标签/OAuth 弹窗）、HTML5 全屏、悬停链接地址、主框架加载失败的错误页、外部协议交给系统、页内查找结果、网页右键菜单
 * [POS]: browser 模块的感知层，engine 在创建视图时调用一次；它只写 store/history 并回调 host，不做导航决策（决策在 engine）。phi 这些由原生 Chromium 壳自带，Samo 在 Electron 上逐项补齐
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { shell, type WebContents, type BaseWindow } from 'electron';
import type { Tab } from '@shared/model';
import { showPageContextMenu } from './page-context-menu';
import { traceFrames } from './net-trace';
import type { BrowserStore } from './store';
import type { HistoryStore } from './history';

export interface ViewEventHost {
  store: BrowserStore;
  history: HistoryStore;
  publicUrl(url: string): string;
  errorUrl(code: number, description: string, url: string): string; // 内部错误页地址
  openFromTab(openerId: string, url: string, background: boolean): void;
  search(query: string): void;
  saveImage(url: string): void;
  htmlFullscreen(tabId: string, on: boolean): void;
  hoverUrl(tabId: string, url: string): void;
  findResult(tabId: string, current: number, total: number): void;
  onViewGone(tabId: string, wc: WebContents): void;
  popupParent(): BaseWindow; // OAuth 登录弹窗的归属窗口
}

const WEB_SCHEME = /^(https?|file|about|blob|data|samo):/i;
const ERR_ABORTED = -3;
const ERR_UNKNOWN_URL_SCHEME = -302;

export function wireTabEvents(host: ViewEventHost, tabId: string, wc: WebContents): void {
  traceFrames(wc);
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

  // ---- 主框架加载失败：Electron 只留白屏，这里换成 Samo 的错误页（可重试）；未知协议交给系统 ----
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === ERR_ABORTED) return;
    patch({ loading: false });
    if (code === ERR_UNKNOWN_URL_SCHEME) {
      void shell.openExternal(url);
      return;
    }
    if (url.startsWith(host.errorUrl(0, '', '').split('?')[0])) return; // 错误页自己失败了：别循环
    patch({ title: `${desc} (${code})`, url: host.publicUrl(url) });
    void wc.loadURL(host.errorUrl(code, desc, url)).catch(() => {});
  });
  // ---- 外部协议（mailto:、自定义 scheme）：交给系统，不在标签里空转 ----
  wc.on('will-navigate', (e, url) => {
    if (WEB_SCHEME.test(url)) return;
    e.preventDefault();
    void shell.openExternal(url);
  });
  // ---- HTML5 全屏（视频全屏）：网页视图铺满窗口 ----
  wc.on('enter-html-full-screen', () => host.htmlFullscreen(tabId, true));
  wc.on('leave-html-full-screen', () => host.htmlFullscreen(tabId, false));
  // ---- 悬停链接地址：Chromium 显示在左下角，Samo 显示在面板头部的地址栏里 ----
  wc.on('update-target-url', (_e, url) => host.hoverUrl(tabId, url));
  // ---- 页内查找结果 ----
  wc.on('found-in-page', (_e, r) => host.findResult(tabId, r.activeMatchOrdinal, r.matches));
  // ---- 网页右键菜单 ----
  wc.on('context-menu', (_e, params) =>
    showPageContextMenu(wc, params, {
      openUrl: (url, background) => host.openFromTab(tabId, url, background),
      search: (q) => host.search(q),
      saveImage: (url) => host.saveImage(url),
    }),
  );
  wc.on('destroyed', () => host.onViewGone(tabId, wc));

  // ---- window.open 的去向（浏览器体验的关键：登录弹窗必须像真浏览器一样活着）----
  // 决策依据：disposition（Chromium 依 window.open 特性给出）+ frameName（具名弹窗）。
  //   · 外部协议         → 交给系统
  //   · 具名或带特性的弹窗 → 真正的弹窗窗口，且 **继承开启标签的 session**（否则 OAuth/微信登录
  //                        拿不到用户的登录态与 cookie，扫码/授权后主页面永远不知道已登录），
  //                        归属壳窗口、居中、保住 window.opener，让页面能 postMessage / 轮询 popup.closed
  //   · 普通链接（⌘点击/新前台）→ 落成 Samo 标签
  wc.setWindowOpenHandler(({ url, disposition, features, frameName }) => {
    if (!WEB_SCHEME.test(url) || /^samo:/i.test(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    const isPopup = disposition === 'new-window' || (!!frameName && disposition !== 'background-tab');
    if (isPopup) {
      const size = (k: string) => Number(new RegExp(`\\b${k}=(\\d+)`).exec(features)?.[1] ?? 0);
      return {
        action: 'allow',
        outlivesOpener: false,
        overrideBrowserWindowOptions: {
          parent: host.popupParent(),
          width: Math.min(size('width') || 480, 1000),
          height: Math.min(size('height') || 640, 900),
          center: true,
          minimizable: false,
          maximizable: false,
          fullscreenable: false,
          autoHideMenuBar: true,
          // 关键：与开启标签同一 session，登录态/cookie 全程一致
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, session: wc.session },
        },
      };
    }
    host.openFromTab(tabId, url, disposition === 'background-tab');
    return { action: 'deny' };
  });
}
