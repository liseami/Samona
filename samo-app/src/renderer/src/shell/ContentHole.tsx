/**
 * [INPUT]: 依赖 react（useEffect/useRef），../store/browser 的 send
 * [OUTPUT]: 对外提供 ContentHole 组件：面板卡里「网页该出现的位置」——一个铺满面板体的空元素，用 ResizeObserver 量出自己相对窗口的矩形，变化时发 layout.contentBounds（CSS px，取整）
 * [POS]: shell 与宿主之间关于网页几何的唯一契约：Electron 宿主目前自己算（忽略此命令），Chromium fork 宿主用它摆放 contents 容器；两边的壳都是同一份代码
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef } from 'react';
import { send } from '../store/browser';

export function ContentHole() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = '';
    const report = () => {
      const r = el.getBoundingClientRect();
      const rect = { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
      const key = `${rect.x},${rect.y},${rect.width},${rect.height}`;
      if (key === last) return;
      last = key;
      send({ type: 'layout.contentBounds', ...rect });
    };
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener('resize', report);
    report();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', report);
      send({ type: 'layout.contentBounds', x: 0, y: 0, width: 0, height: 0 }); // 洞没了（切到非浏览器模块）：宿主藏起网页
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="h-full w-full" />;
}
