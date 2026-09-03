/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMode/ChatSnapshot/CHAT_DEFAULTS，@shared/motion 的 DUR/EASE，@shared/ipc 的 CHANNELS/ShellEvent，../shell/window 的 ShellWindow，../shell/animate 的 animateBounds，./window 的 ChatWindow，./launcher-window 的 LauncherWindow
 * [OUTPUT]: 对外提供 ChatChoreographer：把对话形态的每一次切换（closed ↔ floating ↔ docked）编成连续的窗口几何动画——药丸淡出时浮窗从药丸矩形长出、停靠时浮窗飞向停靠槽再换成壳内卡片、收起时浮窗缩回药丸再淡入药丸；apply(snapshot) 是唯一入口
 * [POS]: chat 模块的动画指挥：Laper 里 FAB 与面板是同一节点靠 scale 变形，Samo 里它们是三个不同的宿主（子窗口 / 子窗口 / 壳内卡片），所以变形发生在窗口几何层，曲线与时长全部取自 shared/motion 令牌
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Rectangle } from 'electron';
import { CHAT_DEFAULTS, type ChatMode, type ChatSnapshot } from '@shared/chat';
import { CHANNELS, type ShellEvent } from '@shared/ipc';
import { DUR, EASE } from '@shared/motion';
import { animateBounds } from '../shell/animate';
import type { ShellWindow } from '../shell/window';
import type { LauncherWindow } from './launcher-window';
import type { ChatWindow } from './window';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class ChatChoreographer {
  private mode: ChatMode = 'closed';
  private gen = 0; // 每次切换 +1：旧动画看到代数变了就停手
  private controller: AbortController | null = null;

  constructor(
    private readonly shell: ShellWindow,
    private readonly chatWindow: ChatWindow,
    private readonly launcher: LauncherWindow,
  ) {}

  /** 快照到达：形态没变只同步几何（停靠宽度），变了就编舞 */
  apply(snap: ChatSnapshot): void {
    if (snap.mode === this.mode) {
      if (snap.mode === 'docked') this.shell.setDock(snap.dockWidth);
      return;
    }
    const from = this.mode;
    this.mode = snap.mode;
    this.controller?.abort();
    this.controller = new AbortController();
    const gen = ++this.gen;
    void this.transition(from, snap, gen, this.controller.signal);
  }

  private async transition(from: ChatMode, snap: ChatSnapshot, gen: number, signal: AbortSignal): Promise<void> {
    const to = snap.mode;
    const alive = () => gen === this.gen && !signal.aborted;
    if (from === 'closed' && to === 'floating') {
      this.launcher.phase('launcherOut');
      this.chatWindow.showAt(this.pillBounds());
      this.chatPhase('panelIn');
      await animateBounds(this.chatWindow.window()!, this.chatWindow.restBounds(), { duration: DUR.gentle, ease: EASE.drawer, signal });
      if (!alive()) return;
      this.launcher.setVisible(false);
      this.chatWindow.focus();
    } else if (from === 'floating' && to === 'closed') {
      this.chatWindow.rememberBounds();
      this.chatPhase('panelOut');
      await animateBounds(this.chatWindow.window()!, this.pillBounds(), { duration: DUR.base, ease: EASE.standard, signal });
      if (!alive()) return;
      this.chatWindow.close();
      this.launcher.setVisible(true);
      this.launcher.phase('launcherIn');
    } else if (from === 'floating' && to === 'docked') {
      this.chatWindow.rememberBounds();
      this.chatPhase('panelOut');
      await animateBounds(this.chatWindow.window()!, this.shell.dockSlotScreenBounds(snap.dockWidth), { duration: DUR.gentle, ease: EASE.drawer, signal });
      if (!alive()) return;
      this.shell.setDock(snap.dockWidth); // 壳内卡片带 dock-in 入场
      await sleep(DUR.xfast);
      if (!alive()) return;
      this.chatWindow.close();
    } else if (from === 'docked' && to === 'floating') {
      this.shell.setDock(0);
      this.chatWindow.showAt(this.shell.dockSlotScreenBounds(snap.dockWidth));
      this.chatPhase('panelIn');
      await animateBounds(this.chatWindow.window()!, this.chatWindow.restBounds(), { duration: DUR.gentle, ease: EASE.drawer, signal });
      if (!alive()) return;
      this.chatWindow.focus();
    } else if (from === 'docked' && to === 'closed') {
      this.shell.setDock(0);
      this.chatWindow.close();
      this.launcher.setVisible(true);
      this.launcher.phase('launcherIn');
    } else if (from === 'closed' && to === 'docked') {
      this.launcher.phase('launcherOut');
      await sleep(DUR.fast);
      if (!alive()) return;
      this.launcher.setVisible(false);
      this.shell.setDock(snap.dockWidth);
    }
  }

  private chatPhase(phase: 'panelIn' | 'panelOut'): void {
    this.chatWindow.send(CHANNELS.event, { type: 'chatPhase', phase } satisfies ShellEvent);
  }

  /** 药丸在屏幕上的矩形：浮窗从这里长出 / 缩回这里 */
  private pillBounds(): Rectangle {
    const p = this.shell.win.getContentBounds();
    const { width, height } = CHAT_DEFAULTS.launcherPill;
    const m = CHAT_DEFAULTS.launcherMargin;
    return { x: p.x + p.width - m - width, y: p.y + p.height - m - height, width, height };
  }
}
