/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/shell，依赖 @shared/model 的 Layout/DEFAULT_LAYOUT，@shared/ipc 的 CHANNELS/ShellEvent
 * [OUTPUT]: 对外提供 ShellWindow 类：一个隐藏原生按钮的 BaseWindow + 壳视图（React）+ 内容视图槽位（网页贴边、上缘藏进面板头部之下；setContentVisible 随模块显隐）+ 壳之下的后台视图层（attachBackground/detach，所有已加载视图都有真实视口）+ 最上层的 overlay 视图（平时只有面板头部条那么大、承载头部；openPalette 时铺满全窗承载命令面板）+ zoom（全屏/最大化），以及含 rail 列、面板头部与停靠对话卡（setDock）的 contentBounds 布局算法、panelCardBounds/headerStrip/contentScreenBounds/dockSlotScreenBounds、onBoundsChange
 * [POS]: shell 模块的唯一成员，engine 通过它摆放标签页视图；它只懂几何与层叠，不懂标签页语义（参照 phi：edgesSpacing=8、内容圆角 8）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, nativeTheme, shell, type Rectangle } from 'electron';
import { DEFAULT_LAYOUT, HEADER_HEIGHT, RAIL_WIDTH, type Layout } from '@shared/model';
import { CHANNELS, type ShellEvent } from '@shared/ipc';

