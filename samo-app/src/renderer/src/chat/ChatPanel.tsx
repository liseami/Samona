/**
 * [INPUT]: 依赖 react，react-markdown + remark-gfm，@shared/chat 的 ChatMessage/ChatThread，./store 的 useChat/chatSend/bindChat，../icons，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 ChatPanel 组件（variant: 'floating' | 'docked'）——逐 class 复刻 Laper AgentChat：头部（burger 会话抽屉 / 标题 / 新对话 / 展开=停靠 或 还原=浮出 / 收起）→ 消息列表（gap-4 px-4 py-4；用户气泡 primary 6% 淡底右对齐；助手无气泡纯 prose；工具胶囊 ToolBubble 展示 agent 的每一步浏览器动作；思考指示；错误提示胶囊；接入卡 KeyCard；助手工具条复制）→ 输入卡（rounded-[20px] bg-card 呼吸辉光、field-sizing 自增高、Enter 发送 / Shift+Enter 换行 / Esc 停止、圆形 primary 发送钮与停止钮模糊互换）→ 会话抽屉（scrim + 85% 宽滑入）；生成中底部三分之一 aurora
 * [POS]: renderer/chat 的面板本体，浮窗页与壳内停靠卡共用同一份组件；形态只影响头部动作与拖拽区
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ChatThread } from '@shared/chat';
import { ArrowUpIcon, CheckOk, ChevronDown, Clipboard, ClipboardOk, Close, CrossCircle, Eye, Globe, Key, Maximize, Menu, Minimize, NewChat, Paperclip, Spinner } from '../icons';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { bindChat, chatSend, useChat } from './store';

type Variant = 'floating' | 'docked';

export function ChatPanel({ variant }: { variant: Variant }) {
  useEffect(() => bindChat(), []);
  const snap = useChat((s) => s.snapshot);
  const [drawer, setDrawer] = useState(false);

  // ---- Esc 全局停止生成（Laper useChatEngine） ----
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && snap?.generating) chatSend({ type: 'chat.stop' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap?.generating]);

  if (!snap) return null;
  return (
    <div className="agent-chat-root relative isolate flex h-full min-h-0 w-full flex-col overflow-hidden bg-card text-foreground">
      <Aurora active={snap.generating} />
      <div className="relative z-1 flex min-h-0 flex-1 flex-col">
        <PanelHeader variant={variant} title={snap.threads.find((t) => t.id === snap.activeThreadId)?.title ?? 'New chat'} onMenu={() => setDrawer(true)} />
        <MessageList messages={snap.messages} generating={snap.generating} needsKey={snap.needsKey} />
        <Composer generating={snap.generating} collapsed={false} />
      </div>
      {drawer && <SessionDrawer threads={snap.threads} activeId={snap.activeThreadId} onClose={() => setDrawer(false)} />}
    </div>
  );
}

// ============ 头部（Laper PanelHeader：px-4 py-2 border-b，浮窗态整条可拖） ============
function PanelHeader({ variant, title, onMenu }: { variant: Variant; title: string; onMenu: () => void }) {
  const floating = variant === 'floating';
  return (
    <div className={cn('flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 select-none', floating && 'drag cursor-grab active:cursor-grabbing')}>
      <IconButton label="Conversations" onClick={onMenu}>
        <Menu size={18} />
      </IconButton>
      <span className="block min-w-0 flex-1 truncate text-lg leading-relaxed text-foreground">{title}</span>
      <div className="-mr-1 flex shrink-0 items-center gap-0.5">
        <IconButton label="New chat" onClick={() => chatSend({ type: 'chat.newThread' })}>
          <NewChat size={18} />
        </IconButton>
        {floating ? (
          <IconButton label="Expand to side" onClick={() => chatSend({ type: 'chat.setMode', mode: 'docked' })}>
            <Maximize size={18} />
          </IconButton>
        ) : (
          <IconButton label="Restore floating" onClick={() => chatSend({ type: 'chat.setMode', mode: 'floating' })}>
            <Minimize size={18} />
          </IconButton>
        )}
        <IconButton label="Collapse (⌘I)" onClick={() => chatSend({ type: 'chat.setMode', mode: 'closed' })}>
          {floating ? <ChevronDown size={18} /> : <Close size={16} />}
        </IconButton>
      </div>
    </div>
  );
}

/** Laper IconButton size=sm：p-1、rounded-xl、hover:bg-accent */
function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('no-drag flex cursor-pointer items-center justify-center rounded-xl p-1 text-foreground transition-colors duration-200 hover:bg-accent disabled:opacity-50', className)}
    >
      {children}
    </button>
  );
}

