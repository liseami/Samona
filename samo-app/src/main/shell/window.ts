/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/shell，依赖 @shared/model 的 Layout/DEFAULT_LAYOUT/HEADER_HEIGHT/RAIL_WIDTH，@shared/ipc 的 ShellEvent，./palette-window 的 PaletteWindow
 * [OUTPUT]: 对外提供 ShellWindow 类：一个隐藏原生按钮的 BaseWindow + 壳视图（React）+ 内容视图槽位（网页直角贴边、从面板头部下方开始；setContentVisible 随模块显隐）+ 网页底部两角的圆角遮罩视图 + 壳之下的后台视图层（attachBackground/detach，所有已加载视图都有真实视口；raiseContent 保证呈现视图的 NSView 最后挂载以独占命中）+ 命令面板子窗口 PaletteWindow（openPalette/closePalette）+ zoom（全屏/最大化）+ 红灯即隐藏（allowClose 后才真正关闭），以及含 rail 列、面板头部与停靠对话卡（setDock）的 contentBounds 布局算法、panelCardBounds/contentScreenBounds/dockSlotScreenBounds、onBoundsChange
 * [POS]: shell 模块的唯一成员，engine 通过它摆放标签页视图；它只懂几何与层叠，不懂标签页语义（参照 phi：edgesSpacing=8、内容圆角 8）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, nativeTheme, shell, type Rectangle } from 'electron';
import { DEFAULT_LAYOUT, HEADER_HEIGHT, RAIL_WIDTH, type Layout } from '@shared/model';
import type { ShellEvent } from '@shared/ipc';
import { PaletteWindow } from './palette-window';

