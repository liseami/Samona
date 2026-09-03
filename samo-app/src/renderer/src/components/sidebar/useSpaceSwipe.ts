/**
 * [INPUT]: 依赖 react 的 useRef/useCallback，../../store/browser 的 send
 * [OUTPUT]: 对外提供 useSpaceSwipe()：返回 onWheel 处理器——双指横滑（轴锁定、阈值 50、每次手势只触发一次）切换上一个/下一个 Identity（phi SpaceSwipeTracker 语义）
 * [POS]: renderer/components/sidebar 的手势层，只发 identity.step 命令
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useRef, type WheelEvent } from 'react';
import { send } from '../../store/browser';

const THRESHOLD = 50;
const GESTURE_IDLE_MS = 300;

export function useSpaceSwipe() {
  const acc = useRef(0);
  const axis = useRef<'x' | 'y' | null>(null);
  const fired = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((e: WheelEvent<HTMLElement>) => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      acc.current = 0;
      axis.current = null;
      fired.current = false;
    }, GESTURE_IDLE_MS);

    if (axis.current === null) axis.current = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'x' : 'y';
    if (axis.current !== 'x' || fired.current) return;
    acc.current += e.deltaX;
    if (Math.abs(acc.current) >= THRESHOLD) {
      fired.current = true;
      send({ type: 'identity.step', delta: acc.current > 0 ? 1 : -1 });
    }
  }, []);
}
