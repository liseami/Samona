/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 ChatWindow 类：AI 对话的浮层——主窗口的透明、无边框子窗口，药丸（收起态）与面板（展开态）同宿其中，Laper AIFloatingPanelShell 的窗口版；ensure/setExpanded/setInteractive/setBounds/bounds/restBounds/defaultBounds/rememberBounds/clampIntoParent/hide/show/focus/send/window
 * [POS]: chat 模块的浮动承载。透明窗口意味着：没有原生阴影（页内 box-shadow）、没有原生缩放（页内边缘热区 → chat.setBounds）、收起时整窗点击穿透（setIgnoreMouseEvents(true, forward) 让指针进出药丸仍可感知，进入即恢复接收）；换来的是药丸 ↔ 面板在同一文档里用 scaleX/scaleY 变形，锚点天然对齐
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, type Rectangle } from 'electron';
import { CHAT_DEFAULTS } from '@shared/chat';
import type { ShellWindow } from '../shell/window';

export interface ChatWindowOptions {
  preloadPath: string;
  chatUrl: string;
}

export class ChatWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private lastBounds: Rectangle | null = null; // 展开态的安放位
  private expanded = false;
  private hidden = false; // 停靠时整窗隐藏

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: ChatWindowOptions,
  ) {
    const parent = shell.win;
    parent.on('resize', () => {
      if (!this.expanded) this.clampIntoParent(); // 收起态：药丸跟着主窗口右下角走
    });
    parent.on('minimize', () => this.win?.hide());
    parent.on('hide', () => this.win?.hide());
    parent.on('restore', () => this.show());
    parent.on('show', () => this.show());
  }

  webContents() {
    return this.view && !this.view.webContents.isDestroyed() && this.win?.isVisible() ? this.view.webContents : null;
  }
  window(): BaseWindow | null {
    return this.win && !this.win.isDestroyed() ? this.win : null;
  }
  isExpanded(): boolean {
    return this.expanded;
  }

  /** 首次：创建并以收起态显示在主窗口右下角 */
  ensure(): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    this.show();
  }

  /** 展开 = 接收鼠标 + 聚焦；收起 = 只有药丸接鼠标（由 chat.hover 切换） */
  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.setInteractive(expanded);
    if (expanded) this.focus();
  }
  setInteractive(on: boolean): void {
    this.win?.setIgnoreMouseEvents(!on, { forward: true });
  }

  restBounds(): Rectangle {
    return this.lastBounds ?? this.defaultBounds();
  }
  bounds(): Rectangle | null {
    return this.window()?.getBounds() ?? null;
  }
  setBounds(bounds: Rectangle): void {
    const w = Math.max(CHAT_DEFAULTS.minWidth, Math.round(bounds.width));
    const h = Math.max(CHAT_DEFAULTS.minHeight, Math.round(bounds.height));
    this.window()?.setBounds({ x: Math.round(bounds.x), y: Math.round(bounds.y), width: w, height: h });
  }
  rememberBounds(): void {
    const b = this.bounds();
    if (b && this.win?.isVisible()) this.lastBounds = b;
  }
  /** 收起态把窗口收回主窗口内容区之内（药丸永远看得见） */
  clampIntoParent(): void {
    const b = this.bounds();
    if (!b) return;
    const p = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const x = Math.min(Math.max(b.x, p.x + m - (b.width - CHAT_DEFAULTS.launcherPill.width)), p.x + p.width - b.width - m);
    const y = Math.min(Math.max(b.y, p.y + m - (b.height - CHAT_DEFAULTS.launcherPill.height)), p.y + p.height - b.height - m);
    if (x !== b.x || y !== b.y) this.setBounds({ ...b, x, y });
  }

  show(): void {
    if (this.hidden || !this.win || this.win.isDestroyed() || this.shell.win.isMinimized()) return;
    if (!this.win.isVisible()) this.win.showInactive();
  }
  hide(): void {
    this.hidden = true;
    this.win?.hide();
  }
  /** 从停靠回到浮层：以给定几何显示 */
  showAt(bounds: Rectangle): void {
    this.hidden = false;
    if (!this.win || this.win.isDestroyed()) this.create();
    this.setBounds(bounds);
    this.show();
  }
  focus(): void {
    this.win?.focus();
    this.view?.webContents.focus();
  }
  send(channel: string, payload: unknown): void {
    const wc = this.view?.webContents;
    if (wc && !wc.isDestroyed()) wc.send(channel, payload);
  }

  private create(): void {
    const win = new BaseWindow({
      parent: this.shell.win,
      transparent: true,
      frame: false,
      hasShadow: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      roundedCorners: false,
      show: false,
      ...this.restBounds(),
      title: 'Samo AI',
    });
    win.setIgnoreMouseEvents(true, { forward: true }); // 收起态默认穿透；药丸悬停时由 chat.hover 打开
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
    void view.webContents.loadURL(this.options.chatUrl);
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
