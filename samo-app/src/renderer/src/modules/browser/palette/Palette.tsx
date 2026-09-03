/**
 * [INPUT]: 依赖 react，@shared/ipc 的 PaletteMode/Command/Query，@shared/model 的 Suggestion，@shared/url 的 displayUrl，../icons，../components/ui/keycap，../lib/utils 的 cn，window.samo 桥
 * [OUTPUT]: 对外提供 Palette 组件：Laper CommandPalette 形态的命令面板——居中对话框（max-w-2xl、rounded-2xl、border、shadow-xl）+ 纯色遮罩 bg-foreground/40，输入行、分组结果（打开的标签 / 历史 / 直达）、键帽页脚；↑↓ 循环、Enter 执行、⌘Enter 新标签、Esc 关闭
 * [POS]: renderer/overlay 的唯一界面；由主进程 openPalette 事件驱动（newTab / editUrl / searchTabs），动作直接发 Command，关闭时通知主进程隐藏 overlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Command, PaletteMode } from '@shared/ipc';
import type { Suggestion } from '@shared/model';
import { displayUrl } from '@shared/url';
import { ArrowRight, Clock, Close, Globe, Search, Window } from '../../../icons';
import { Keycap } from '../../../components/ui/keycap';
import { cn } from '../../../lib/utils';

const DEBOUNCE_MS = 100;
const send = (c: Command) => void window.samo.invoke(c);
import { query } from '../../../store/browser';

export function Palette() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>('newTab');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 主进程要求打开 ----
  useEffect(
    () =>
      window.samo.onEvent((event) => {
        if (event.type !== 'openPalette') return;
        setMode(event.mode);
        setValue(event.mode === 'editUrl' ? event.url : '');
        setItems([]);
        setSelected(0);
        setOpen(true);
        requestAnimationFrame(() => {
          input.current?.focus();
          input.current?.select();
        });
      }),
    [],
  );

  // ---- 建议：防抖查询 ----
  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void query({ type: 'suggest', input: value, tabsOnly: mode === 'searchTabs', limit: 10 }).then((list) => {
        setItems(list);
        setSelected(0);
      });
    }, DEBOUNCE_MS);
  }, [value, open, mode]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const close = () => {
    setOpen(false);
    send({ type: 'palette.close' });
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
    if (newTab || mode !== 'editUrl') send({ type: 'tab.create', url: target });
    else send({ type: 'tab.navigate', input: target });
  };

  const groups = useMemo<{ label: string; list: Suggestion[] }[]>(() => {
    const go: Suggestion[] = items.filter((i) => i.kind === 'url' || i.kind === 'search');
    const tabs: Suggestion[] = items.filter((i) => i.kind === 'tab');
    const history: Suggestion[] = items.filter((i) => i.kind === 'history');
    const all: { label: string; list: Suggestion[] }[] =
      mode === 'searchTabs'
        ? [{ label: 'Tabs', list: tabs }]
        : [
            { label: 'Go', list: go },
            { label: 'Open tabs', list: tabs },
            { label: 'History', list: history },
          ];
    return all.filter((g) => g.list.length > 0);
  }, [items, mode]);
  const flat: Suggestion[] = groups.flatMap((g) => g.list);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-4" role="dialog" aria-modal="true">
      <div className="laper-backdrop-fade absolute inset-0 bg-foreground/40" onMouseDown={close} />
      <div className="laper-dialog-pop absolute top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        {/* ---- 输入行 ---- */}
        <div className="flex items-center gap-3 px-4 py-3">
          {mode === 'searchTabs' ? <Window size={16} className="shrink-0 text-muted-foreground" /> : <Search size={16} className="shrink-0 text-muted-foreground" />}
          <input
            ref={input}
            value={value}
            placeholder={mode === 'searchTabs' ? 'Search open tabs…' : 'Search or enter URL…'}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((i) => (flat.length ? (i + 1) % flat.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
              } else if (e.key === 'Enter') {
                act(flat[selected] ?? null, e.metaKey || e.ctrlKey);
              } else if (e.key === 'Escape') {
                close();
              }
            }}
            className="flex-1 border-none bg-transparent text-base text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:border-none focus:outline-none focus:ring-0"
          />
          <button type="button" aria-label="Close" onClick={close} className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
            <Close size={16} />
          </button>
        </div>

        {/* ---- 结果 ---- */}
        {flat.length > 0 && (
          <div className="border-t border-border">
            <div ref={list} className="max-h-[60vh] overflow-y-auto px-2 py-2">
              {groups.map((g) => (
                <div key={g.label} className="mb-2 last:mb-0">
                  <div className="mb-1 px-2 pt-1 text-xs font-semibold text-muted-foreground">{g.label}</div>
                  <div className="space-y-0.5">
                    {g.list.map((item) => {
                      const index = flat.indexOf(item);
                      const active = index === selected;
                      return (
                        <button
                          key={`${item.kind}:${index}`}
                          type="button"
                          data-index={index}
                          onMouseEnter={() => setSelected(index)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => act(item, e.metaKey || e.ctrlKey)}
                          className={cn('group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors', active && 'bg-muted')}
                        >
                          <span className="flex shrink-0 items-center text-muted-foreground">
                            <ItemIcon item={item} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 truncate">
                              <span className="truncate text-base text-foreground">
                                <Highlighted text={primary(item)} q={value} />
                              </span>
                              {secondary(item) && (
                                <>
                                  <span className="shrink-0 text-muted-foreground">—</span>
                                  <span className="truncate text-sm text-muted-foreground">{secondary(item)}</span>
                                </>
                              )}
                            </span>
                          </span>
                          <ArrowRight size={16} className={cn('shrink-0 text-muted-foreground transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {value.trim() && flat.length === 0 && <div className="border-t border-border p-8 text-center text-sm text-muted-foreground">No matches</div>}

        {/* ---- 页脚 ---- */}
        <div className="flex items-center justify-between border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Keycap>↑</Keycap>
            <Keycap>↓</Keycap>
            <span className="ml-1">Navigate</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Keycap>⌘ ↵</Keycap> New tab
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>↵</Keycap> {mode === 'editUrl' ? 'Go' : 'Open'}
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>Esc</Keycap> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function primary(item: Suggestion): string {
  switch (item.kind) {
    case 'tab':
      return item.title;
    case 'history':
      return item.title || displayUrl(item.url);
    case 'url':
      return displayUrl(item.url) || item.url;
    case 'search':
      return `Search “${item.query}”`;
  }
}
function secondary(item: Suggestion): string {
  switch (item.kind) {
    case 'tab':
      return displayUrl(item.url);
    case 'history':
      return item.title ? displayUrl(item.url) : '';
    case 'url':
      return 'Open URL';
    case 'search':
      return 'Google';
  }
}

function ItemIcon({ item }: { item: Suggestion }) {
  switch (item.kind) {
    case 'tab':
      return <Window size={16} />;
    case 'history':
      return <Clock size={16} />;
    case 'url':
      return <Globe size={16} />;
    case 'search':
      return <Search size={16} />;
  }
}

/** 命中片段高亮（Laper：<mark class="rounded-sm bg-primary/20 text-foreground">） */
function Highlighted({ text, q }: { text: string; q: string }) {
  const needle = q.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-primary/20 text-foreground">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}
