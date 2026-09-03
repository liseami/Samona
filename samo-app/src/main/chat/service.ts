/**
 * [INPUT]: 依赖 ./store 的 ChatStore，./provider 的 ChatProvider，@shared/chat 的 ChatMode
 * [OUTPUT]: 对外提供 ChatService 类：send（用户消息 → 流式回答）、stop、线程操作、形态切换的业务门面
 * [POS]: chat 模块的指挥者，是 ChatStore 的唯一写者；ipc/handlers 与 ChatWindow 只调用它
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ChatMode } from '@shared/chat';
import type { ChatProvider } from './provider';
import type { ChatStore } from './store';

export class ChatService {
  private inflight: AbortController | null = null;

  constructor(
    readonly store: ChatStore,
    private provider: ChatProvider,
  ) {
    store.setProvider(provider.name);
  }

  setProvider(provider: ChatProvider): void {
    this.stop();
    this.provider = provider;
    this.store.setProvider(provider.name);
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
    const reply = this.store.append(threadId, 'assistant', '', 'streaming');
    const controller = new AbortController();
    this.inflight = controller;
    try {
      for await (const delta of this.provider.stream(this.store.messagesOf(threadId), controller.signal)) {
        if (controller.signal.aborted) break;
        this.store.appendDelta(reply.id, delta);
      }
      this.store.finish(reply.id, controller.signal.aborted ? 'stopped' : 'done');
    } catch (err) {
      this.store.appendDelta(reply.id, `\n\n_${err instanceof Error ? err.message : String(err)}_`);
      this.store.finish(reply.id, 'error');
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