// ============ 消息列表（gap-4 px-4 py-4；贴底跟随：阈值 64px，token 增长 ≤1Hz） ============
const PIN_THRESHOLD_PX = 64;
const PIN_MIN_INTERVAL_MS = 1000;

function MessageList({ messages, generating, needsKey }: { messages: ChatMessage[]; generating: boolean; needsKey: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const lastFollow = useRef(0);
  const last = messages[messages.length - 1];
  const tailLength = last?.content.length ?? 0;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_THRESHOLD_PX;
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    const now = Date.now();
    const instant = messages.length === 0 || now - lastFollow.current > PIN_MIN_INTERVAL_MS;
    if (!instant && last?.status === 'streaming') return;
    lastFollow.current = now;
    el.scrollTo({ top: el.scrollHeight, behavior: last?.status === 'streaming' ? 'smooth' : 'auto' });
  }, [messages.length, tailLength, last?.status]);

  const showThinking = generating && (!last || last.role !== 'assistant' || (last.kind !== 'tool' && last.content === ''));
  if (messages.length === 0) return <WelcomeEmpty needsKey={needsKey} />;
  return (
    <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
      <div className="flex min-h-full flex-col gap-4 px-4 py-4">
        {needsKey && <KeyCard compact />}
        {messages.map((m) => (m.kind === 'tool' ? <ToolBubble key={m.id} message={m} /> : m.role === 'user' ? <UserBubble key={m.id} message={m} /> : <AssistantMessage key={m.id} message={m} />))}
        {showThinking && <ThinkingBubble />}
      </div>
    </div>
  );
}

// ---- 用户气泡：右对齐，primary 6% 淡底 + primary 10% 边 + 顶部 1px 内高光 ----
function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="bubble-in flex w-full flex-col items-end gap-2">
      <div
        className="max-w-[85%] rounded-2xl border border-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3.5 py-2 text-lg leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere] shadow-[0_1px_1.5px_rgba(0,0,0,0.04),0_1px_0_0_rgba(255,255,255,0.6)_inset] dark:border-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 6%, transparent)', color: 'var(--primary)' }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ---- 助手：无头像无气泡，纯 prose；结束后带工具条（复制） ----
function AssistantMessage({ message }: { message: ChatMessage }) {
  const done = message.status !== 'streaming';
  if (!message.content && !done) return null;
  return (
    <div className="bubble-in flex w-full flex-col items-start gap-1">
      {message.status === 'error' ? (
        <HintBubble tone="warning">{message.content || 'Something went wrong.'}</HintBubble>
      ) : (
        <div className="prose prose-samo max-w-[95%] text-lg leading-relaxed text-foreground [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto">
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </div>
      )}
      {done && message.content && <AssistantToolbar text={message.content} />}
      {message.status === 'stopped' && <span className="text-xs text-muted-foreground">Stopped</span>}
    </div>
  );
}

function AssistantToolbar({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="-mt-2 -ml-1.5 flex w-full items-center gap-1">
      <IconButton
        label="Copy"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        {copied ? <ClipboardOk size={15} /> : <Clipboard size={15} />}
      </IconButton>
    </div>
  );
}

