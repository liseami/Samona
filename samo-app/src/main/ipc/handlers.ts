/**
 * [INPUT]: 依赖 electron 的 ipcMain，@shared/ipc 的 CHANNELS/Command/Query，@shared/model 的 Suggestion/tabTitle，@shared/url 的 resolveInput，../browser/{engine,downloads} 与 ../menus/context-menu，../shell/window
 * [OUTPUT]: 对外提供 registerIpc(deps)：把渲染层的 Command 联合逐一映射到 engine/downloads/menus 动作，Query（suggest）合并「打开的标签 + 历史 + 直达/搜索」返回建议，并把 store 快照推给壳
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
import type { ShellWindow } from '../shell/window';

export interface IpcDeps {
  engine: BrowserEngine;
  downloads: DownloadManager;
  menus: ContextMenus;
  window: ShellWindow;
}

export function registerIpc({ engine, downloads, menus, window }: IpcDeps): void {
  const { store } = engine;
  ipcMain.handle(CHANNELS.getState, () => store.snapshot());
  store.subscribe((snapshot) => window.send(CHANNELS.state, snapshot));

  ipcMain.handle(CHANNELS.query, (_event, query: Query) => {
    switch (query.type) {
      case 'suggest':
        return suggest(engine, query.input, query.limit ?? 6, query.tabsOnly ?? false);
      default: {
        const never: never = query.type;
        throw new Error(`unknown query ${String(never)}`);
      }
    }
  });

  ipcMain.handle(CHANNELS.invoke, (_event, command: Command) => {
    switch (command.type) {
      // ---- 标签 ----
      case 'tab.create':
        engine.createTab({ url: command.url, spaceId: command.spaceId, pinned: command.pinned, folderId: command.folderId, activate: command.activate ?? true });
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
        engine.closeUnpinned(command.spaceId);
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
        engine.createFolder(command.spaceId, command.name, command.tabIds);
        break;
      case 'folder.update':
        engine.updateFolder(command.folderId, { name: command.name, color: command.color, collapsed: command.collapsed });
        break;
      case 'folder.delete':
        engine.deleteFolder(command.folderId, command.closeTabs);
        break;
      // ---- Space ----
      case 'space.create': {
        const space = engine.createSpace({ name: command.name, emoji: command.emoji, color: command.color });
        if (command.edit) window.send(CHANNELS.event, { type: 'editSpace', spaceId: space.id } satisfies ShellEvent);
        break;
      }
      case 'space.activate':
        engine.activateSpace(command.spaceId);
        break;
      case 'space.step':
        engine.stepSpace(command.delta);
        break;
      case 'space.update':
        engine.updateSpace(command.spaceId, { name: command.name, emoji: command.emoji, color: command.color });
        break;
      case 'space.reorder':
        engine.reorderSpace(command.spaceId, command.index);
        break;
      case 'space.delete':
        engine.deleteSpace(command.spaceId);
        break;
      case 'space.takeControl':
        engine.takeControl(command.spaceId);
        break;
      case 'space.handBack':
        engine.handBack(command.spaceId);
        break;
      // ---- 原生菜单 ----
      case 'menu.tab':
        menus.tab(command.tabId);
        break;
      case 'menu.space':
        menus.space(command.spaceId);
        break;
      case 'menu.folder':
        menus.folder(command.folderId);
        break;
      case 'menu.tabList':
        menus.tabList(command.spaceId);
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
      // ---- 布局与壳 ----
      case 'layout.sidebar':
        store.setLayout({ sidebarWidth: command.width, sidebarCollapsed: command.collapsed });
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
  const allTabs = [...store.favorites(), ...store.allSpaces().flatMap((s) => store.tabsInSpace(s.id))].filter((t) => t.url !== NEW_TAB_URL);
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
