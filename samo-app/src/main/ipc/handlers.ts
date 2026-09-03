/**
 * [INPUT]: 依赖 electron 的 ipcMain，@shared/ipc 的 CHANNELS/Command/Query，@shared/model 的 Suggestion/tabTitle，@shared/url 的 resolveInput，../browser/{engine,downloads} 与 ../menus/context-menu，../shell/window
 * [OUTPUT]: 对外提供 registerIpc(deps)：把渲染层的 Command 联合逐一映射到 engine/downloads/menus/chat/window 动作，Query（suggest）合并「打开的标签 + 历史 + 直达/搜索」返回建议，并把 store 快照推给壳
 * [POS]: ipc 模块的唯一成员，是渲染层与主进程之间唯一的命令/查询入口；新增命令只需在 switch 增加一个 case
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ipcMain } from 'electron';
import { CHANNELS, type Command, type Query, type ShellEvent } from '@shared/ipc';
import { NEW_TAB_URL, tabTitle, type Suggestion } from '@shared/model';
import { resolveInput } from '@shared/url';
import type { BrowserEngine } from '../browser/engine';
import type { DownloadManager } from '../browser/downloads';
import type { ContextMenus } from '../menus/context-menu';
import type { ChatService } from '../chat/service';
import type { ShellWindow } from '../shell/window';

export interface IpcDeps {
  engine: BrowserEngine;
  downloads: DownloadManager;
  menus: ContextMenus;
  window: ShellWindow;
  chat: ChatService;
  setApiKey: (key: string) => void; // 保存密钥并热切换回答者
}

export function registerIpc({ engine, downloads, menus, window, chat, setApiKey }: IpcDeps): void {
  const { store } = engine;
  ipcMain.handle(CHANNELS.getState, () => store.snapshot());
  ipcMain.handle(CHANNELS.getChat, () => chat.store.snapshot());
  store.subscribe((snapshot) => window.send(CHANNELS.state, snapshot));

  ipcMain.handle(CHANNELS.query, (_event, query: Query) => {
    switch (query.type) {
      case 'suggest':
        return suggest(engine, query.input, query.limit ?? 6, query.tabsOnly ?? false);
      case 'thumbnails':
        return engine.captureThumbnails(query.identityId);
      default: {
        const never: never = query;
        throw new Error(`unknown query ${JSON.stringify(never)}`);
      }
    }
  });

  ipcMain.handle(CHANNELS.invoke, (_event, command: Command) => {
    switch (command.type) {
      // ---- 标签 ----
      case 'tab.create':
        engine.createTab({ url: command.url, identityId: command.identityId, pinned: command.pinned, folderId: command.folderId, activate: command.activate ?? true });
        break;
      case 'tab.activate':
        engine.activateTab(command.tabId);
        break;
      case 'tab.close':
        engine.closeTab(command.tabId);
        break;
      case 'tab.closeOthers':
        engine.closeOthers(command.tabId);
        break;
      case 'tab.closeBelow':
        engine.closeBelow(command.tabId);
        break;
      case 'tab.closeUnpinned':
        engine.closeUnpinned(command.identityId);
        break;
      case 'tab.reopen':
        engine.reopenClosed();
        break;
      case 'tab.navigate':
        engine.navigate(command.input, command.tabId);
        break;
      case 'tab.back':
        engine.back(command.tabId);
        break;
      case 'tab.forward':
        engine.forward(command.tabId);
        break;
      case 'tab.reload':
        engine.reload(command.tabId);
        break;
      case 'tab.stop':
        engine.stop(command.tabId);
        break;
      case 'tab.pin':
        engine.pinTab(command.tabId, command.pinned);
        break;
      case 'tab.favorite':
        engine.favoriteTab(command.tabId, command.favorite);
        break;
      case 'tab.move':
        engine.moveTab(command.tabId, command.to);
        break;
      case 'tab.rename':
        engine.renameTab(command.tabId, command.title);
        break;
      case 'tab.duplicate':
        engine.duplicateTab(command.tabId);
        break;
      case 'tab.mute':
        engine.muteTab(command.tabId, command.muted);
        break;
      case 'tab.switchMru':
        engine.switchMru();
        break;
      // ---- 文件夹 ----
      case 'folder.create':
        engine.createFolder(command.identityId, command.name, command.tabIds);
        break;
      case 'folder.update':
        engine.updateFolder(command.folderId, { name: command.name, color: command.color, collapsed: command.collapsed });
        break;
      case 'folder.delete':
        engine.deleteFolder(command.folderId, command.closeTabs);
        break;
      // ---- Identity ----
      case 'identity.create': {
        const identity = engine.createIdentity({ name: command.name, icon: command.icon, color: command.color });
        if (command.edit) window.send(CHANNELS.event, { type: 'editIdentity', identityId: identity.id } satisfies ShellEvent);
        break;
      }
      case 'identity.activate':
        engine.activateIdentity(command.identityId);
        break;
      case 'identity.step':
        engine.stepIdentity(command.delta);
        break;
      case 'identity.update':
        engine.updateIdentity(command.identityId, { name: command.name, icon: command.icon, color: command.color });
        break;
      case 'identity.reorder':
        engine.reorderIdentity(command.identityId, command.index);
        break;
      case 'identity.delete':
        engine.deleteIdentity(command.identityId);
        break;
      case 'identity.takeControl':
        engine.takeControl(command.identityId);
        break;
      case 'identity.handBack':
        engine.handBack(command.identityId);
        break;
      // ---- 原生菜单 ----
      case 'menu.tab':
        menus.tab(command.tabId);
        break;
      case 'menu.identity':
        menus.identity(command.identityId);
        break;
      case 'menu.folder':
        menus.folder(command.folderId);
        break;
      case 'menu.tabList':
        menus.tabList(command.identityId);
        break;
      // ---- 下载 ----
      case 'download.open':
        downloads.open(command.id);
        break;
      case 'download.reveal':
        downloads.reveal(command.id);
        break;
      case 'download.cancel':
        downloads.cancel(command.id);
        break;
      case 'download.clear':
        downloads.clear();
        break;
      // ---- 命令面板 ----
      case 'palette.open':
        window.openPalette({ type: 'openPalette', mode: command.mode, url: store.activeTab()?.url ?? '' });
        break;
      case 'palette.close':
        window.closePalette();
        break;
      // ---- AI 对话 ----
      case 'chat.setApiKey':
        setApiKey(command.key);
        break;
      case 'chat.setMode':
        chat.setMode(command.mode);
        break;
      case 'chat.send':
        void chat.send(command.text);
        break;
      case 'chat.stop':
        chat.stop();
        break;
      case 'chat.newThread':
        chat.newThread();
        break;
      case 'chat.switchThread':
        chat.switchThread(command.threadId);
        break;
      case 'chat.deleteThread':
        chat.deleteThread(command.threadId);
        break;
      case 'chat.setDockWidth':
        chat.store.setDockWidth(command.width);
        break;
      // ---- 壳：模块与窗口 ----
      case 'module.activate':
        store.setLayout({ module: command.module });
        break;
      case 'window.close':
        window.win.close();
        break;
      case 'window.minimize':
        window.win.minimize();
        break;
      case 'window.zoom':
        window.zoom(command.fullscreen ?? true);
        break;
      // ---- 布局与壳 ----
      case 'layout.sidebar':
        store.setLayout({ sidebarWidth: command.width, sidebarCollapsed: command.collapsed });
        break;
      case 'layout.overview':
        store.setLayout({ overview: command.open });
        break;
      case 'layout.peek':
        store.setPeek(command.peek);
        break;
      case 'shell.openDevTools':
        engine.openDevTools(command.tabId);
        break;
      case 'shell.copyUrl':
        engine.copyUrl(command.tabId);
        break;
      default: {
        const never: never = command;
        throw new Error(`unknown command ${(never as { type: string }).type}`);
      }
    }
  });
}

/** 地址栏建议：打开的标签（切换）→ 历史 → 直达 URL 或搜索 */
function suggest(engine: BrowserEngine, input: string, limit: number, tabsOnly: boolean): Suggestion[] {
  const q = input.trim();
  const lower = q.toLowerCase();
  const out: Suggestion[] = [];
  const { store } = engine;
  if (!q && !tabsOnly) return out; // 地址模式下空输入不出建议；标签搜索模式下空输入列出全部
  const allTabs = [...store.favorites(), ...store.allIdentities().flatMap((s) => store.tabsInIdentity(s.id))].filter((t) => t.url !== NEW_TAB_URL);
  const openTabs = allTabs.filter((t) => !lower || tabTitle(t).toLowerCase().includes(lower) || t.url.toLowerCase().includes(lower)).slice(0, tabsOnly ? limit : 3);
  for (const t of openTabs) out.push({ kind: 'tab', tabId: t.id, title: tabTitle(t), url: t.url });
  if (tabsOnly || !q) return out;
  const seen = new Set(openTabs.map((t) => t.url));
  for (const h of engine.history.search(q, limit)) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push({ kind: 'history', title: h.title, url: h.url });
    if (out.length >= limit - 1) break;
  }
  const resolved = resolveInput(q);
  if (resolved.startsWith('https://www.google.com/search?q=')) out.unshift({ kind: 'search', query: q, url: resolved });
  else out.unshift({ kind: 'url', url: resolved });
  return out.slice(0, limit);
}
