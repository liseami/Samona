/**
 * [INPUT]: 依赖 electron 的 BaseWindow/WebContentsView，@shared/ipc 的 CHANNELS/ShellEvent，@shared/model 的 BrowserSnapshot，../shell/window 的 ShellWindow，../browser/engine 的 BrowserEngine（agentCursor 接收器 + store 订阅）
 * [OUTPUT]: 对外提供 AgentPresence：agent 的可见存在——一张透明、点击穿透、不可聚焦的子窗口精确盖在网页视图上（agent.html），当前可见身份被 agent 驱动时显示：光标镜像（ego 的 animationHighlightMouseToPosition）、动作标签（identity.agentState）、边缘发光；webContents() 供开发态 useShell('agent')
 * [POS]: agent 模块的视觉层。ego-lite 的承诺是「你能随时看到 agent 在哪个空间做什么」：侧栏用 agent-glow 标出它的标签与身份，这里把它的手画在页面上。用子窗口而非壳内视图：必须压在网页之上又不能吃掉用户的鼠标
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { BaseWindow, WebContentsView } from 'electron';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
import type { BrowserSnapshot } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import type { ShellWindow } from '../shell/window';

export interface AgentPresenceOptions {
  preloadPath: string;
  agentUrl: string;
}

const LINGER_MS = 600; // 动作结束后光标层多留一会儿再隐藏，避免逐脚本闪烁

export class AgentPresence {
  private win: BaseWindow | null = null;
  private view: WebContentsView | null = null;
  private visibleIdentity: number | null = null; // 当前可见且被 agent 驱动的身份
  private label: string | null = null;
  private hideTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly shell: ShellWindow,
    engine: BrowserEngine,
    private readonly options: AgentPresenceOptions,
  ) {
    engine.agentCursor = (identityId, x, y) => this.cursor(identityId, x, y);
    engine.store.subscribe((snap) => this.sync(snap));
    shell.onBoundsChange(() => this.place());
    shell.win.on('move', () => this.place());
    shell.win.on('minimize', () => this.win?.hide());
    shell.win.on('hide', () => this.win?.hide());
  }

  webContents() {
    return this.view && !this.view.webContents.isDestroyed() && this.win?.isVisible() ? this.view.webContents : null;
  }

  /** 快照到达：可见身份是否被 agent 驱动、标签是什么 */
  private sync(snap: BrowserSnapshot): void {
    const identity = snap.identities.find((i) => i.id === snap.activeIdentityId);
    const showing = snap.layout.module === 'browser' && !snap.layout.overview;
    const live = !!identity && identity.ownership === 'agent' && identity.agentState !== null && showing;
    const nextLabel = live ? identity!.agentState : null;
    if (live) {
      this.visibleIdentity = identity!.id;
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.show();
      if (nextLabel !== this.label) {
        this.label = nextLabel;
        this.send({ type: 'agentPresence', active: true, label: nextLabel });
      }
    } else if (this.visibleIdentity !== null) {
      this.visibleIdentity = null;
      this.label = null;
      this.send({ type: 'agentPresence', active: false, label: null });
      this.hideTimer ??= setTimeout(() => {
        this.hideTimer = null;
        this.win?.hide();
      }, LINGER_MS);
    }
  }

  private cursor(identityId: number, x: number, y: number): void {
    if (identityId !== this.visibleIdentity) return; // 用户在看别的身份：不打扰
    this.send({ type: 'agentCursor', x, y });
  }

  private show(): void {
    if (!this.win || this.win.isDestroyed()) this.create();
    this.place();
    if (!this.win!.isVisible()) this.win!.showInactive();
  }

  private place(): void {
    if (!this.win || this.win.isDestroyed() || !this.win.isVisible()) return;
    const b = this.shell.contentScreenBounds();
    if (b.width > 0 && b.height > 0) this.win.setBounds(b);
  }

  private send(event: ShellEvent): void {
    const wc = this.view?.webContents;
    if (wc && !wc.isDestroyed()) wc.send(CHANNELS.event, event);
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
      focusable: false,
      roundedCorners: false,
      show: false,
      ...this.shell.contentScreenBounds(),
      title: 'Samo Agent',
    });
    win.setIgnoreMouseEvents(true); // 点击穿透：它只画，不接
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
    void view.webContents.loadURL(this.options.agentUrl);
    win.on('closed', () => {
      this.win = null;
      this.view = null;
    });
    this.win = win;
    this.view = view;
  }
}
