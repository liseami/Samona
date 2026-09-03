/**
 * [INPUT]: 依赖 electron 的 BaseWindow/Rectangle，@shared/motion 的 bezier/lerpRect/DUR/EASE
 * [OUTPUT]: 对外提供 animateBounds(win, to, { duration, ease, signal })：按令牌曲线逐帧 setBounds 的窗口几何动画（macOS 自带的 setBounds(animate) 曲线与时长不可控，故自驱）
 * [POS]: shell 的窗口级动画原语，被 chat/choreographer 用来编舞 launcher ↔ 浮窗 ↔ 停靠卡；同一时刻同一窗口只跑一段（AbortSignal 中止旧段）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { BaseWindow, Rectangle } from 'electron';
import { bezier, DUR, EASE, lerpRect, type EaseBezier } from '@shared/motion';

const FRAME_MS = 16;

export interface AnimateOptions {
  duration?: number;
  ease?: EaseBezier;
  signal?: AbortSignal;
}

export function animateBounds(win: BaseWindow, to: Rectangle, options: AnimateOptions = {}): Promise<void> {
  const duration = options.duration ?? DUR.gentle;
  const ease = bezier(options.ease ?? EASE.drawer);
  const from = win.getBounds();
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (win.isDestroyed() || options.signal?.aborted) return resolve();
      const t = Math.min(1, (Date.now() - start) / duration);
      win.setBounds(lerpRect(from, to, ease(t)));
      if (t < 1) setTimeout(tick, FRAME_MS);
      else resolve();
    };
    tick();
  });
}
