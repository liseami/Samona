/**
 * [INPUT]: 依赖 ../store/browser 的 send
 * [OUTPUT]: 对外提供 EdgePeek 组件：折叠态 rail 右侧的 8px 贴边条（悬停临时展开侧栏 = peek）
 * [POS]: shell 的折叠替身；主进程在折叠时把内容视图从 rail 右缘再右移 8px，正好露出这条边
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { send } from '../store/browser';

export function EdgePeek() {
  return <div className="absolute top-10 bottom-0 left-10 z-30 w-2 cursor-e-resize" onMouseEnter={() => send({ type: 'layout.peek', peek: true })} />;
}
