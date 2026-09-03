/**
 * [INPUT]: 依赖 electron 的 Menu/clipboard/dialog/MenuItemConstructorOptions，../browser/engine 的 BrowserEngine，../shell/window 的 ShellWindow，../apps/service 的 AppsService，@shared/ipc 的 CHANNELS/ShellEvent，@shared/model 的 IDENTITY_COLORS/FolderColor
 * [OUTPUT]: 对外提供 ContextMenus 类：tab/identity/folder/tabList/app 五种原生右键菜单（Menu.popup 于壳窗口，跟随鼠标位置）
 * [POS]: menus 模块的唯一成员；原生菜单保证与系统观感一致并天然浮在 WebContentsView 之上，重命名/编辑等需要内联 UI 的动作通过 ShellEvent 交回渲染层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Menu, clipboard, dialog, type MenuItemConstructorOptions } from 'electron';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
import { IDENTITY_COLORS, type FolderColor } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import type { ShellWindow } from '../shell/window';
import type { AppsService } from '../apps/service';

const FOLDER_COLORS: FolderColor[] = ['grey', ...IDENTITY_COLORS];

export class ContextMenus {
  constructor(
    private readonly engine: BrowserEngine,
    private readonly window: ShellWindow,
    private readonly apps: AppsService,
  ) {}

  private emit(event: ShellEvent): void {
    this.window.focusShell(); // 重命名/编辑器需要键盘落在壳里
    this.window.send(CHANNELS.event, event);
  }

  private popup(template: MenuItemConstructorOptions[]): void {
    Menu.buildFromTemplate(template).popup({ window: this.window.win });
  }

  // ============ 标签（散装 / 固定 / 收藏共用） ============
  tab(tabId: string): void {
    const { store } = this.engine;
    const tab = store.getTab(tabId);
    if (!tab) return;
    const isFavorite = tab.identityId === null;
    const identities = store.allIdentities().filter((s) => s.id !== tab.identityId && s.ownership === 'user');
    const folders = tab.identityId !== null ? store.foldersInIdentity(tab.identityId).filter((f) => f.id !== tab.folderId) : [];

    this.popup([
      { label: 'Rename…', click: () => this.emit({ type: 'renameTab', tabId }) },
      { type: 'separator' },
      ...(isFavorite
        ? [{ label: 'Remove from Favorites', click: () => this.engine.favoriteTab(tabId, false) }]
        : [
            { label: tab.pinned ? 'Unpin' : 'Pin', click: () => this.engine.pinTab(tabId, !tab.pinned) },
            { label: 'Add to Favorites', click: () => this.engine.favoriteTab(tabId, true) },
          ]),
      { label: 'Duplicate', click: () => this.engine.duplicateTab(tabId) },
      {
        label: 'Move to Identity',
        enabled: identities.length > 0,
        submenu: identities.map((s) => ({
          label: s.name,
          click: () => this.engine.moveTab(tabId, { identityId: s.id, pinned: !isFavorite && tab.pinned, folderId: null, index: Number.MAX_SAFE_INTEGER }),
        })),
      },
      ...(isFavorite || tab.pinned
        ? []
        : [
            {
              label: 'Add to Folder',
              submenu: [
                ...folders.map((f) => ({
                  label: f.name,
                  click: () => this.engine.moveTab(tabId, { identityId: tab.identityId, pinned: false, folderId: f.id, index: Number.MAX_SAFE_INTEGER }),
                })),
                ...(folders.length ? [{ type: 'separator' as const }] : []),
                {
                  label: 'New Folder with Tab',
                  click: () => {
                    const id = this.engine.createFolder(tab.identityId!, 'New Folder', [tabId]);
                    this.emit({ type: 'renameFolder', folderId: id });
                  },
                },
              ],
            },
            ...(tab.folderId
              ? [{ label: 'Remove from Folder', click: () => this.engine.moveTab(tabId, { identityId: tab.identityId, pinned: false, folderId: null, index: Number.MAX_SAFE_INTEGER }) }]
              : []),
          ]),
      { type: 'separator' },
      ...(tab.audible || tab.muted ? [{ label: tab.muted ? 'Unmute' : 'Mute', click: () => this.engine.muteTab(tabId, !tab.muted) }] : []),
      { label: 'Copy URL', click: () => this.engine.copyUrl(tabId) },
      { label: 'Developer Tools', click: () => this.engine.openDevTools(tabId) },
      { type: 'separator' },
      { label: isFavorite || tab.pinned ? 'Unload' : 'Close', click: () => this.engine.closeTab(tabId) },
      ...(isFavorite
        ? []
        : [
            { label: 'Close Others', click: () => this.engine.closeOthers(tabId) },
            { label: 'Close Tabs Below', click: () => this.engine.closeBelow(tabId) },
          ]),
    ]);
  }

  // ============ Identity ============
  identity(identityId: number): void {
    const { store } = this.engine;
    const identity = store.getIdentity(identityId);
    if (!identity) return;
    this.popup([
      { label: 'Edit Identity…', click: () => this.emit({ type: 'editIdentity', identityId }) },
      { label: 'New Identity', click: () => this.emit({ type: 'editIdentity', identityId: this.engine.createIdentity({ name: 'New Identity' }).id }) },
      { type: 'separator' },
      { label: 'Close All Unpinned Tabs', click: () => this.engine.closeUnpinned(identityId) },
      { type: 'separator' },
      {
        label: 'Delete Identity',
        enabled: store.allIdentities().length > 1,
        click: async () => {
          const { response } = await dialog.showMessageBox(this.window.win, {
            type: 'warning',
            message: `Delete “${identity.name}”?`,
            detail: 'All tabs in this identity will be closed. Favorites are kept.',
            buttons: ['Delete', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
          });
          if (response === 0) this.engine.deleteIdentity(identityId);
        },
      },
    ]);
  }

  // ============ 文件夹 ============
  folder(folderId: string): void {
    const folder = this.engine.store.getFolder(folderId);
    if (!folder) return;
    this.popup([
      { label: 'Rename…', click: () => this.emit({ type: 'renameFolder', folderId }) },
      {
        label: 'Color',
        submenu: FOLDER_COLORS.map((c) => ({ label: c[0].toUpperCase() + c.slice(1), type: 'radio' as const, checked: folder.color === c, click: () => this.engine.updateFolder(folderId, { color: c }) })),
      },
      { label: folder.collapsed ? 'Expand' : 'Collapse', click: () => this.engine.updateFolder(folderId, { collapsed: !folder.collapsed }) },
      { type: 'separator' },
      { label: 'New Tab in Folder', click: () => this.engine.createTab({ identityId: folder.identityId, folderId, activate: true }) },
      { type: 'separator' },
      { label: 'Close All Tabs', click: () => this.engine.deleteFolder(folderId, true) },
      { label: 'Delete Folder (keep tabs)', click: () => this.engine.deleteFolder(folderId, false) },
    ]);
  }

  // ============ 列表空白处 ============
  /** 应用卡：固定到顶部 / 在浏览器打开 / 复制地址 / 重扫 */
  app(id: string): void {
    const app = this.engine.store.appList.find((a) => a.id === id);
    if (!app) return;
    this.popup([
      { label: app.pinned ? 'Unpin' : 'Pin to Top', click: () => this.apps.pin(id, !app.pinned) },
      { type: 'separator' },
      { label: 'Open in Browser', enabled: !app.offline, click: () => this.apps.openInBrowser(id) },
      { label: 'Copy URL', click: () => clipboard.writeText(app.url) },
      { type: 'separator' },
      { label: 'Rescan localhost', click: () => void this.apps.rescan() },
    ]);
  }

  tabList(identityId: number): void {
    this.popup([
      { label: 'New Tab', click: () => this.engine.createTab({ identityId, activate: true }) },
      {
        label: 'New Folder',
        click: () => this.emit({ type: 'renameFolder', folderId: this.engine.createFolder(identityId) }),
      },
      { type: 'separator' },
      { label: 'Reopen Closed Tab', enabled: this.engine.store.snapshot().closedCount > 0, click: () => this.engine.reopenClosed() },
      { label: 'Close All Unpinned Tabs', click: () => this.engine.closeUnpinned(identityId) },
    ]);
  }
}
