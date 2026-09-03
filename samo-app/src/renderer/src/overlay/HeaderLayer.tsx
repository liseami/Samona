/**
 * [INPUT]: 依赖 react，@shared/model 的 HEADER_HEIGHT，../store/browser 的 useBrowser，../modules/registry 的 MODULE_REGISTRY，window.samo.onEvent（overlayLayout）
 * [OUTPUT]: 对外提供 HeaderLayer 组件：面板头部在 overlay 层的那一份——按主进程给的头部条矩形绝对定位（overlay 平时就只有头部条大，铺满全窗时按窗口坐标），画出面板卡的上边线与圆角，里面渲染当前模块的 PanelHeader
 * [POS]: renderer/overlay 的常驻层。它存在的理由是几何：网页视图向上伸进头部之下以获得直角上缘，只有压在网页之上的层才能把那一截盖住；壳视图里同一头部保留一份作占位与命中兜底，两份逐 class 相同
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import { HEADER_HEIGHT } from '@shared/model';
import { useBrowser } from '../store/browser';
import { MODULE_REGISTRY } from '../modules/registry';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function HeaderLayer() {
  const module = useBrowser((s) => s.snapshot?.layout.module ?? 'browser');
  const [layout, setLayout] = useState<{ header: Rect | null; full: boolean }>({ header: null, full: false });
  useEffect(() => window.samo.onEvent((e) => e.type === 'overlayLayout' && setLayout({ header: e.header, full: e.full })), []);
  const Header = MODULE_REGISTRY[module].PanelHeader;
  if (!Header || !layout.header) return null;
  const { header, full } = layout;
  return (
    <div
      className="absolute overflow-hidden rounded-t-2xl border border-b-0 border-border bg-panel"
      style={{ left: full ? header.x : 0, top: full ? header.y : 0, width: header.width, height: HEADER_HEIGHT + 1 }}
    >
      <Header />
    </div>
  );
}
