/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView/nativeTheme/shell，依赖 @shared/model 的 Layout/DEFAULT_LAYOUT
 * [OUTPUT]: 对外提供 ShellWindow 类：一个 BaseWindow + 壳视图（React 侧边栏）+ 顶层内容视图槽位 + 壳之下的后台视图层（attachBackground/detach），以及 contentBounds 布局算法
 * [POS]: shell 模块的唯一成员，engine 通过它摆放标签页视图；它只懂几何与层叠，不懂标签页语义（参照 phi：edgesSpacing=8、内容圆角 8）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView, nativeTheme, shell, type Rectangle } from 'electron';
import { DEFAULT_LAYOUT, type Layout } from '@shared/model';

// ============ 几何常量（源自 phi：WebContentConstant.edgesSpacing = 8） ============
const GUTTER = 10;
const CONTENT_RADIUS = 12; // 与壳里 .content-card 的 rounded-xl 同步
const COLLAPSED_SIDEBAR = 0;

export interface ShellWindowOptions {
  preloadPath: string;
  shellUrl: string; // dev: http://localhost:5173/index.html ；prod: file://…/index.html
  isDev: boolean;
}

export class ShellWindow {
  readonly win: BaseWindow;
  readonly shellView: WebContentsView;
  private contentView: WebContentsView | null = null;
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
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 14, y: 14 },
      backgroundColor: dark ? '#252525' : '#EAEAEA',
      title: 'Samo',
    });

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

  /** 内容区矩形：侧栏右侧、四周留 GUTTER 的圆角卡片（Arc/phi 的「内容浮在底色上」观感） */
  contentBounds(): Rectangle {
    const { width, height } = this.win.getContentBounds();
    const sidebar = this.layout.sidebarCollapsed ? COLLAPSED_SIDEBAR : this.layout.sidebarWidth;
    const x = sidebar + GUTTER;
    return {
      x,
      y: GUTTER + (this.layout.sidebarCollapsed ? 32 : 0), // 折叠时给顶部让出一行拖拽/交通灯区域
      width: Math.max(0, width - x - GUTTER),
      height: Math.max(0, height - GUTTER * 2 - (this.layout.sidebarCollapsed ? 32 : 0)),
    };
  }

  private applyBounds(): void {
    const { width, height } = this.win.getContentBounds();
    this.shellView.setBounds({ x: 0, y: 0, width, height });
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
      view.setBounds(this.contentBounds());
      view.webContents.focus();
    } else {
      this.shellView.webContents.focus();
    }
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
