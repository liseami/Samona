/**
 * [INPUT]: 依赖 @shared/chat 的 ChatMessage/ChatDelta
 * [OUTPUT]: 对外提供 ChatProvider 接口（流式回答的唯一抽象，产出 ChatDelta）、ChatProviderContext、StubProvider（本地回声）、KeylessProvider（未配置密钥时的引导语）
 * [POS]: chat 模块的回答者插槽——真正的回答者是 ./agent-provider 的 AgentProvider（Claude + samo-browser 运行时）；ChatService 与 UI 只认这个接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ChatDelta, ChatMessage } from '@shared/chat';

export interface ChatProviderContext {
  threadId: string;
}

export interface ChatProvider {
  readonly name: string;
  /** 当前模型 id；无模型时为空串 */
  readonly model: string;
  /** 逐段产出回答事件；signal 触发即停止 */
  stream(history: ChatMessage[], signal: AbortSignal, context: ChatProviderContext): AsyncIterable<ChatDelta>;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

async function* words(text: string, signal: AbortSignal): AsyncIterable<ChatDelta> {
  for (const word of text.split(/(\s+)/)) {
    if (signal.aborted) return;
    yield { type: 'text', text: word };
    if (word.trim()) await sleep(18, signal);
  }
}

/** 占位回答者：把用户的话复述回来，逐词流式，证明整条链路（存储 → 流式 → 三处 UI）是通的 */
export class StubProvider implements ChatProvider {
  readonly name = 'stub';
  readonly model = '';
  stream(history: ChatMessage[], signal: AbortSignal): AsyncIterable<ChatDelta> {
    const last = [...history].reverse().find((m) => m.role === 'user');
    return words(`Echo (stub provider):\n\n> ${last?.content ?? ''}`, signal);
  }
}

/** 未配置密钥时的回答者：告诉用户怎么接上模型，UI 同时会显示接入卡 */
export class KeylessProvider implements ChatProvider {
  readonly name = 'keyless';
  readonly model = '';
  stream(_history: ChatMessage[], signal: AbortSignal): AsyncIterable<ChatDelta> {
    return words(
      'Samo AI is not connected to a model yet. Paste your Anthropic API key in the card above (it is stored locally in `config.json` with owner-only permissions), or launch Samo with `ANTHROPIC_API_KEY` set. Once connected I can read pages, click, fill forms and browse in my own identity while you keep working.',
      signal,
    );
  }
}
