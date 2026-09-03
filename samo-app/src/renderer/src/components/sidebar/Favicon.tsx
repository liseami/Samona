/**
 * [INPUT]: 依赖 react 的 useState，../../icons 的 Globe，@shared/model 的 Tab/NEW_TAB_URL
 * [OUTPUT]: 对外提供 Favicon 组件：站点图标，加载失败回退地球，新标签页回退品牌「S」
 * [POS]: renderer/components/sidebar 的原子控件，TabItem 与网格共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { Globe } from '../../icons';
import { NEW_TAB_URL, type Tab } from '@shared/model';

export function Favicon({ tab, size = 16 }: { tab: Tab; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (tab.favicon && !broken) {
    return <img src={tab.favicon} width={size} height={size} alt="" className="shrink-0 rounded-[3px]" onError={() => setBroken(true)} draggable={false} />;
  }
  if (tab.url === NEW_TAB_URL) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-[3px] bg-primary font-semibold text-primary-foreground" style={{ width: size, height: size, fontSize: size * 0.6 }}>
        S
      </span>
    );
  }
  return <Globe size={size} className="shrink-0 text-muted-foreground" />;
}
