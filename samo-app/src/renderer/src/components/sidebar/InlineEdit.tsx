/**
 * [INPUT]: 依赖 react
 * [OUTPUT]: 对外提供 InlineEdit 组件：就地重命名输入框——自动聚焦全选，Enter 提交、Esc 取消、失焦提交
 * [POS]: renderer/components/sidebar 的原子控件，标签行与文件夹头共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';

export function InlineEdit({ value, onCommit, onCancel }: { value: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    onCommit(text);
  };

  return (
    <input
      ref={ref}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') {
          done.current = true;
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="h-5 min-w-0 flex-1 rounded-md border border-primary bg-input px-1 text-base text-foreground outline-none"
    />
  );
}
