/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMessage/ChatThread/ChatMode/ChatSnapshot/CHAT_DEFAULTS
 * [OUTPUT]: 对外提供 ChatStore 类：线程/消息/流式追加/形态/未读/停靠宽度的内存真相 + 订阅 + 落盘形态
 * [POS]: chat 模块的状态心脏，零 Electron 依赖；ChatService 是唯一写者，窗口与 IPC 只读快照。与 BrowserStore 平行而独立：对话的节奏（流式）与标签的节奏不同，不混一条通道
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { CHAT_DEFAULTS, type ChatMessage, type ChatMode, type ChatSnapshot, type ChatThread } from '@shared/chat';

export interface PersistedChat {
  version: 1;
  threads: ChatThread[];
  messages: ChatMessage[];
  activeThreadId: string;
  dockWidth: number;
}

type Listener = (snapshot: ChatSnapshot) => void;
const MAX_THREADS = 50;

export class ChatStore {
  private threads = new Map<string, ChatThread>();
  private messages = new Map<string, ChatMessage>();
  private order: string[] = []; // 消息全局顺序
  private activeThreadId = '';
  private mode: ChatMode = 'closed';
  private unread = 0;
  private dockWidth: number = CHAT_DEFAULTS.dockWidth;
  private provider = 'stub';
  private listeners = new Set<Listener>();
  private scheduled = false;

  constructor() {
    this.ensureThread();
  }

  // ---------- 订阅 ----------
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      const snap = this.snapshot();
      for (const l of this.listeners) l(snap);
    });
  }

  snapshot(): ChatSnapshot {
    const messages = this.messagesOf(this.activeThreadId);
    return {
      mode: this.mode,
      activeThreadId: this.activeThreadId,
      threads: [...this.threads.values()].sort((a, b) => b.updatedAt - a.updatedAt),
      messages,
      generating: messages.some((m) => m.status === 'streaming'),
      unread: this.unread,
      dockWidth: this.dockWidth,
      provider: this.provider,
    };
  }

  // ---------- 查询 ----------
  get currentMode(): ChatMode {
    return this.mode;
  }
  get currentThreadId(): string {
    return this.activeThreadId;
  }
  messagesOf(threadId: string): ChatMessage[] {
    return this.order.map((id) => this.messages.get(id)!).filter((m) => m && m.threadId === threadId);
  }
  getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }
  streamingIn(threadId: string): ChatMessage | undefined {
    return this.messagesOf(threadId).find((m) => m.status === 'streaming');
  }

  // ---------- 形态 ----------
  setMode(mode: ChatMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode !== 'closed') this.unread = 0;
    this.emit();
  }
  setDockWidth(width: number): void {
    this.dockWidth = Math.min(CHAT_DEFAULTS.dockMaxWidth, Math.max(CHAT_DEFAULTS.dockMinWidth, Math.round(width)));
    this.emit();
  }
  setProvider(name: string): void {
    this.provider = name;
    this.emit();
  }

  // ---------- 线程 ----------
  ensureThread(): ChatThread {
    const existing = this.threads.get(this.activeThreadId);
    if (existing) return existing;
    return this.newThread();
  }
  newThread(): ChatThread {
    const thread: ChatThread = { id: crypto.randomUUID(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now() };
    this.threads.set(thread.id, thread);
    this.activeThreadId = thread.id;
    this.trimThreads();
    this.emit();
    return thread;
  }
  switchThread(threadId: string): void {
    if (!this.threads.has(threadId)) return;
    this.activeThreadId = threadId;
    this.emit();
  }
  deleteThread(threadId: string): void {
    if (!this.threads.delete(threadId)) return;
    for (const m of this.messagesOf(threadId)) this.messages.delete(m.id);
    this.order = this.order.filter((id) => this.messages.has(id));
    if (this.activeThreadId === threadId) {
      const next = [...this.threads.values()].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      this.activeThreadId = next?.id ?? '';
      this.ensureThread();
    }
    this.emit();
  }

  // ---------- 消息 ----------
  append(threadId: string, role: ChatMessage['role'], content: string, status: ChatMessage['status'] = 'done'): ChatMessage {
    const message: ChatMessage = { id: crypto.randomUUID(), threadId, role, content, status, createdAt: Date.now() };
    this.messages.set(message.id, message);
    this.order.push(message.id);
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.updatedAt = message.createdAt;
      if (role === 'user' && thread.title === 'New chat') thread.title = content.trim().slice(0, 40) || 'New chat';
    }
    this.emit();
    return message;
  }
  appendDelta(messageId: string, delta: string): void {
    const m = this.messages.get(messageId);
    if (!m || m.status !== 'streaming') return;
    m.content += delta;
    this.emit();
  }
  finish(messageId: string, status: Exclude<ChatMessage['status'], 'streaming'> = 'done'): void {
    const m = this.messages.get(messageId);
    if (!m) return;
    m.status = status;
    if (m.role === 'assistant' && this.mode === 'closed') this.unread += 1;
    this.emit();
  }

  private trimThreads(): void {
    const sorted = [...this.threads.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const t of sorted.slice(MAX_THREADS)) this.deleteThread(t.id);
  }

  // ---------- 落盘 ----------
  toPersisted(): PersistedChat {
    return {
      version: 1,
      threads: [...this.threads.values()],
      messages: this.order.map((id) => this.messages.get(id)!).filter(Boolean).map((m) => ({ ...m, status: m.status === 'streaming' ? 'stopped' : m.status })),
      activeThreadId: this.activeThreadId,
      dockWidth: this.dockWidth,
    };
  }
  hydrate(state: PersistedChat): void {
    this.threads.clear();
    this.messages.clear();
    this.order = [];
    for (const t of state.threads) this.threads.set(t.id, { ...t });
    for (const m of state.messages) {
      if (!this.threads.has(m.threadId)) continue;
      this.messages.set(m.id, { ...m });
      this.order.push(m.id);
    }
    this.activeThreadId = this.threads.has(state.activeThreadId) ? state.activeThreadId : '';
    this.dockWidth = state.dockWidth ?? CHAT_DEFAULTS.dockWidth;
    this.ensureThread();
    this.emit();
  }
}
