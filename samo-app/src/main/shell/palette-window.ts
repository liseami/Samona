/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView，@shared/ipc 的 CHANNELS/ShellEvent，./window 的 ShellWindow
 * [OUTPUT]: 对外提供 PaletteWindow 与 OverlayEvent：壳浮层的承载——主窗口的透明、无边框子窗口，打开时铺满主窗口内容区（背景幕点击即关、Esc 即关），关闭即隐藏、把焦点还给主窗口并向壳发 overlayClosed；承载 ⌘T 命令面板（openPalette）与用户菜单（openUserMenu）；open/close/isOpen/webContents
 * [POS]: shell 的浮层之一，也是「必须压在网页之上还要能交互」的一切壳弹层的唯一去处：网页是原生视图、永远盖住壳的 DOM，壳里的 Portal/z-index 一进网页区域就死。为什么是子窗口而不是主窗口里的 overlay 视图：压在网页之上的 WebContentsView 收不到真实鼠标与键盘（用户实测），独立 NSWindow 的输入路径最可靠
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView } from 'electron';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
import type { ShellWindow } from './window';

export type OverlayEvent = Extract<ShellEvent, { type: 'openPalette' | 'openUserMenu' }>;

export interface PaletteWindowOptions {
  preloadPath: string;
  overlayUrl: string;
}

export class PaletteWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: PaletteWindowOptions,
  ) {
    shell.win.on('resize', () => this.fit());
    shell.win.on('move', () => this.fit());
    shell.win.on('minimize', () => this.close());
    shell.win.on('hide', () => this.close());
  }

  isOpen(): boolean {
    return !!this.win && !this.win.isDestroyed() && this.win.isVisible();
  }
  webContents() {
    return this.view && !this.view.webContents.isDestroyed() ? this.view.webContents : null;
  }

  open(event: OverlayEvent): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    this.fit();
    const win = this.win!;
    if (!win.isVisible()) win.show();
    win.focus();
    const wc = this.view!.webContents;
    const deliver = () => {
      wc.send(CHANNELS.event, event);
      wc.focus();
    };
    // 首次打开时页面还没加载完，事件会被丢掉：等 did-finish-load 再投递
    if (this.loaded) deliver();
    else wc.once('did-finish-load', deliver);
  }
  private loaded = false;

  close(): void {
    if (!this.isOpen()) return;
    this.win!.hide();
    this.shell.win.focus(); // 焦点归还主窗口
    this.shell.send(CHANNELS.event, { type: 'overlayClosed' } satisfies ShellEvent);
  }

  private fit(): void {
    if (!this.win || this.win.isDestroyed()) return;
    this.win.setBounds(this.shell.win.getContentBounds());
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
      ...this.shell.win.getContentBounds(),
      title: 'Samo Palette',
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
    this.loaded = false;
    view.webContents.once('did-finish-load', () => {
      this.loaded = true;
    });
    void view.webContents.loadURL(this.options.overlayUrl);
    win.on('closed', () => {
      this.win = null;
      this.view = null;
    });
    this.win = win;
    this.view = view;
  }
}
