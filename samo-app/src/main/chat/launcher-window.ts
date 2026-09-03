/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 LauncherWindow：右下角「Samo AI」药丸——主窗口的透明、无边框子窗口，只有药丸 + 12px 阴影呼吸区那么大，钉在主窗口内容区右下角随其移动/缩放；setVisible/pillBounds/webContents/send
 * [POS]: chat 模块的常驻入口。为什么是子窗口：主窗口里多个 WebContentsView 叠放时，压在网页之上的视图收不到真实鼠标（用户实测），独立 NSWindow 的输入路径最可靠；为什么这么小：透明区域也会挡住网页的鼠标
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, type Rectangle } from 'electron';
import { CHAT_DEFAULTS } from '@shared/chat';
import type { ShellWindow } from '../shell/window';

export interface LauncherWindowOptions {
  preloadPath: string;
  launcherUrl: string;
}

export class LauncherWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private visible = false;

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: LauncherWindowOptions,
  ) {
    const parent = shell.win;
    parent.on('resize', () => this.place());
    parent.on('minimize', () => this.win?.hide());
    parent.on('hide', () => this.win?.hide());
    parent.on('restore', () => this.sync());
    parent.on('show', () => this.sync());
    parent.on('focus', () => this.sync()); // 兜底：任何原因把它藏掉了，主窗口一聚焦就补回来
  }

  webContents() {
    return this.view && !this.view.webContents.isDestroyed() && this.win?.isVisible() ? this.view.webContents : null;
  }

  /** 药丸在屏幕上的矩形（主窗口内容区右下角，留 launcherMargin） */
  pillBounds(): Rectangle {
    const p = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const { width, height } = CHAT_DEFAULTS.launcherPill;
    return { x: p.x + p.width - width - m, y: p.y + p.height - height - m, width, height };
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.sync();
  }

  send(channel: string, payload: unknown): void {
    const wc = this.view?.webContents;
    if (wc && !wc.isDestroyed()) wc.send(channel, payload);
  }

  private sync(): void {
    if (!this.visible || this.shell.win.isMinimized() || !this.shell.win.isVisible()) {
      this.win?.hide();
      return;
    }
    if (!this.win || this.win.isDestroyed()) this.create();
    this.place();
    if (!this.win!.isVisible()) this.win!.showInactive(); // 不抢主窗口焦点
  }

  private bounds(): Rectangle {
    const pill = this.pillBounds();
    const b = CHAT_DEFAULTS.launcherBleed;
    return { x: pill.x - b, y: pill.y - b, width: pill.width + b * 2, height: pill.height + b * 2 };
  }

  private place(): void {
    if (!this.win || this.win.isDestroyed() || !this.win.isVisible()) return;
    this.win.setBounds(this.bounds());
  }

  private create(): void {
    const win = new BaseWindow({
      parent: this.shell.win,
      transparent: true,
      frame: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      roundedCorners: false,
      show: false,
      ...this.bounds(),
      title: 'Samo AI',
    });
    const view = new WebContentsView({
      webPreferences: { preload: this.options.preloadPath, sandbox: true, contextIsolation: true, nodeIntegration: false, transparent: true },
    });
    view.setBackgroundColor('#00000000');
    win.contentView.addChildView(view);
    const fit = () => {
      const { width, height } = win.getContentBounds();
      view.setBounds({ x: 0, y: 0, width, height });
    };
    win.on('resize', fit);
    fit();
    void view.webContents.loadURL(this.options.launcherUrl);
    win.on('closed', () => {
      this.win = null;
      this.view = null;
    });
    this.win = win;
    this.view = view;
  }
}
