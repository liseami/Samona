/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/screen，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 ChatWindow 类：AI 对话的浮窗——主窗口的子窗口（永远在其上、随其移动），无边框、不透明、圆角、带系统阴影、可自由缩放、可拖出应用窗口；open/showAt/restBounds/rememberBounds/close/isOpen/send/window，记住上次几何，默认停在主窗口右下角；编舞（chat/choreographer）用 showAt + window() 驱动几何动画
 * [POS]: chat 模块的浮动承载；停靠态不用它（停靠卡由壳渲染），launcher 也不用它（launcher 是主窗口内的视图）。选择不透明而非透明窗口：Electron 的透明窗口不能缩放也没有阴影
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
  private lastBounds: Rectangle | null = null;

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: ChatWindowOptions,
  ) {}

  isOpen(): boolean {
    return !!this.win && !this.win.isDestroyed() && this.win.isVisible();
  }

  webContents() {
    return this.view && !this.view.webContents.isDestroyed() ? this.view.webContents : null;
  }

  open(): void {
    this.showAt(this.restBounds());
    this.focus();
  }

  /** 浮窗的「安放位」：上次几何或默认几何 */
  restBounds(): Rectangle {
    return this.lastBounds ?? this.defaultBounds();
  }

  /** 以给定几何显示（不聚焦）——编舞的起点：从药丸/停靠卡的矩形出发再动画到安放位 */
  showAt(bounds: Rectangle): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    const win = this.win!;
    win.setBounds(bounds);
    if (!win.isVisible()) win.show();
  }

  focus(): void {
    this.win?.focus();
    this.view?.webContents.focus();
  }

  window(): BaseWindow | null {
    return this.win && !this.win.isDestroyed() ? this.win : null;
  }

  /** 记住当前几何为安放位（动画中途不要记） */
  rememberBounds(): void {
    if (this.win && !this.win.isDestroyed() && this.win.isVisible()) this.lastBounds = this.win.getBounds();
  }

  close(): void {
    if (!this.win || this.win.isDestroyed()) return;
    this.win.hide();
  }

  send(channel: string, payload: unknown): void {
    const wc = this.webContents();
    if (wc) wc.send(channel, payload);
  }

  destroy(): void {
    this.win?.destroy();
    this.win = null;
    this.view = null;
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
      minWidth: 320,
      minHeight: 420,
      backgroundColor: dark ? '#3c3c3c' : '#fdfdfd', // ≈ --card（Laper 面板底是 bg-card）
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
      // 关闭 = 隐藏，对话状态在主进程里不受影响
      e.preventDefault();
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
  private defaultBounds(): Rectangle {
    const parent = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const height = Math.round(Math.min(parent.height * CHAT_DEFAULTS.heightRatio, parent.height - CHAT_DEFAULTS.viewportInset));
    const width = Math.round(Math.min(height * CHAT_DEFAULTS.aspect, parent.width - CHAT_DEFAULTS.viewportInset));
    return { x: parent.x + parent.width - width - m, y: parent.y + parent.height - height - m, width, height };
  }
}