// ---- 思考指示：三点 + 轮换词（Laper 是画布光球 + 80 词滚动，这里同节奏的轻量版），至少显示 2s ----
const THINKING_WORDS = ['Thinking', 'Reading the page', 'Weighing options', 'Drafting', 'Checking your tabs', 'Almost there'];
function ThinkingBubble() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % THINKING_WORDS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex w-full flex-col items-start gap-1 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((k) => (
            <span key={k} className="thinking-dot h-1.5 w-1.5 rounded-full bg-primary" style={{ animationDelay: `${k * 160}ms` }} />
          ))}
        </span>
        <span key={i} className="bubble-in">
          {THINKING_WORDS[i]}…
        </span>
      </div>
    </div>
  );
}

// ---- 提示胶囊（Laper HintBubble：warning / info 两调） ----
function HintBubble({ tone, children }: { tone: 'warning' | 'info'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'inline-flex max-w-[95%] items-center gap-2 rounded-2xl border px-3 py-1.5 text-[13px] text-foreground',
        tone === 'warning'
          ? 'border-warning/30 bg-warning/8 shadow-[0_1px_2px_rgba(245,158,11,0.08),0_1px_0_0_rgba(255,255,255,0.7)_inset]'
          : 'border-info/30 bg-info/8 shadow-[0_1px_2px_rgba(59,130,246,0.08),0_1px_0_0_rgba(255,255,255,0.7)_inset]',
      )}
    >
      {children}
    </div>
  );
}

// ---- 工具胶囊（Laper ToolCallBubble）：agent 的一次浏览器动作——图标 + 标签 + 运行/完成/失败态；点标签展开脚本输出；Watch 切到 agent 身份 ----
function ToolBubble({ message }: { message: ChatMessage }) {
  const tool = message.tool!;
  const [open, setOpen] = useState(false);
  const running = message.status === 'streaming';
  const failed = message.status === 'error' || tool.ok === false;
  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_0_0_rgba(255,255,255,0.7)_inset] dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_1px_0_0_rgba(255,255,255,0.04)_inset]">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          <Globe size={15} className="shrink-0 text-foreground/55" />
          <span className="min-w-0 text-[13px] break-words text-foreground/80 [overflow-wrap:anywhere]">{tool.label}</span>
        </button>
        {running && <Spinner size={15} className="shrink-0 animate-spin text-foreground/55" />}
        {!running && !failed && <CheckOk size={15} className="shrink-0 text-emerald-500" />}
        {!running && failed && <CrossCircle size={15} className="shrink-0 text-destructive" />}
        {tool.identityId != null && (
          <button
            type="button"
            aria-label="Watch the agent"
            title="Watch"
            onClick={() => chatSend({ type: 'identity.activate', identityId: tool.identityId! })}
            className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <Eye size={13} />
          </button>
        )}
      </div>
      {open && (
        <pre className="max-h-48 w-full max-w-[95%] overflow-auto rounded-xl border border-border bg-muted/60 px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {tool.output?.trim() || (running ? 'Running…' : '(no output)')}
        </pre>
      )}
    </div>
  );
}

// ---- 接入卡：没有模型密钥时的引导——密钥只经主进程落盘（0600），渲染层不保存 ----
function KeyCard({ compact = false }: { compact?: boolean }) {
  const [key, setKey] = useState('');
  const save = () => {
    const k = key.trim();
    if (!k) return;
    chatSend({ type: 'chat.setApiKey', key: k });
    setKey('');
  };
  return (
    <div className={cn('bubble-in w-full rounded-2xl border border-border bg-panel p-3 text-left shadow-sm', !compact && 'mt-5 max-w-[360px]')}>
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <Key size={14} className="text-muted-foreground" /> Connect Claude
      </div>
      <div className="mb-2 text-xs leading-relaxed text-muted-foreground">Paste an Anthropic API key. It stays on this Mac (config.json, owner-only). Then Samo AI can browse for you in its own identity.</div>
      <div className="flex items-center gap-1.5">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-…"
          className="h-8 min-w-0 flex-1 rounded-2xl border border-border bg-input px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40"
        />
        <Button variant="primary" size="small" disabled={!key.trim()} onClick={save}>
          Connect
        </Button>
      </div>
    </div>
  );
}