// ============ 几何常量（源自 Laper ProjectEditorShell：一行 gap-2 pt-2 pb-2 pl-0 pr-2，SoftPanel rounded-2xl + 1px 边线） ============
const GUTTER = 8; // 上/下/右，也是各卡片之间的 gap
const PANEL_BORDER = 1; // 网页视图内缩 1px，露出壳画的面板边线
const CONTENT_RADIUS = 13; // 面板 rounded-2xl ≈ 13.6，视图内缩 1px 后取 13：下缘随面板圆角
// 上缘直角的做法：Electron 的圆角四角统一，于是让网页视图向上多伸一个半径、藏到面板头部之下——头部住在最上层的 overlay 视图里（与 ⌘T 命令面板同层），
// 盖住网页的上圆角；壳视图里同一头部保留一份作为几何占位与命中兜底。网页贴边渲染，没有内边距
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
  readonly overlayView: WebContentsView; // 透明的最上层：命令面板；不显示时不参与命中
  private contentView: WebContentsView | null = null;
  private contentVisible = true; // 非浏览器模块时隐藏网页视图，面板由模块自己渲染
  private dockWidth = 0; // 停靠的对话卡宽度（0 = 未停靠）
  private background = new Set<WebContentsView>(); // 压在壳视图之下、用户看不见但仍在绘制的视图（agent 后台标签）
  private layout: Layout = { ...DEFAULT_LAYOUT };

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

    // ---- 最上层：命令面板 overlay（透明背景，默认隐藏） ----
    this.overlayView = new WebContentsView({
      webPreferences: { preload: options.preloadPath, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    this.overlayView.setBackgroundColor('#00000000');
    this.win.contentView.addChildView(this.overlayView);
    void this.overlayView.webContents.loadURL(options.overlayUrl);


    this.win.on('resize', () => this.applyBounds());
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

  // ---------- 布局 ----------
  setLayout(layout: Layout): void {
    this.layout = { ...layout };
    this.applyBounds();
  }

  /** 内容区矩形：rail 40 → gap 8 → 侧栏卡（宽 sidebarWidth）→ gap 8 → 面板卡；上下右留 8；再内缩 1px 边线（Laper ProjectEditorShell 的一行三卡） */
  /** 网页视图矩形：面板卡内缩 1px 边线、贴边；有面板头部时上缘再向上伸 CONTENT_RADIUS 藏进头部（头部由 overlay 盖住） */
  contentBounds(): Rectangle {
    const card = this.panelCardBounds();
    const header = this.hasPanelHeader() ? HEADER_HEIGHT : 0;
    const tuck = header ? CONTENT_RADIUS : 0;
    return {
      x: card.x + PANEL_BORDER,
      y: card.y + PANEL_BORDER + header - tuck,
      width: Math.max(0, card.width - PANEL_BORDER * 2),
      height: Math.max(0, card.height - PANEL_BORDER * 2 - header + tuck),
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

  /** 面板头部条（含卡片上边线）在窗口里的矩形：overlay 平时就只有这么大 */
  headerStrip(): Rectangle | null {
    if (!this.hasPanelHeader()) return null;
    const card = this.panelCardBounds();
    return { x: card.x, y: card.y, width: card.width, height: HEADER_HEIGHT + PANEL_BORDER };
  }

  private applyBounds(): void {
    const { width, height } = this.win.getContentBounds();
    this.shellView.setBounds({ x: 0, y: 0, width, height });
    this.applyOverlayBounds();
    const bounds = this.contentBounds();
    this.contentView?.setBounds(bounds);
    for (const view of this.background) view.setBounds(bounds);
    for (const l of this.boundsListeners) l();
  }

  /** overlay：命令面板打开时铺满全窗，否则只有面板头部条那么大（盖住网页的上圆角、承接头部点击） */
  private applyOverlayBounds(): void {
    const { width, height } = this.win.getContentBounds();
    const strip = this.headerStrip();
    if (this.paletteOpen) this.overlayView.setBounds({ x: 0, y: 0, width, height });
    else this.overlayView.setBounds(strip ?? { x: 0, y: 0, width: 0, height: 0 });
    this.overlayView.setVisible(this.paletteOpen || !!strip);
    this.overlayView.webContents.send(CHANNELS.event, { type: 'overlayLayout', header: strip, full: this.paletteOpen } satisfies ShellEvent);
  }
  private paletteOpen = false;

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

  /**
   * 把已存在的子视图抬到最上层。Electron 对已是子视图的 addChildView 不会重排原生 NSView 顺序，
   * overlay 若在第一次放入网页视图后停在网页之下，CDP 注入的点击照常工作（绕过原生命中测试），
   * 真实鼠标却全被网页吃掉。移除再添加才是真正的「抬起」。（launcher 因此改为独立子窗口，见 chat/launcher-window）
   */
  private raise(view: WebContentsView): void {
    if (this.win.contentView.children.includes(view)) this.win.contentView.removeChildView(view);
    this.win.contentView.addChildView(view);
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
      applyRadius(view, CONTENT_RADIUS);
      this.win.contentView.addChildView(view);
      this.raise(this.overlayView); // overlay 永远最上
      view.setBounds(this.contentBounds());
      view.setVisible(this.contentVisible);
      if (this.contentVisible) view.webContents.focus();
    } else {
      this.shellView.webContents.focus();
    }
  }

  /** 模块切换：非浏览器模块时把网页视图藏起来（不销毁、不改活动标签） */
  setContentVisible(visible: boolean): void {
    if (this.contentVisible === visible) return;
    this.contentVisible = visible;
    this.contentView?.setVisible(visible);
    if (!visible) this.shellView.webContents.focus();
  }

  /** 绿灯：默认全屏；fullscreen=false 时为最大化/还原（⌥点击、双击标题区） */
  zoom(fullscreen = true): void {
    if (fullscreen) this.win.setFullScreen(!this.win.isFullScreen());
    else if (this.win.isMaximized()) this.win.unmaximize();
    else this.win.maximize();
  }

  // ---------- 命令面板 ----------
  openPalette(event: Extract<ShellEvent, { type: 'openPalette' }>): void {
    this.paletteOpen = true;
    this.raise(this.overlayView);
    this.applyOverlayBounds();
    this.overlayView.webContents.send(CHANNELS.event, event);
    this.overlayView.webContents.focus();
  }

  closePalette(): void {
    if (!this.paletteOpen) return;
    this.paletteOpen = false;
    this.applyOverlayBounds();
    (this.contentView ?? this.shellView).webContents.focus();
  }

  get currentContentView(): WebContentsView | null {
    return this.contentView;
  }

  // ---------- 后台层：让 agent 的标签在用户看别处时仍有真实视口、仍在绘制（截图/快照/点击都依赖它） ----------
  attachBackground(view: WebContentsView): void {
    if (view === this.contentView || this.background.has(view)) return;
    this.background.add(view);
    applyRadius(view, CONTENT_RADIUS);
    this.win.contentView.addChildView(view, 0); // index 0 = 最底层，被不透明的壳视图完全遮住
    view.setBounds(this.contentBounds());
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
