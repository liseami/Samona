/**
 * [INPUT]: 依赖 electron 的 Menu/app，./browser/engine 的 BrowserEngine，./shell/window 的 ShellWindow，./chat/service 的 ChatService，@shared/ipc 的 CHANNELS/ShellEvent
 * [OUTPUT]: 对外提供 installMenu(engine, window)：应用菜单与全部快捷键（⌘T/⌘L/⌘W/⇧⌘T/⇧⌘A/⌃Tab/⌘S/⌘[ ]/⌘R/⌘1-9/⌃1-9/⌥⌘←→/⇧⌘N/⇧⌘C/⌘D…，沿用 phi 与 Arc 的默认键位）
 * [POS]: main 的输入路由，把菜单加速键翻译成 engine 动作或壳事件；渲染层不自行监听全局快捷键，避免两处真相
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Menu, app, type MenuItemConstructorOptions } from 'electron';
import { CHANNELS, type PaletteMode, type ShellEvent } from '@shared/ipc';
import type { BrowserEngine } from './browser/engine';
import type { ShellWindow } from './shell/window';
import type { ChatService } from './chat/service';

export function installMenu(engine: BrowserEngine, window: ShellWindow, chat: ChatService): void {
  // 需要键盘落到壳里的事件，先把 OS 焦点从网页视图挪回壳视图，否则 ⌘T/⌘L 之后敲的字会进网页
  const { store } = engine;
  const emit = (event: ShellEvent) => {
    window.focusShell();
    window.send(CHANNELS.event, event);
  };
  const palette = (mode: PaletteMode) => window.openPalette({ type: 'openPalette', mode, url: store.activeTab()?.url ?? '' });
  const isMac = process.platform === 'darwin';

  const tabByOrdinal = (n: number) => {
    const tabs = store.tabsInIdentity(store.activeIdentityId);
    const target = n === 9 ? tabs[tabs.length - 1] : tabs[n - 1];
    if (target) engine.activateTab(target.id);
  };
  const spaceByOrdinal = (n: number) => {
    const target = store.allIdentities()[n - 1];
    if (target) engine.activateIdentity(target.id);
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => palette('newTab') },
        { label: 'New Folder', accelerator: 'CmdOrCtrl+Shift+F', click: () => emit({ type: 'renameFolder', folderId: engine.createFolder() }) },
        { label: 'New Identity', accelerator: 'CmdOrCtrl+Shift+N', click: () => emit({ type: 'editIdentity', identityId: engine.createIdentity({ name: 'New Identity' }).id }) },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => engine.closeTab() },
        { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => engine.reopenClosed() },
        { type: 'separator' },
        { label: 'Pin Tab', accelerator: 'CmdOrCtrl+D', click: () => store.activeTab() && engine.pinTab(store.activeTabId()!, !store.activeTab()!.pinned) },
        { label: 'Rename Tab', accelerator: 'CmdOrCtrl+Shift+R', click: () => store.activeTabId() && emit({ type: 'renameTab', tabId: store.activeTabId()! }) },
        { label: 'Copy URL', accelerator: 'CmdOrCtrl+Shift+C', click: () => engine.copyUrl() },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Open Location', accelerator: 'CmdOrCtrl+L', click: () => palette('editUrl') },
        { label: 'Show All Tabs', accelerator: 'CmdOrCtrl+Shift+\\', click: () => store.setLayout({ overview: !store.getLayout().overview }) },
        { label: 'Search Tabs', accelerator: 'CmdOrCtrl+Shift+A', click: () => palette('searchTabs') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+S', click: () => store.setLayout({ sidebarCollapsed: !store.getLayout().sidebarCollapsed }) },
        { label: 'Toggle Samo AI', accelerator: 'CmdOrCtrl+I', click: () => chat.setMode(chat.store.currentMode === 'closed' ? 'floating' : 'closed') },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => engine.reload() },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => engine.zoom(0) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => engine.zoom(1) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', visible: false, acceleratorWorksWhenHidden: true, click: () => engine.zoom(1) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => engine.zoom(-1) },
        { label: 'Developer Tools', accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I', click: () => engine.openDevTools() },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'History',
      submenu: [
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => engine.back() },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => engine.forward() },
      ],
    },
    {
      label: 'Tabs',
      submenu: [
        { label: 'Recent Tab', accelerator: 'Ctrl+Tab', click: () => engine.switchMru() },
        { label: 'Close All Unpinned', accelerator: 'CmdOrCtrl+Shift+W', click: () => engine.closeUnpinned() },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: i === 8 ? 'Last Tab' : `Tab ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          click: () => tabByOrdinal(i + 1),
        })),
      ],
    },
    {
      label: 'Identities',
      submenu: [
        { label: 'Next Identity', accelerator: isMac ? 'Alt+Cmd+Right' : 'Ctrl+Alt+Right', click: () => engine.stepIdentity(1) },
        { label: 'Previous Identity', accelerator: isMac ? 'Alt+Cmd+Left' : 'Ctrl+Alt+Left', click: () => engine.stepIdentity(-1) },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i) => ({ label: `Identity ${i + 1}`, accelerator: `Ctrl+${i + 1}`, click: () => spaceByOrdinal(i + 1) })),
      ],
    },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  app.setAboutPanelOptions({ applicationName: 'Samo', applicationVersion: app.getVersion() });
}