// ---- 空态：3D 倾斜全息卡 36:9 + 三行文案（Laper WelcomeEmpty，无建议芯片）；无密钥时接入卡 ----
function WelcomeEmpty({ needsKey }: { needsKey: boolean }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sx: 50, sy: 50 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 14, ry: (px - 0.5) * 18, sx: px * 100, sy: py * 100 });
  };
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center px-6 text-center select-none">
      <div style={{ perspective: 1000 }} className="mb-6 w-full max-w-[360px]">
        <div
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0, sx: 50, sy: 50 })}
          className="relative aspect-[36/9] w-full overflow-hidden rounded-2xl border border-border bg-panel shadow-sm transition-transform duration-300 ease-out"
          style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
        >
          <div
            className="holo-spin absolute -inset-1/2 opacity-60"
            style={{ background: 'conic-gradient(from 0deg, #f6c1c1, #f9e3a1, #c8f2c0, #b8e0ff, #d9c6ff, #f6c1c1)', filter: 'blur(12px) saturate(1.4)' }}
          />
          <div className="holo-slide absolute inset-y-0 -left-1/3 w-2/3 opacity-40" style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.9) 50%, transparent 80%)' }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(180px 90px at ${tilt.sx}% ${tilt.sy}%, rgba(255,255,255,0.45), transparent 70%)` }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-card/70 px-2 py-0.5 text-xs font-semibold tracking-wider text-foreground/70 uppercase backdrop-blur-sm">Samo AI</span>
          </div>
        </div>
      </div>
      <div className="text-[15px] font-medium text-foreground">Your Samo copilot, ready when you are.</div>
      <div className="mt-1 text-[14px] text-muted-foreground">It reads the page, drives the browser, and builds your apps.</div>
      <div className="text-[14px] text-muted-foreground">And much more.</div>
      {needsKey && <KeyCard />}
    </div>
  );
}

