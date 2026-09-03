/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 LauncherWindow 类：右下角「Samo AI」药丸的承载——主窗口的透明、无边框、不可聚焦的子窗口，钉在主窗口内容区右下角并随其移动/缩放；setVisible/phase/webContents/send
 * [POS]: chat 模块的常驻入口。之所以是子窗口而不是主窗口内的 WebContentsView：主窗口里多个 WebContentsView 叠放时，后放入的网页视图会在原生命中测试上压住 launcher（CDP 注入的点击绕过命中测试，真实鼠标却点不到）；独立 NSWindow 天然在父窗口之上，输入路径不依赖视图顺序
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, type Rectangle } from 'electron';
import { CHAT_DEFAULTS } from '@shared/chat';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
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
    parent.on('move', () => this.place());
    parent.on('resize', () => this.place());
    parent.on('minimize', () => this.win?.hide());
    parent.on('restore', () => this.sync());
    parent.on('show', () => this.sync());
    parent.on('hide', () => this.win?.hide());
    parent.on('enter-full-screen', () => this.sync());
    parent.on('leave-full-screen', () => this.sync());
  }

  webContents() {
    return this.view && !this.view.webContents.isDestroyed() ? this.view.webContents : null;
  }

  isVisible(): boolean {
    return this.visible && !!this.win && !this.win.isDestroyed() && this.win.isVisible();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.sync();
  }

  /** 编舞相位：launcherIn（显示并播放入场）/ launcherOut（播放退场，由编舞者稍后 setVisible(false)） */
  phase(phase: 'launcherIn' | 'launcherOut'): void {
    this.send(CHANNELS.event, { type: 'chatPhase', phase } satisfies ShellEvent);
  }

  send(channel: string, payload: unknown): void {
    const wc = this.webContents();
    if (wc) wc.send(channel, payload);
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

  /** 药丸 + 四周阴影呼吸区，钉在主窗口内容区右下角 */
  private bounds(): Rectangle {
    const p = this.shell.win.getContentBounds();
    const { width: pw, height: ph } = CHAT_DEFAULTS.launcherPill;
    const bleed = CHAT_DEFAULTS.launcherBleed;
    const m = CHAT_DEFAULTS.launcherMargin;
    return { x: p.x + p.width - m - pw - bleed, y: p.y + p.height - m - ph - bleed, width: pw + bleed * 2, height: ph + bleed * 2 };
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
      focusable: false, // 点击药丸不把焦点从网页夺走
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
