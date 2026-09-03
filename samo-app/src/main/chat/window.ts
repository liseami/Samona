/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 ChatWindow 类：AI 对话的浮窗——主窗口的不透明子窗口（永远在其上、随其移动、可拖出应用之外、原生拖边缩放、原生圆角与阴影）；showAt/restBounds/defaultBounds/rememberSize/close/focus/send/window/isOpen
 * [POS]: chat 模块的浮动承载。大面积的浮层一律不透明：透明窗口没有原生阴影与缩放、透明区域还会挡住网页的鼠标；面板的位置永远锚在主窗口右下角（药丸所在），只记住用户调过的尺寸——面板与药丸共享同一个角落
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, nativeTheme, type Rectangle } from 'electron';
import { CHAT_DEFAULTS } from '@shared/chat';
import type { ShellWindow } from '../shell/window';

export interface ChatWindowOptions {
  preloadPath: string;
  chatUrl: string;
  onClosedByUser: () => void; // 用户关掉浮窗（⌘W / 系统关闭）→ 形态回到 closed
}

export class ChatWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private lastSize: { width: number; height: number } | null = null; // 只记尺寸，位置永远锚在角落

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: ChatWindowOptions,
  ) {}

  isOpen(): boolean {
    return !!this.win && !this.win.isDestroyed() && this.win.isVisible();
  }
  window(): BaseWindow | null {
    return this.win && !this.win.isDestroyed() ? this.win : null;
  }
  webContents() {
    return this.view && !this.view.webContents.isDestroyed() ? this.view.webContents : null;
  }

  /** 以给定几何显示（不聚焦）；编舞的起点 */
  showAt(bounds: Rectangle): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    const win = this.win!;
    win.setBounds(bounds);
    if (!win.isVisible()) win.showInactive();
  }

  /** 面板安放位：尺寸记住的，位置锚在主窗口右下角（药丸处） */
  restBounds(): Rectangle {
    const d = this.defaultBounds();
    if (!this.lastSize) return d;
    const parent = this.shell.win.getContentBounds();
    const width = Math.max(CHAT_DEFAULTS.minWidth, Math.min(this.lastSize.width, parent.width - CHAT_DEFAULTS.launcherMargin * 2));
    const height = Math.max(CHAT_DEFAULTS.minHeight, Math.min(this.lastSize.height, parent.height - CHAT_DEFAULTS.launcherMargin * 2));
    return { x: d.x + d.width - width, y: d.y + d.height - height, width, height };
  }

  /** 收起前记住用户调过的尺寸 */
  rememberSize(): void {
    if (!this.isOpen()) return;
    const { width, height } = this.win!.getBounds();
    this.lastSize = { width, height };
  }

  close(): void {
    if (!this.win || this.win.isDestroyed()) return;
    this.win.hide();
    this.shell.win.focus(); // 焦点归还主窗口：否则壳与网页收不到键盘
  }

  focus(): void {
    this.win?.focus();
    this.view?.webContents.focus();
  }

  send(channel: string, payload: unknown): void {
    const wc = this.webContents();
    if (wc) wc.send(channel, payload);
  }

  private create(): void {
    const dark = nativeTheme.shouldUseDarkColors;
    const win = new BaseWindow({
      parent: this.shell.win, // 子窗口：永远在主窗口之上，随主窗口移动，但可以被拖到主窗口之外
      frame: false,
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: true,
      roundedCorners: true,
      show: false,
      ...this.defaultBounds(),
      minWidth: CHAT_DEFAULTS.minWidth,
      minHeight: CHAT_DEFAULTS.minHeight,
      backgroundColor: dark ? '#3c3c3c' : '#fdfdfd', // ≈ --card（面板底是 bg-card）
      title: 'Samo Chat',
    });
    const view = new WebContentsView({
      webPreferences: { preload: this.options.preloadPath, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    win.contentView.addChildView(view);
    const fit = () => {
      const { width, height } = win.getContentBounds();
      view.setBounds({ x: 0, y: 0, width, height });
    };
    win.on('resize', fit);
    fit();
    void view.webContents.loadURL(this.options.chatUrl);
    win.on('close', (e) => {
      e.preventDefault(); // 关闭 = 隐藏，对话状态在主进程里不受影响
      this.close();
      this.options.onClosedByUser();
    });
    win.on('closed', () => {
      this.win = null;
      this.view = null;
    });
    this.win = win;
    this.view = view;
  }

  /** Laper 几何：高 = 主窗口内容高 × 2/3，宽按 9:16，右下角留 1.5rem；上限主窗口 − 48 */
  defaultBounds(): Rectangle {
    const parent = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const height = Math.round(Math.max(CHAT_DEFAULTS.minHeight, Math.min(parent.height * CHAT_DEFAULTS.heightRatio, parent.height - CHAT_DEFAULTS.viewportInset)));
    const width = Math.round(Math.max(CHAT_DEFAULTS.minWidth, Math.min(height * CHAT_DEFAULTS.aspect, parent.width - CHAT_DEFAULTS.viewportInset)));
    return { x: parent.x + parent.width - width - m, y: parent.y + parent.height - height - m, width, height };
  }
}