// ============ 几何常量（源自 Laper ProjectEditorShell：一行 gap-2 pt-2 pb-2 pl-0 pr-2，SoftPanel rounded-2xl + 1px 边线） ============
const GUTTER = 8; // 上/下/右，也是各卡片之间的 gap
const PANEL_BORDER = 1; // 网页视图内缩 1px，露出壳画的面板边线
// 网页视图是直角矩形、贴边渲染、不切内容；面板的圆角只在底部两角可见，由两块 16×16 的「角落遮罩」视图盖在网页之上画出：
// 遮罩里一个大 div 用 box-shadow 扩散画出圆角之外的地板色与 1px 边线，圆角之内透明露出网页（Electron 的圆角四角统一、父 View 又裁不到 WebContentsView，
// 而向上藏进头部会切掉页面顶部——所以只用遮罩处理底部两角）
const CORNER_MASK = 16; // 角落遮罩边长：盖住 rounded-2xl（13.6px）+ 1px 边线
const CARD_RADIUS_PX = 13.6; // rounded-2xl = calc(var(--radius) + 8px) = 5.6 + 8
const cornerMaskHtml = (side: 'left' | 'right') =>
  `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><style>
html,body{margin:0;background:transparent;overflow:hidden}
.c{position:fixed;bottom:0;${side}:0;width:60px;height:60px;border:1px solid oklch(0.91 0 0);border-bottom-${side}-radius:${CARD_RADIUS_PX}px;corner-shape:squircle;box-shadow:0 0 0 40px oklch(0.937 0 0);background:transparent}
@media (prefers-color-scheme: dark){.c{border-color:oklch(0.35 0 0);box-shadow:0 0 0 40px oklch(0.2178 0 0)}}
</style><div class="c"></div>`)}`;
const COLLAPSED_TOP = HEADER_HEIGHT + GUTTER; // 折叠时顶部是 h-10 的控制条（红绿灯 + 展开）+ 一个 gap

export interface ShellWindowOptions {
  preloadPath: string;
  shellUrl: string; // dev: http://localhost:5173/index.html ；prod: file://…/index.html
  overlayUrl: string; // 命令面板页（透明，叠在最上层）
  isDev: boolean;
}

export class ShellWindow {
  readonly win: BaseWindow;
  readonly shellView: WebContentsView;
  private readonly cornerMasks: [WebContentsView, WebContentsView]; // 网页底部两角的圆角遮罩（左、右）
  private contentView: WebContentsView | null = null;
  private contentVisible = true; // 非浏览器模块时隐藏网页视图，面板由模块自己渲染
  private dockWidth = 0; // 停靠的对话卡宽度（0 = 未停靠）
  private background = new Set<WebContentsView>(); // 压在壳视图之下、用户看不见但仍在绘制的视图（agent 后台标签）
  private layout: Layout = { ...DEFAULT_LAYOUT };
  private quitting = false;

  constructor(options: ShellWindowOptions) {
    const dark = nativeTheme.shouldUseDarkColors;
    this.win = new BaseWindow({
      width: 1280,
      height: 820,
      minWidth: 720,
      minHeight: 480,
      show: false,
      titleBarStyle: 'hidden', // 保留原生标题栏行为（圆角、全屏动画、双击缩放），但按钮完全自绘
      backgroundColor: dark ? '#373737' : '#EEEEEE',
      title: 'Samo',
    });
    // ---- 原生红绿灯彻底隐藏：三颗灯由壳的 WindowControls 自绘，与侧栏图标同一基线 ----
    this.win.setWindowButtonVisibility?.(false);

    // ---- 底层：React 壳（侧边栏 + 空态内容区），覆盖整个窗口 ----
    this.shellView = new WebContentsView({
      webPreferences: {
        preload: options.preloadPath,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    this.shellView.setBackgroundColor('#00000000');
    this.win.contentView.addChildView(this.shellView);
    this.shellView.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });
    void this.shellView.webContents.loadURL(options.shellUrl);



    // ---- 命令面板：独立子窗口（见 palette-window） ----
    this.palette = new PaletteWindow(this, { preloadPath: options.preloadPath, overlayUrl: options.overlayUrl });

    // ---- 角落遮罩：两个 16×16 的透明小视图，画出面板底部两角的圆角与边线 ----
    this.cornerMasks = [new WebContentsView({ webPreferences: { sandbox: true } }), new WebContentsView({ webPreferences: { sandbox: true } })];
    this.cornerMasks.forEach((mask, i) => {
      mask.setBackgroundColor('#00000000');
      mask.setVisible(false);
      this.win.contentView.addChildView(mask);
      void mask.webContents.loadURL(cornerMaskHtml(i === 0 ? 'left' : 'right'));
    });

    this.win.on('resize', () => this.applyBounds());
    // 红灯 = 隐藏而非销毁：应用继续跑（agent 在后台工作），Dock 点击 / activate 再显示；只有退出时才真正关闭
    this.win.on('close', (e) => {
      if (this.quitting) return;
      e.preventDefault();
      this.win.hide();
    });
    this.shellView.webContents.once('did-finish-load', () => {
      if (!this.win.isVisible()) this.win.show();
    });
    if (options.isDev) {
      this.shellView.webContents.on('before-input-event', (_e, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') this.shellView.webContents.openDevTools({ mode: 'detach' });
      });
    }
    this.applyBounds();
  }

  /** 退出流程开始：允许窗口真正关闭 */
  allowClose(): void {
    this.quitting = true;
  }

  // ---------- 布局 ----------
  setLayout(layout: Layout): void {
    this.layout = { ...layout };
    this.applyBounds();
  }

  /** 内容区矩形：rail 40 → gap 8 → 侧栏卡（宽 sidebarWidth）→ gap 8 → 面板卡；上下右留 8；再内缩 1px 边线（Laper ProjectEditorShell 的一行三卡） */
  /** 网页视图矩形：面板卡内缩 1px 边线、贴边，从面板头部下方开始；直角矩形，不切内容 */
  contentBounds(): Rectangle {
    const card = this.panelCardBounds();
    const header = this.hasPanelHeader() ? HEADER_HEIGHT : 0;
    return {
      x: card.x + PANEL_BORDER,
      y: card.y + PANEL_BORDER + header,
      width: Math.max(0, card.width - PANEL_BORDER * 2),
      height: Math.max(0, card.height - PANEL_BORDER * 2 - header),
    };
  }

  /** 面板卡（SoftPanel）在窗口里的外框矩形 */
  panelCardBounds(): Rectangle {
    const { width, height } = this.win.getContentBounds();
    const collapsed = this.layout.sidebarCollapsed;
    const left = RAIL_WIDTH + GUTTER + (collapsed ? 0 : this.layout.sidebarWidth + GUTTER);
    const top = GUTTER + (collapsed ? COLLAPSED_TOP : 0);
    const right = GUTTER + (this.dockWidth ? this.dockWidth + GUTTER : 0);
    return { x: left, y: top, width: Math.max(0, width - left - right), height: Math.max(0, height - top - GUTTER) };
  }

  /** 浏览器与应用维度有面板头部（导航 · 地址 · 工具） */
  private hasPanelHeader(): boolean {
    return this.layout.module === 'browser' || this.layout.module === 'apps';
  }


  private applyBounds(): void {
    const { width, height } = this.win.getContentBounds();
    this.shellView.setBounds({ x: 0, y: 0, width, height });
    const bounds = this.contentBounds();
    this.contentView?.setBounds(bounds);
    for (const view of this.background) view.setBounds(bounds);
    this.applyCornerMasks();
    for (const l of this.boundsListeners) l();
  }


  /** 角落遮罩贴在面板卡底部两角；只在网页视图可见时出现 */
  private applyCornerMasks(): void {
    const card = this.panelCardBounds();
    const visible = this.contentVisible && !!this.contentView && card.width > CORNER_MASK * 2;
    const y = card.y + card.height - CORNER_MASK;
    const [left, right] = this.cornerMasks;
    left.setBounds({ x: card.x, y, width: CORNER_MASK, height: CORNER_MASK });
    right.setBounds({ x: card.x + card.width - CORNER_MASK, y, width: CORNER_MASK, height: CORNER_MASK });
    left.setVisible(visible);
    right.setVisible(visible);
  }

  /** 内容区（网页视图）在屏幕上的矩形：agent 光标层这张透明子窗口精确盖在它上面 */
  contentScreenBounds(): Rectangle {
    const c = this.win.getContentBounds();
    const b = this.contentBounds();
    return { x: c.x + b.x, y: c.y + b.y, width: b.width, height: b.height };
  }

  /** 内容区几何变化（resize / 侧栏 / 停靠 / 模块）时通知；agent 光标层据此跟随 */
  onBoundsChange(listener: () => void): () => void {
    this.boundsListeners.add(listener);
    return () => this.boundsListeners.delete(listener);
  }
  private readonly boundsListeners = new Set<() => void>();

  /** 停靠对话卡在屏幕上的矩形（编舞：浮窗飞向它 / 从它飞出） */
  dockSlotScreenBounds(width: number): Rectangle {
    const c = this.win.getContentBounds();
    return { x: c.x + c.width - GUTTER - width, y: c.y + GUTTER, width, height: Math.max(0, c.height - GUTTER * 2) };
  }

  /** 停靠的对话卡：内容区右侧让出 width + gap */
  setDock(width: number): void {
    if (this.dockWidth === width) return;
    this.dockWidth = width;
    this.applyBounds();
  }

  // ---------- 内容视图槽位（同一时刻只有一个标签页视图在窗口里） ----------
  setContentView(view: WebContentsView | null): void {
    if (this.contentView === view) {
      this.applyBounds();
      return;
    }
    if (this.contentView) {
      this.win.contentView.removeChildView(this.contentView); // 是否转入后台由 engine 的 reconcile 决定
    }
    this.contentView = view;
    if (view) {
      this.background.delete(view);
      applyRadius(view, 0);
      this.raiseContent(view);
      view.setBounds(this.contentBounds());
      view.setVisible(this.contentVisible);
      if (this.contentVisible) view.webContents.focus();
    } else {
      this.shellView.webContents.focus();
    }
    this.applyCornerMasks();
  }

  /** 模块切换：非浏览器模块时把网页视图藏起来（不销毁、不改活动标签） */
  setContentVisible(visible: boolean): void {
    if (this.contentVisible === visible) return;
    this.contentVisible = visible;
    this.contentView?.setVisible(visible);
    this.applyCornerMasks();
    if (!visible) this.shellView.webContents.focus();
  }

  /** 绿灯：默认全屏；fullscreen=false 时为最大化/还原（⌥点击、双击标题区） */
  zoom(fullscreen = true): void {
    if (fullscreen) this.win.setFullScreen(!this.win.isFullScreen());
    else if (this.win.isMaximized()) this.win.unmaximize();
    else this.win.maximize();
  }

  // ---------- 命令面板（子窗口） ----------
  readonly palette: PaletteWindow;
  openPalette(event: Extract<ShellEvent, { type: 'openPalette' }>): void {
    this.palette.open(event);
  }
  closePalette(): void {
    this.palette.close();
  }

  get currentContentView(): WebContentsView | null {
    return this.contentView;
  }

  // ---------- 后台层：让 agent 的标签在用户看别处时仍有真实视口、仍在绘制（截图/快照/点击都依赖它） ----------
  attachBackground(view: WebContentsView): void {
    if (view === this.contentView || this.background.has(view)) return;
    this.background.add(view);
    applyRadius(view, 0);
    this.win.contentView.addChildView(view, 0); // index 0 = 最底层，被不透明的壳视图完全遮住
    view.setBounds(this.contentBounds());
    if (this.contentView) this.raiseContent(this.contentView); // 新挂的 NSView 会盖住呈现视图的命中，重新抬起
  }

  /**
   * 把呈现中的网页视图「摘下再挂回」，让它的 NSView 成为最后挂载的那个。
   * macOS 上鼠标命中测试按 NSView 的挂载顺序，不按 Electron 视图的 z 顺序（addChildView 重排只改绘制层级）：
   * 后挂的后台标签视觉上在壳之下，却会在命中测试里压在你正看的网页之上，把点击全吃掉。角落遮罩随后挂回以保持在网页之上绘制
   */
  private raiseContent(view: WebContentsView): void {
    if (this.win.contentView.children.includes(view)) this.win.contentView.removeChildView(view);
    this.win.contentView.addChildView(view);
    for (const mask of this.cornerMasks) {
      if (this.win.contentView.children.includes(mask)) this.win.contentView.removeChildView(mask);
      this.win.contentView.addChildView(mask);
    }
  }

  backgroundViews(): WebContentsView[] {
    return [...this.background];
  }

  /** 从窗口彻底移除一个视图（无论它在前台还是后台） */
  detach(view: WebContentsView): void {
    if (this.contentView === view) {
      this.setContentView(null);
      return;
    }
    if (this.background.delete(view)) this.win.contentView.removeChildView(view);
  }

  send(channel: string, payload: unknown): void {
    if (!this.shellView.webContents.isDestroyed()) this.shellView.webContents.send(channel, payload);
  }

  focusShell(): void {
    this.shellView.webContents.focus();
  }
}

/** Electron ≥ 30 在 macOS 支持 View.setBorderRadius；其他平台静默降级 */
function applyRadius(view: WebContentsView, radius: number): void {
  const v = view as WebContentsView & { setBorderRadius?: (r: number) => void };
  try {
    v.setBorderRadius?.(radius);
  } catch {
    /* 不支持的平台忽略 */
  }
}
