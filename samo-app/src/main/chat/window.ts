/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 ChatWindow 类：AI 对话的浮层——主窗口的透明、无边框子窗口，药丸（收起态）与面板（展开态）同宿其中，Laper AIFloatingPanelShell 的窗口版。窗口 = 内容矩形（面板或药丸）四周各加 bleed 的阴影呼吸区：展开时窗口是面板 + bleed，收起时窗口缩到药丸 + bleed，两态都整窗接收鼠标；ensure/fitExpanded/fitCollapsed/setContentBounds/restBounds/defaultBounds/rememberBounds/clampIntoParent/showAt/hide/show/focus/send/window
 * [POS]: chat 模块的浮动承载。透明窗口意味着没有原生阴影（页内 box-shadow）与原生缩放（页内边缘热区 → chat.setBounds）；换来的是药丸 ↔ 面板在同一文档里用 scaleX/scaleY 变形、锚点天然对齐。收起后把窗口缩到药丸，而不是靠 setIgnoreMouseEvents 的悬停切换——普通窗口的输入路径最可靠
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, type Rectangle } from 'electron';
import { CHAT_DEFAULTS } from '@shared/chat';
import type { ShellWindow } from '../shell/window';

export interface ChatWindowOptions {
  preloadPath: string;
  chatUrl: string;
}

const B = CHAT_DEFAULTS.bleed;
/** 内容矩形 ↔ 窗口矩形（四周各加阴影呼吸区） */
export const expand = (r: Rectangle): Rectangle => ({ x: r.x - B, y: r.y - B, width: r.width + B * 2, height: r.height + B * 2 });
const shrink = (r: Rectangle): Rectangle => ({ x: r.x + B, y: r.y + B, width: r.width - B * 2, height: r.height - B * 2 });

export class ChatWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private lastBounds: Rectangle | null = null; // 展开态面板的安放位（内容矩形）
  private expanded = false;
  private hidden = false; // 停靠时整窗隐藏

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: ChatWindowOptions,
  ) {
    const parent = shell.win;
    parent.on('resize', () => {
      if (this.expanded) return;
      if (this.lastBounds) this.clampIntoParent();
      else this.fitCollapsed(); // 从未挪过：药丸跟着主窗口右下角走
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

  /** 首次：创建并以收起态（药丸）显示在主窗口右下角 */
  ensure(): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    this.show();
  }

  /** 展开：窗口先放大到面板 + bleed，页面看到窗口满尺寸后才播变形 */
  fitExpanded(): void {
    this.expanded = true;
    this.window()?.setBounds(expand(this.restBounds()));
  }
  /** 收起：页内变形结束后再把窗口缩到药丸 + bleed（编舞者负责延时） */
  fitCollapsed(): void {
    this.expanded = false;
    this.window()?.setBounds(expand(this.pillBounds()));
  }

  /** 面板安放位（内容矩形） */
  restBounds(): Rectangle {
    return this.lastBounds ?? this.defaultBounds();
  }
  /** 药丸矩形：钉在面板安放位的右下角 */
  pillBounds(): Rectangle {
    const r = this.restBounds();
    const { width, height } = CHAT_DEFAULTS.launcherPill;
    return { x: r.x + r.width - width, y: r.y + r.height - height, width, height };
  }
  /** 页内拖拽缩放：内容矩形 → 记为安放位并应用 */
  setContentBounds(bounds: Rectangle): void {
    if (!this.expanded) return;
    const w = Math.max(CHAT_DEFAULTS.minWidth, Math.round(bounds.width));
    const h = Math.max(CHAT_DEFAULTS.minHeight, Math.round(bounds.height));
    this.lastBounds = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: w, height: h };
    this.window()?.setBounds(expand(this.lastBounds));
  }
  /** 展开态当前窗口 → 记住面板安放位（拖动窗口后） */
  rememberBounds(): void {
    const win = this.window();
    if (win && this.expanded && win.isVisible()) this.lastBounds = shrink(win.getBounds());
  }
  /** 收起态：把安放位挪到药丸能完整落在主窗口内容区之内 */
  clampIntoParent(): void {
    const p = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const r = this.restBounds();
    const pill = this.pillBounds();
    const dx = Math.min(Math.max(pill.x, p.x + m), p.x + p.width - pill.width - m) - pill.x;
    const dy = Math.min(Math.max(pill.y, p.y + m), p.y + p.height - pill.height - m) - pill.y;
    if (dx || dy) this.lastBounds = { ...r, x: r.x + dx, y: r.y + dy };
    this.fitCollapsed();
  }

  show(): void {
    if (this.hidden || !this.win || this.win.isDestroyed() || this.shell.win.isMinimized()) return;
    if (!this.win.isVisible()) this.win.showInactive();
  }
  hide(): void {
    this.hidden = true;
    this.win?.hide();
  }
  /** 从停靠回到浮层：以给定内容矩形、展开态显示 */
  showAt(content: Rectangle): void {
    this.hidden = false;
    if (!this.win || this.win.isDestroyed()) this.create();
    this.expanded = true;
    this.window()?.setBounds(expand(content));
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
      ...expand(this.expanded ? this.restBounds() : this.pillBounds()),
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
