/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMode/ChatSnapshot，@shared/motion 的 DUR/EASE，../shell/window 的 ShellWindow，../shell/animate 的 animateBounds，./window 的 ChatWindow
 * [OUTPUT]: 对外提供 ChatChoreographer：对话形态切换的指挥——closed ↔ floating 是同一窗口内的 scale 变形（页内完成；展开前先把窗口放大到面板尺寸，收起后再把窗口缩到药丸尺寸并收回主窗口内）；floating ↔ docked 是窗口几何飞向/飞出停靠槽再交给壳内卡片；init 在壳就绪后放出收起态的药丸
 * [POS]: chat 模块的动画指挥。Laper 里 FAB 与面板是同一节点靠 scaleX/scaleY 变形，Samo 把这个节点放进一张透明子窗口，于是变形保持页内、锚点天然对齐；只有停靠需要跨宿主，才用窗口几何动画
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { CHAT_DEFAULTS, type ChatMode, type ChatSnapshot } from '@shared/chat';
import { DUR, EASE } from '@shared/motion';
import { expand } from './window';
import { animateBounds } from '../shell/animate';
import type { ShellWindow } from '../shell/window';
import type { ChatWindow } from './window';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class ChatChoreographer {
  private mode: ChatMode = 'closed';
  private gen = 0;
  private controller: AbortController | null = null;

  constructor(
    private readonly shell: ShellWindow,
    private readonly chatWindow: ChatWindow,
  ) {}

  /** 壳就绪后：按当前形态放出浮层 */
  init(mode: ChatMode): void {
    this.mode = mode;
    if (mode === 'docked') {
      this.shell.setDock(this.chatWindow.restBounds().width);
      return;
    }
    this.chatWindow.ensure();
    if (mode === 'floating') {
      this.chatWindow.fitExpanded();
      this.chatWindow.focus();
    } else this.chatWindow.fitCollapsed();
  }

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
      this.chatWindow.ensure();
      this.chatWindow.fitExpanded(); // 窗口先满尺寸，页面看到后播药丸 → 面板的变形
      this.chatWindow.focus();
    } else if (from === 'floating' && to === 'closed') {
      this.chatWindow.rememberBounds();
      const here = this.chatWindow.currentPillBounds(); // 面板此刻右下角的药丸位
      await sleep(DUR.quick + 40); // 页内先播面板 → 药丸
      if (!alive()) return;
      const win = this.chatWindow.window();
      if (!win) return;
      this.chatWindow.fitCollapsed();
      const home = win.getBounds();
      const there = expand(here, CHAT_DEFAULTS.bleedPill);
      if (there.x !== home.x || there.y !== home.y) {
        win.setBounds(there); // 先出现在面板角落，再飞回主窗口角落
        await animateBounds(win, home, { duration: DUR.base, ease: EASE.settle, signal });
      }
    } else if (from === 'floating' && to === 'docked') {
      this.chatWindow.rememberBounds();
      const win = this.chatWindow.window();
      if (win) await animateBounds(win, expand(this.shell.dockSlotScreenBounds(snap.dockWidth)), { duration: DUR.gentle, ease: EASE.drawer, signal });
      if (!alive()) return;
      this.shell.setDock(snap.dockWidth); // 壳内卡片 dock-in 入场
      this.chatWindow.hide();
    } else if (from === 'docked' && to === 'floating') {
      this.shell.setDock(0);
      this.chatWindow.showAt(this.shell.dockSlotScreenBounds(snap.dockWidth));
      const win = this.chatWindow.window();
      if (win) await animateBounds(win, expand(this.chatWindow.restBounds()), { duration: DUR.gentle, ease: EASE.drawer, signal });
      if (!alive()) return;
      this.chatWindow.focus();
    } else if (from === 'docked' && to === 'closed') {
      this.shell.setDock(0);
      this.chatWindow.showAt(this.chatWindow.restBounds());
      this.chatWindow.fitCollapsed();
    } else if (from === 'closed' && to === 'docked') {
      this.chatWindow.hide();
      this.shell.setDock(snap.dockWidth);
    }
  }
}
