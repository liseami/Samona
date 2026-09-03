/**
 * [INPUT]: 依赖 react 的 useState/useRef/useEffect，@shared/url 的 resolveInput
 * [OUTPUT]: 对外提供 NewTab 组件：极简新标签页——品牌标 + 自动聚焦的地址/搜索框（宽 min(680, vw-48)），回车即在本标签导航
 * [POS]: renderer/newtab 的唯一页面；它是一个普通网页（无 preload），所以只能靠 location 导航，正合 phi NativeNTP 的克制
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { resolveInput } from '@shared/url';

export function NewTab() {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-semibold text-primary-foreground shadow-sm select-none">S</div>
      <form
        className="w-[min(680px,calc(100vw-48px))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) location.href = resolveInput(value);
        }}
      >
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search or Enter URL"
          spellCheck={false}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-border bg-card px-5 text-xl text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
        />
      </form>
    </div>
  );
}
