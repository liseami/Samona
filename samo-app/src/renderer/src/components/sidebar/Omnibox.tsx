/**
 * [INPUT]: 依赖 react，icons 语义图标，../../store/browser 的 useBrowser/send/query/selectActiveTab，../../lib/utils 的 cn，@shared/url 的 displayUrl，@shared/model 的 Suggestion
 * [OUTPUT]: 对外提供 Omnibox 组件：侧栏内地址/命令框——输入时 100ms 防抖向主进程要建议（打开的标签 / 历史 / 直达 / 搜索），↑↓ 选择，Enter 执行，⌘Enter 新标签打开，Esc 关闭；三种模式（newTab / editUrl / searchTabs）由主进程事件驱动
 * [POS]: renderer/components/sidebar 的地址入口；URL 判定与历史都在主进程，这里只做呈现与键盘
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { Window, Clock, Globe, Lock, Search } from '../../icons';
import type { Suggestion } from '@shared/model';
import { displayUrl } from '@shared/url';
import { cn } from '../../lib/utils';
import { query, selectActiveTab, send, useBrowser, type OmniboxMode } from '../../store/browser';
import { Kbd } from '../ui/kbd';

const DEBOUNCE_MS = 100;

export function Omnibox() {
  const tab = useBrowser(selectActiveTab);
  const request = useBrowser((s) => s.omnibox);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<OmniboxMode>('editUrl');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef(false); // onFocus 在 rAF 里触发，闭包里的 editing 可能过期，用 ref 兜底

  // ---- 主进程要求聚焦（菜单快捷键） ----
  useEffect(() => {
    if (!request) return;
    begin(request.value);
  }, [request?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 建议：防抖查询 ----
  useEffect(() => {
    if (!editing) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void query({ type: 'suggest', input: value, tabsOnly: mode === 'searchTabs', limit: 8 }).then((list) => {
        setItems(list);
        setSelected(0);
      });
    }, DEBOUNCE_MS);
  }, [value, editing, mode]);

  const begin = (next: OmniboxMode) => {
    editingRef.current = true;
    setMode(next);
    setValue(next === 'editUrl' ? (tab?.url ?? '') : '');
    setEditing(true);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
  };

  const close = () => {
    editingRef.current = false;
    setEditing(false);
    setItems([]);
    input.current?.blur();
  };

  const act = (item: Suggestion | null, newTab: boolean) => {
    const text = value.trim();
    close();
    if (item?.kind === 'tab') {
      send({ type: 'tab.activate', tabId: item.tabId });
      return;
    }
    const target = item ? item.url : text;
    if (!target) return;
    if (newTab || mode === 'newTab' || !tab) send({ type: 'tab.create', url: target });
    else send({ type: 'tab.navigate', input: target, tabId: tab.id });
  };

  const shown = editing ? value : displayUrl(tab?.url ?? '');
  const secure = tab?.url.startsWith('https://');
  const placeholder = mode === 'searchTabs' ? 'Search tabs…' : 'Search or Enter URL';

  return (
    <div className="no-drag relative px-2 pt-1 pb-1.5">
      <div
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border bg-input pl-2.5 pr-2 transition-[border-color,box-shadow] duration-200',
          editing ? 'border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]' : 'border-border',
        )}
      >
        {mode === 'searchTabs' && editing ? (
          <Window size={13} className="shrink-0 text-muted-foreground" />
        ) : secure ? (
          <Lock size={12} className="shrink-0 text-muted-foreground" />
        ) : (
          <Search size={13} className="shrink-0 text-muted-foreground" />
        )}
        <input
          ref={input}
          value={shown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onFocus={() => {
            if (!editingRef.current) begin('editUrl');
          }}
          onBlur={() => setTimeout(close, 120)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              act(items[selected] ?? null, e.metaKey || e.ctrlKey);
            } else if (e.key === 'Escape') {
              close();
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {editing && items.length > 0 && (
        <div className="laper-menu-motion absolute inset-x-2 top-full z-40 mt-1 rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg">
          {items.map((item, i) => (
            <button
              key={`${item.kind}:${'url' in item ? item.url : ''}:${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelected(i)}
              onClick={() => act(item, false)}
              className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors', i === selected ? 'bg-accent/70 text-foreground' : 'text-foreground')}
            >
              <SuggestionIcon item={item} />
              <span className="min-w-0 flex-1 truncate">{label(item)}</span>
              {item.kind === 'tab' && <Kbd>Switch</Kbd>}
              {i === selected && item.kind !== 'tab' && <Kbd>↵</Kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function label(item: Suggestion): string {
  switch (item.kind) {
    case 'tab':
      return item.title;
    case 'history':
      return item.title ? `${item.title} — ${displayUrl(item.url)}` : displayUrl(item.url);
    case 'url':
      return displayUrl(item.url) || item.url;
    case 'search':
      return `Search “${item.query}”`;
  }
}

function SuggestionIcon({ item }: { item: Suggestion }) {
  const cls = 'shrink-0 text-muted-foreground';
  switch (item.kind) {
    case 'tab':
      return <Window size={13} className={cls} />;
    case 'history':
      return <Clock size={13} className={cls} />;
    case 'url':
      return <Globe size={13} className={cls} />;
    case 'search':
      return <Search size={13} className={cls} />;
  }
}
