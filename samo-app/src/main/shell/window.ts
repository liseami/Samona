/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/shell，依赖 @shared/model 的 Layout/DEFAULT_LAYOUT，@shared/ipc 的 CHANNELS/ShellEvent
 * [OUTPUT]: 对外提供 ShellWindow 类：一个隐藏原生按钮的 BaseWindow + 壳视图（React）+ 内容视图槽位（setContentVisible 随模块显隐）+ 壳之下的后台视图层（attachBackground/detach）+ 最上层透明的命令面板 overlay（openPalette/closePalette）+ zoom（全屏/最大化），以及含 rail 列的 contentBounds 布局算法
 * [POS]: shell 模块的唯一成员，engine 通过它摆放标签页视图；它只懂几何与层叠，不懂标签页语义（参照 phi：edgesSpacing=8、内容圆角 8）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, nativeTheme, shell, type Rectangle } from 'electron';
import { DEFAULT_LAYOUT, RAIL_WIDTH, type Layout } from '@shared/model';
import { CHANNELS, type ShellEvent } from '@shared/ipc';

// ============ 几何常量（源自 Laper MainLayout：外层 py-2 pr-2，面板 rounded-xl + 1px 边线） ============
const GUTTER = 8; // 上/下/右
const PANEL_BORDER = 1; // 网页视图内缩 1px，露出壳画的面板边线
const CONTENT_RADIUS = 12 - PANEL_BORDER; // 面板 rounded-xl = 12，视图内缩后 11
const COLLAPSED_TOP = 32; // 折叠时给顶部让出拖拽/交通灯一行（壳侧 pt-10 = 8 + 32）

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
    this.overlayView.setVisible(false);
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

  /** 内容区矩形：rail 列 + 侧栏之右（侧栏自带内边距即间隙）、上下右留 GUTTER、再内缩 1px 边线的面板（Laper 的「面板浮在 sidebar 色上」） */
  contentBounds(): Rectangle {
    const { width, height } = this.win.getContentBounds();
    const collapsed = this.layout.sidebarCollapsed;
    const left = RAIL_WIDTH + (collapsed ? GUTTER : this.layout.sidebarWidth) + PANEL_BORDER;
    const top = GUTTER + (collapsed ? COLLAPSED_TOP : 0) + PANEL_BORDER;
    return {
      x: left,
      y: top,
      width: Math.max(0, width - left - GUTTER - PANEL_BORDER),
      height: Math.max(0, height - top - GUTTER - PANEL_BORDER),
    };
  }

  private applyBounds(): void {
    const { width, height } = this.win.getContentBounds();
    this.shellView.setBounds({ x: 0, y: 0, width, height });
    this.overlayView.setBounds({ x: 0, y: 0, width, height });
    const bounds = this.contentBounds();
    this.contentView?.setBounds(bounds);
    for (const view of this.background) view.setBounds(bounds);
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
      this.win.contentView.addChildView(view); // 已是子视图时会被重排到最上层
      this.win.contentView.addChildView(this.overlayView); // overlay 永远压在内容之上
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
    this.overlayView.setVisible(true);
    this.win.contentView.addChildView(this.overlayView);
    this.overlayView.webContents.send(CHANNELS.event, event);
    this.overlayView.webContents.focus();
  }

  closePalette(): void {
    if (!this.overlayView.getVisible()) return;
    this.overlayView.setVisible(false);
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
