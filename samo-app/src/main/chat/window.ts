/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/Rectangle，@shared/chat 的 CHAT_DEFAULTS，../shell/window 的 ShellWindow
 * [OUTPUT]: 对外提供 ChatWindow 类：AI 对话的浮层——主窗口的透明、无边框子窗口，药丸（收起态）与面板（展开态）同宿其中，Laper AIFloatingPanelShell 的窗口版。窗口 = 内容矩形（面板或药丸）四周各加阴影呼吸区：展开时窗口是面板 + bleed，收起时窗口缩到药丸 + bleedPill，两态都整窗接收鼠标；药丸永远钉在主窗口右下角，面板尺寸记住、位置永远从角落长出；ensure/fitExpanded/fitCollapsed/setContentBounds/restBounds/pillBounds/currentPillBounds/bounds/defaultBounds/rememberBounds/showAt/hide/show/focus/send/window
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

/** 内容矩形 ↔ 窗口矩形（四周各加阴影呼吸区：面板 bleed，药丸 bleedPill） */
export const expand = (r: Rectangle, b: number = CHAT_DEFAULTS.bleed): Rectangle => ({ x: r.x - b, y: r.y - b, width: r.width + b * 2, height: r.height + b * 2 });
const shrink = (r: Rectangle, b: number = CHAT_DEFAULTS.bleed): Rectangle => ({ x: r.x + b, y: r.y + b, width: r.width - b * 2, height: r.height - b * 2 });

export class ChatWindow {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private lastSize: { width: number; height: number } | null = null; // 面板尺寸会被记住；位置永远锚在主窗口右下角（药丸也在那里）
  private expanded = false;
  private hidden = false; // 停靠时整窗隐藏

  constructor(
    private readonly shell: ShellWindow,
    private readonly options: ChatWindowOptions,
  ) {
    const parent = shell.win;
    parent.on('resize', () => {
      if (!this.expanded) this.fitCollapsed(); // 药丸跟着主窗口右下角走
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
  /** 收起：窗口缩到主窗口右下角的药丸 + bleedPill（页内变形与飞行由编舞者安排） */
  fitCollapsed(): void {
    this.expanded = false;
    this.window()?.setBounds(expand(this.pillBounds(), CHAT_DEFAULTS.bleedPill));
  }

  /** 面板安放位（内容矩形）：尺寸记住的，位置永远锚在主窗口右下角——药丸在哪，面板就从哪长出来 */
  restBounds(): Rectangle {
    const d = this.defaultBounds();
    if (!this.lastSize) return d;
    const parent = this.shell.win.getContentBounds();
    const width = Math.min(this.lastSize.width, parent.width - CHAT_DEFAULTS.launcherMargin * 2);
    const height = Math.min(this.lastSize.height, parent.height - CHAT_DEFAULTS.launcherMargin * 2);
    return { x: d.x + d.width - width, y: d.y + d.height - height, width, height };
  }
  /** 药丸矩形：主窗口内容区右下角，留 launcherMargin */
  pillBounds(): Rectangle {
    const parent = this.shell.win.getContentBounds();
    const m = CHAT_DEFAULTS.launcherMargin;
    const { width, height } = CHAT_DEFAULTS.launcherPill;
    return { x: parent.x + parent.width - width - m, y: parent.y + parent.height - height - m, width, height };
  }
  /** 当前窗口对应的药丸矩形（面板可能被拖到别处：药丸先在面板右下角出现，再飞回主窗口角落） */
  currentPillBounds(): Rectangle {
    const b = this.bounds();
    const { width, height } = CHAT_DEFAULTS.launcherPill;
    if (!b) return this.pillBounds();
    return { x: b.x + b.width - width, y: b.y + b.height - height, width, height };
  }
  /** 页内拖拽缩放：内容矩形 → 应用并记住尺寸 */
  setContentBounds(bounds: Rectangle): void {
    if (!this.expanded) return;
    const width = Math.max(CHAT_DEFAULTS.minWidth, Math.round(bounds.width));
    const height = Math.max(CHAT_DEFAULTS.minHeight, Math.round(bounds.height));
    this.lastSize = { width, height };
    this.window()?.setBounds(expand({ x: Math.round(bounds.x), y: Math.round(bounds.y), width, height }));
  }
  /** 展开态：记住面板尺寸 */
  rememberBounds(): void {
    const win = this.window();
    if (win && this.expanded && win.isVisible()) {
      const { width, height } = shrink(win.getBounds());
      this.lastSize = { width, height };
    }
  }
  /** 当前展开态窗口的内容矩形 */
  bounds(): Rectangle | null {
    const win = this.window();
    return win ? shrink(win.getBounds(), this.expanded ? CHAT_DEFAULTS.bleed : CHAT_DEFAULTS.bleedPill) : null;
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
      ...(this.expanded ? expand(this.restBounds()) : expand(this.pillBounds(), CHAT_DEFAULTS.bleedPill)),
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
