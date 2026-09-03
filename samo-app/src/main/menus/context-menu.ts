/**
 * [INPUT]: 依赖 electron 的 Menu/dialog/MenuItemConstructorOptions，../browser/engine 的 BrowserEngine，../shell/window 的 ShellWindow，@shared/ipc 的 CHANNELS/ShellEvent，@shared/model 的 SPACE_COLORS/FolderColor
 * [OUTPUT]: 对外提供 ContextMenus 类：tab/space/folder/tabList 四种原生右键菜单（Menu.popup 于壳窗口，跟随鼠标位置）
 * [POS]: menus 模块的唯一成员；原生菜单保证与系统观感一致并天然浮在 WebContentsView 之上，重命名/编辑等需要内联 UI 的动作通过 ShellEvent 交回渲染层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Menu, dialog, type MenuItemConstructorOptions } from 'electron';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
import { SPACE_COLORS, type FolderColor } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import type { ShellWindow } from '../shell/window';

const FOLDER_COLORS: FolderColor[] = ['grey', ...SPACE_COLORS];

export class ContextMenus {
  constructor(
    private readonly engine: BrowserEngine,
    private readonly window: ShellWindow,
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
    const isFavorite = tab.spaceId === null;
    const spaces = store.allSpaces().filter((s) => s.id !== tab.spaceId && s.ownership === 'user');
    const folders = tab.spaceId !== null ? store.foldersInSpace(tab.spaceId).filter((f) => f.id !== tab.folderId) : [];

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
        label: 'Move to Space',
        enabled: spaces.length > 0,
        submenu: spaces.map((s) => ({
          label: `${s.emoji} ${s.name}`,
          click: () => this.engine.moveTab(tabId, { spaceId: s.id, pinned: !isFavorite && tab.pinned, folderId: null, index: Number.MAX_SAFE_INTEGER }),
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
                  click: () => this.engine.moveTab(tabId, { spaceId: tab.spaceId, pinned: false, folderId: f.id, index: Number.MAX_SAFE_INTEGER }),
                })),
                ...(folders.length ? [{ type: 'separator' as const }] : []),
                {
                  label: 'New Folder with Tab',
                  click: () => {
                    const id = this.engine.createFolder(tab.spaceId!, 'New Folder', [tabId]);
                    this.emit({ type: 'renameFolder', folderId: id });
                  },
                },
              ],
            },
            ...(tab.folderId
              ? [{ label: 'Remove from Folder', click: () => this.engine.moveTab(tabId, { spaceId: tab.spaceId, pinned: false, folderId: null, index: Number.MAX_SAFE_INTEGER }) }]
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

  // ============ Space ============
  space(spaceId: number): void {
    const { store } = this.engine;
    const space = store.getSpace(spaceId);
    if (!space) return;
    this.popup([
      { label: 'Edit Space…', click: () => this.emit({ type: 'editSpace', spaceId }) },
      { label: 'New Space', click: () => this.emit({ type: 'editSpace', spaceId: this.engine.createSpace({ name: 'New Space' }).id }) },
      { type: 'separator' },
      { label: 'Close All Unpinned Tabs', click: () => this.engine.closeUnpinned(spaceId) },
      { type: 'separator' },
      {
        label: 'Delete Space',
        enabled: store.allSpaces().length > 1,
        click: async () => {
          const { response } = await dialog.showMessageBox(this.window.win, {
            type: 'warning',
            message: `Delete “${space.name}”?`,
            detail: 'All tabs in this space will be closed. Favorites are kept.',
            buttons: ['Delete', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
          });
          if (response === 0) this.engine.deleteSpace(spaceId);
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
      { label: 'New Tab in Folder', click: () => this.engine.createTab({ spaceId: folder.spaceId, folderId, activate: true }) },
      { type: 'separator' },
      { label: 'Close All Tabs', click: () => this.engine.deleteFolder(folderId, true) },
      { label: 'Delete Folder (keep tabs)', click: () => this.engine.deleteFolder(folderId, false) },
    ]);
  }

  // ============ 列表空白处 ============
  tabList(spaceId: number): void {
    this.popup([
      { label: 'New Tab', click: () => this.engine.createTab({ spaceId, activate: true }) },
      {
        label: 'New Folder',
        click: () => this.emit({ type: 'renameFolder', folderId: this.engine.createFolder(spaceId) }),
      },
      { type: 'separator' },
      { label: 'Reopen Closed Tab', enabled: this.engine.store.snapshot().closedCount > 0, click: () => this.engine.reopenClosed() },
      { label: 'Close All Unpinned Tabs', click: () => this.engine.closeUnpinned(spaceId) },
    ]);
  }
}
