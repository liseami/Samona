/**
 * [INPUT]: 依赖 react，../../store/browser 的 useBrowser/send，../../icons 的 ChevronDown/Close，../../components/ui/button，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 FindBar 组件：面板头部里的页内查找条——输入即查（100ms 去抖）、Enter 下一处 / Shift+Enter 上一处、结果计数「n / total」、Esc 或关闭钮退出并清除高亮
 * [POS]: modules/browser 头部中槽的查找态（⌘F 打开时替换地址栏），结果来自快照 find（主进程 found-in-page）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { send, useBrowser } from '../../store/browser';
import { ChevronDown, Close } from '../../icons';
import { cn } from '../../lib/utils';

export function FindBar({ onClose }: { onClose: () => void }) {
  const find = useBrowser((s) => s.snapshot?.find ?? null);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    return () => send({ type: 'find.stop' });
  }, []);
  useEffect(() => {
    const t = setTimeout(() => send({ type: 'find.start', text }), 100);
    return () => clearTimeout(t);
  }, [text]);
  const close = () => {
    send({ type: 'find.stop' });
    onClose();
  };
  const none = text.length > 0 && find !== null && find.total === 0;
  return (
    <div className={cn('flex h-7 w-full items-center gap-1 rounded-2xl border bg-input pr-1 pl-2.5 transition-colors', none ? 'border-destructive/50' : 'border-primary/40')}>
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send({ type: 'find.next', forward: !e.shiftKey });
          else if (e.key === 'Escape') close();
        }}
        placeholder="Find in page"
        spellCheck={false}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
      <span className={cn('shrink-0 text-xs tabular-nums', none ? 'text-destructive' : 'text-muted-foreground')}>{text ? `${find?.current ?? 0} / ${find?.total ?? 0}` : ''}</span>
      <button type="button" aria-label="Previous" onClick={() => send({ type: 'find.next', forward: false })} className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground">
        <ChevronDown size={12} className="rotate-180" />
      </button>
      <button type="button" aria-label="Next" onClick={() => send({ type: 'find.next', forward: true })} className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground">
        <ChevronDown size={12} />
      </button>
      <button type="button" aria-label="Close" onClick={close} className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground">
        <Close size={11} />
      </button>
    </div>
  );
}
