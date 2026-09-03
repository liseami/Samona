/**
 * [INPUT]: 依赖 ./store 的 ChatStore，./provider 的 ChatProvider，@shared/chat 的 ChatMode/ChatDelta
 * [OUTPUT]: 对外提供 ChatService 类：send（用户消息 → 回答者的 ChatDelta 流 → 文字消息与工具胶囊）、stop、线程操作、形态切换、setProvider 热切换的业务门面
 * [POS]: chat 模块的指挥者，是 ChatStore 的唯一写者；ipc/handlers 与 ChatWindow 只调用它。它把回答者的事件流翻译成消息序列：文字 → 助手消息；tool.start 收束当前文字、开一个胶囊；tool.end 收束胶囊；之后的文字开新消息
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ChatMessage, ChatMode } from '@shared/chat';
import type { ChatProvider } from './provider';
import type { ChatStore } from './store';

export class ChatService {
  private inflight: AbortController | null = null;

  constructor(
    readonly store: ChatStore,
    private provider: ChatProvider,
  ) {
    this.publishProvider();
  }

  get providerName(): string {
    return this.provider.name;
  }

  setProvider(provider: ChatProvider): void {
    this.stop();
    this.provider = provider;
    this.publishProvider();
  }
  private publishProvider(): void {
    this.store.setProvider(this.provider.name, { needsKey: this.provider.name === 'keyless', model: this.provider.model });
  }

  setMode(mode: ChatMode): void {
    this.store.setMode(mode);
  }

  async send(text: string): Promise<void> {
    const content = text.trim();
    if (!content) return;
    this.stop();
    const threadId = this.store.currentThreadId;
    this.store.append(threadId, 'user', content);
    const controller = new AbortController();
    this.inflight = controller;
    const { signal } = controller;

    // ---- 事件流 → 消息序列 ----
    let current: ChatMessage | null = this.store.append(threadId, 'assistant', '', 'streaming'); // 先占位：UI 立刻显示思考指示
    const tools = new Map<string, string>(); // callId → messageId
    const closeText = () => {
      if (!current) return;
      if (current.content === '') this.store.remove(current.id);
      else this.store.finish(current.id, 'done');
      current = null;
    };
    try {
      for await (const delta of this.provider.stream(this.store.messagesOf(threadId).slice(0, -1), signal, { threadId })) {
        if (signal.aborted) break;
        switch (delta.type) {
          case 'text':
            if (!current) current = this.store.append(threadId, 'assistant', '', 'streaming');
            this.store.appendDelta(current.id, delta.text);
            break;
          case 'tool.start': {
            closeText();
            const m = this.store.appendTool(threadId, { callId: delta.callId, name: delta.name, label: delta.label, input: delta.input });
            tools.set(delta.callId, m.id);
            break;
          }
          case 'tool.end': {
            const id = tools.get(delta.callId);
            if (!id) break;
            this.store.updateTool(id, { output: delta.output, ok: delta.ok, identityId: delta.identityId ?? null });
            this.store.finish(id, delta.ok ? 'done' : 'error');
            current = this.store.append(threadId, 'assistant', '', 'streaming'); // 模型在想下一步：占位让思考指示不断
            break;
          }
        }
      }
      if (signal.aborted) this.store.stopStreaming(threadId);
      else closeText();
    } catch (err) {
      if (signal.aborted) this.store.stopStreaming(threadId);
      else {
        if (!current) current = this.store.append(threadId, 'assistant', '', 'streaming');
        this.store.appendDelta(current.id, `${current.content ? '\n\n' : ''}${err instanceof Error ? err.message : String(err)}`);
        this.store.finish(current.id, 'error');
        this.store.stopStreaming(threadId);
      }
    } finally {
      if (this.inflight === controller) this.inflight = null;
    }
  }

  stop(): void {
    this.inflight?.abort();
    this.inflight = null;
  }

  newThread(): void {
    this.stop();
    this.store.newThread();
  }
  switchThread(threadId: string): void {
    this.stop();
    this.store.switchThread(threadId);
  }
  deleteThread(threadId: string): void {
    if (threadId === this.store.currentThreadId) this.stop();
    this.store.deleteThread(threadId);
  }
}
