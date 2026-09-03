/**
 * [INPUT]: 依赖 react 的 useState/useRef/useEffect，@shared/url 的 resolveInput
 * [OUTPUT]: 对外提供 NewTab 组件：极简新标签页——品牌标 + 自动聚焦的地址/搜索框（宽 min(680, vw-48)），回车即在本标签导航；带 ?error= 时是加载失败页（主机名 + 错误描述 + Try again）
 * [POS]: renderer/newtab 的唯一页面；它是一个普通网页（无 preload），所以只能靠 location 导航，正合 phi NativeNTP 的克制
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { resolveInput } from '@shared/url';

/** 主进程在主框架加载失败时把标签导到 newtab.html?error=CODE&desc=…&url=… */
function readError(): { code: string; desc: string; url: string } | null {
  const q = new URLSearchParams(location.search);
  const code = q.get('error');
  return code ? { code, desc: q.get('desc') ?? '', url: q.get('url') ?? '' } : null;
}

export function NewTab() {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const error = readError();

  useEffect(() => {
    input.current?.focus();
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  if (error) {
    let host = error.url;
    try {
      host = new URL(error.url).host || error.url;
    } catch {
      /* 原样 */
    }
    document.title = host; // 标签标题显示出错的主机，而不是「New Tab」
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card text-2xl font-semibold text-muted-foreground shadow-sm select-none">!</div>
        <div className="mb-1 text-xl font-medium text-foreground">Can’t reach {host}</div>
        <div className="mb-6 max-w-[520px] text-sm leading-relaxed text-muted-foreground">
          {error.desc.replace(/^net::/, '').replace(/_/g, ' ').toLowerCase()} ({error.code})
        </div>
        <button
          type="button"
          onClick={() => {
            location.href = error.url;
          }}
          className="h-9 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    );
  }

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