// ============ 输入区（Laper InputArea：p-2 外距，rounded-[20px] 卡，呼吸辉光，field-sizing 自增高） ============
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function Composer({ generating, collapsed }: { generating: boolean; collapsed: boolean }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [glow, setGlow] = useState(0.5);
  const ref = useRef<HTMLTextAreaElement>(null);
  const lit = focused || text.length > 0;

  // 呼吸辉光：以输入内容 hash 为种子的 xorshift32，每 700ms 换一个目标（Laper 原样）
  useEffect(() => {
    if (!lit || collapsed) return;
    let seed = hash(text) || 1;
    const t = setInterval(() => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      setGlow(0.4 + ((seed >>> 0) / 4294967296) * 0.6);
    }, 700);
    return () => clearInterval(t);
  }, [lit, collapsed, text]);

  const grow = useCallback(() => {
    const el = ref.current;
    if (!el || 'fieldSizing' in el.style) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(280, el.scrollHeight)}px`;
  }, []);
  useEffect(grow, [text, grow]);

  const submit = () => {
    const t = text.trim();
    if (!t || generating) return;
    chatSend({ type: 'chat.send', text: t });
    setText('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  const active = text.trim().length > 0;
  const boxShadow = useMemo(
    () => `0 0.125rem 0.25rem 0 hsl(0 0% 0% / 0.05), 0 1px 2px -1px hsl(0 0% 0% / 0.05)${lit ? `, 0 0 ${4 + glow * 6}px 0 color-mix(in srgb, var(--primary) ${Math.round(glow * 14)}%, transparent)` : ''}`,
    [lit, glow],
  );

  return (
    <div className="no-drag shrink-0 p-2">
      <div
        className="relative overflow-hidden rounded-[20px] border bg-card transition-[border-color,background-color,box-shadow] duration-300"
        style={{ borderColor: lit ? 'color-mix(in srgb, var(--primary) 22%, var(--border))' : 'var(--border)', boxShadow }}
      >
        <div className="relative px-3 pt-2">
          <textarea
            ref={ref}
            value={text}
            rows={1}
            disabled={generating}
            placeholder="At your command, ready whenever you are…"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ maxHeight: 280, fieldSizing: 'content' } as React.CSSProperties}
            className="w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-foreground outline-none transition-[height] duration-200 ease-out scrollbar-hide placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:opacity-60"
          />
        </div>
        <div className="relative flex items-center justify-between px-2 pt-1 pb-2">
          <button type="button" title="Attach (soon)" aria-label="Attach" className="cursor-pointer rounded-xl p-1 text-foreground transition-colors hover:bg-accent">
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            aria-label={generating ? 'Stop' : 'Send'}
            onClick={() => (generating ? chatSend({ type: 'chat.stop' }) : submit())}
            className={cn(
              'relative flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-[opacity,transform] duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
              !generating && !active ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-[1.04] hover:bg-primary/90 active:scale-[0.94]',
            )}
          >
            {/* 图标模糊互换：两枚叠放，blur(8px)+scale(.5) ⇄ 清晰 */}
            <span className={cn('absolute transition-all duration-200 ease-out', generating ? 'scale-50 opacity-0 blur-[8px]' : 'scale-100 opacity-100 blur-0')}>
              <ArrowUpIcon size={16} />
            </span>
            <span className={cn('absolute transition-all duration-200 ease-out', generating ? 'scale-100 opacity-100 blur-0' : 'scale-50 opacity-0 blur-[8px]')}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="3.5" y="3.5" width="9" height="9" rx="1.6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 会话抽屉（Laper SessionDrawer：scrim + 85% 宽从左滑入） ============
function SessionDrawer({ threads, activeId, onClose }: { threads: ChatThread[]; activeId: string; onClose: () => void }) {
  const [armed, setArmed] = useState<string | null>(null); // 3s 内再点一次才删
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <>
      <div className="absolute inset-0 z-2 bg-foreground/30 laper-backdrop-fade" onClick={onClose} />
      <div className="absolute top-0 bottom-0 left-0 z-3 flex w-[85%] flex-col border-r border-border bg-card shadow-xl" style={{ animation: 'drawer-in 0.3s cubic-bezier(0.32, 0.72, 0, 1) both' }}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="min-w-0 flex-1 truncate text-base font-medium">Conversations</span>
          <IconButton label="New chat" onClick={() => { chatSend({ type: 'chat.newThread' }); onClose(); }}>
            <NewChat size={18} />
          </IconButton>
          <IconButton label="Close" onClick={onClose}>
            <Close size={16} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {threads.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => { chatSend({ type: 'chat.switchThread', threadId: t.id }); onClose(); }}
              className={cn('group flex items-center gap-2 rounded-lg px-2 py-2 text-base transition-colors', t.id === activeId ? 'bg-accent' : 'hover:bg-accent/60')}
            >
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <button
                type="button"
                aria-label={armed === t.id ? 'Click again to delete' : 'Delete'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (armed === t.id) chatSend({ type: 'chat.deleteThread', threadId: t.id });
                  else setArmed(t.id);
                }}
                className={cn('rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground', armed === t.id && 'text-destructive opacity-100')}
              >
                <Close size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============ Aurora：生成中底部三分之一的彩光（Laper 是 WebGL，这里 CSS 近似，opacity .55） ============
function Aurora({ active }: { active: boolean }) {
  return (
    <div className={cn('pointer-events-none absolute right-0 bottom-0 left-0 z-0 overflow-hidden transition-opacity duration-600 ease-out', active ? 'opacity-55' : 'opacity-0')} style={{ height: '33.33%' }}>
      <div className="holo-spin absolute -inset-1/2" style={{ background: 'conic-gradient(from 0deg, #f6c1c1, #f9e3a1, #c8f2c0, #b8e0ff, #d9c6ff, #f6c1c1)', filter: 'blur(40px) saturate(1.3)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--card) 0%, transparent 60%)' }} />
    </div>
  );
}
