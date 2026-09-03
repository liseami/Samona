/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMessage
 * [OUTPUT]: 对外提供 ChatProvider 接口（流式回答的唯一抽象）与 StubProvider（无模型时的本地回声，逐词流式）
 * [POS]: chat 模块的回答者插槽——未来接模型或 agent 网关时只换实现，ChatService 与 UI 不动
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ChatMessage } from '@shared/chat';

export interface ChatProvider {
  readonly name: string;
  /** 逐段产出回答；signal 触发即停止 */
  stream(history: ChatMessage[], signal: AbortSignal): AsyncIterable<string>;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

/** 占位回答者：把用户的话复述回来，逐词流式，证明整条链路（存储 → 流式 → 三处 UI）是通的 */
export class StubProvider implements ChatProvider {
  readonly name = 'stub';
  async *stream(history: ChatMessage[], signal: AbortSignal): AsyncIterable<string> {
    const last = [...history].reverse().find((m) => m.role === 'user');
    const text = `No model is connected yet, so here is your message back:\n\n> ${last?.content ?? ''}\n\nWire a provider in \`main/chat/provider.ts\` and this panel becomes the agent's voice.`;
    for (const word of text.split(/(\s+)/)) {
      if (signal.aborted) return;
      yield word;
      if (word.trim()) await sleep(18, signal);
    }
  }
}
