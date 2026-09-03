/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMode/ChatSnapshot，../shell/window 的 ShellWindow，./window 的 ChatWindow，./launcher-window 的 LauncherWindow
 * [OUTPUT]: 对外提供 ChatChoreographer：对话形态的指挥——closed 显示药丸；floating 显示面板窗口（锚在右下角的安放位）并聚焦；docked 让壳在面板卡右侧渲染停靠卡；init 在壳就绪后按形态放出；apply(snapshot) 是唯一入口。无动画：切换即到位
 * [POS]: chat 模块里形态与窗口显隐的唯一对应表；三个宿主（药丸子窗口 / 面板子窗口 / 壳内停靠卡）只由它开合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ChatMode, ChatSnapshot } from '@shared/chat';
import type { ShellWindow } from '../shell/window';
import type { LauncherWindow } from './launcher-window';
import type { ChatWindow } from './window';

export class ChatChoreographer {
  private mode: ChatMode | null = null;

  constructor(
    private readonly shell: ShellWindow,
    private readonly chatWindow: ChatWindow,
    private readonly launcher: LauncherWindow,
  ) {}

  /** 壳就绪后：按当前形态放出 */
  init(mode: ChatMode, dockWidth: number): void {
    this.mode = null;
    this.apply({ mode, dockWidth } as ChatSnapshot);
  }

  apply(snap: ChatSnapshot): void {
    if (snap.mode === this.mode) {
      if (snap.mode === 'docked') this.shell.setDock(snap.dockWidth);
      else if (snap.mode === 'closed') this.launcher.setVisible(true); // 兜底：药丸永远在
      return;
    }
    const from = this.mode;
    this.mode = snap.mode;
    if (from === 'floating') this.chatWindow.rememberSize();
    switch (snap.mode) {
      case 'closed':
        this.shell.setDock(0);
        this.chatWindow.close();
        this.launcher.setVisible(true);
        break;
      case 'floating':
        this.shell.setDock(0);
        this.launcher.setVisible(false);
        this.chatWindow.showAt(this.chatWindow.restBounds());
        this.chatWindow.focus();
        break;
      case 'docked':
        this.launcher.setVisible(false);
        this.chatWindow.close();
        this.shell.setDock(snap.dockWidth);
        break;
    }
  }
}
