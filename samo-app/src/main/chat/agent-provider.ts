/**
 * [INPUT]: 依赖 @anthropic-ai/sdk（Messages API 流式 + 工具调用），./provider 的 ChatProvider 契约，./prompt 的 buildSystemPrompt，../agent/runner 的 ScriptRunner，@shared/chat 的 ChatDelta/ChatMessage
 * [OUTPUT]: 对外提供 AgentProvider：Claude 驱动的回答者——手写的流式 agent 循环（文字增量即时产出；`browser` 工具 → samo-browser 子进程跑脚本 → 结果回填），以及 AgentProviderDeps 依赖契约
 * [POS]: chat 模块里真正的「Samo AI」。模型只有一个工具：写一段 ego-browser 脚本（Code base, not CLI base）；脚本经网关驱动浏览器，视觉反馈（光标/发光/标签）由 agent/presence 负责，本文件不碰 UI
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ChatDelta, ChatMessage } from '@shared/chat';
import type { ScriptRunner } from '../agent/runner';
import { buildSystemPrompt, type PromptContext } from './prompt';
import type { ChatProvider, ChatProviderContext } from './provider';

export interface AgentProviderDeps {
  apiKey: string;
  model: string;
  runner: ScriptRunner;
  /** 当前浏览器上下文（写进系统提示） */
  context(): Omit<PromptContext, 'taskSpace' | 'locale'>;
  /** 按 task space 名找到 agent 身份 id（供胶囊的「Watch」跳转） */
  identityForTask(taskSpace: string): number | null;
}

const MAX_ROUNDS = 30;
const MAX_TOKENS = 16_000;

const BROWSER_TOOL: Anthropic.Tool = {
  name: 'browser',
  description:
    "Run a JavaScript script inside Samo's ego-browser runtime (Node.js) to drive the browser: open pages, read snapshots, click, fill, wait, extract, verify. Write one coherent script per call that advances the task as far as the available inputs allow, and print what you need with console.log. Only the script's console output comes back.",
  input_schema: {
    type: 'object',
    properties: {
      label: { type: 'string', description: 'A 3-6 word present-tense description of what this script does, shown to the user (e.g. "Searching flights on Google").' },
      script: { type: 'string', description: 'The JavaScript to run. Globals: page, page.locator, browser, taskSpaces, fetch, cdp, help.' },
    },
    required: ['label', 'script'],
    additionalProperties: false,
  },
  strict: true,
};

/** 把线程历史压成 Messages API 的 user/assistant 交替序列；工具胶囊不回放（助手的收尾文字已经承载了结论） */
function toMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of history) {
    if (m.kind === 'tool' || m.role === 'system') continue;
    const text = m.content.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role && typeof last.content === 'string') last.content += `\n\n${text}`;
    else out.push({ role: m.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export class AgentProvider implements ChatProvider {
  readonly name = 'claude';
  readonly model: string;
  private readonly client: Anthropic;

  constructor(private readonly deps: AgentProviderDeps) {
    this.model = deps.model;
    this.client = new Anthropic({ apiKey: deps.apiKey });
  }

  async *stream(history: ChatMessage[], signal: AbortSignal, context: ChatProviderContext): AsyncIterable<ChatDelta> {
    const taskSpace = `samo-chat-${context.threadId.slice(0, 8)}`;
    const system = buildSystemPrompt({ ...this.deps.context(), taskSpace, locale: Intl.DateTimeFormat().resolvedOptions().locale });
    const messages = toMessages(history);
    if (messages.length === 0) return;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        if (signal.aborted) return;
        const stream = this.client.messages.stream(
          { model: this.model, max_tokens: MAX_TOKENS, system, tools: [BROWSER_TOOL], thinking: { type: 'adaptive' }, messages },
          { signal },
        );
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield { type: 'text', text: event.delta.text };
        }
        const message = await stream.finalMessage();
        if (message.stop_reason === 'refusal') {
          yield { type: 'text', text: '\n\nI can’t help with that request.' };
          return;
        }
        messages.push({ role: 'assistant', content: message.content });
        if (message.stop_reason === 'pause_turn') continue;
        const uses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        if (uses.length === 0 || message.stop_reason !== 'tool_use') return;

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of uses) {
          if (signal.aborted) return;
          const input = use.input as { script?: string; label?: string };
          const label = input.label?.trim() || 'Working in the browser';
          const script = String(input.script ?? '');
          yield { type: 'tool.start', callId: use.id, name: use.name, label, input: script };
          const result = await this.deps.runner.run(script, { taskSpace, label, signal });
          const identityId = this.deps.identityForTask(taskSpace);
          yield { type: 'tool.end', callId: use.id, output: result.output, ok: result.ok, identityId };
          results.push({ type: 'tool_result', tool_use_id: use.id, content: result.output.trim() || (result.ok ? '(no output)' : '(failed without output)'), is_error: !result.ok });
        }
        messages.push({ role: 'user', content: results });
      }
      yield { type: 'text', text: '\n\nI stopped after too many browser rounds. Tell me how to continue.' };
    } catch (err) {
      if (signal.aborted) return;
      yield { type: 'text', text: `\n\n${describe(err)}` };
    }
  }
}

function describe(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Your Anthropic API key was rejected. Paste a valid key to reconnect.';
  if (err instanceof Anthropic.RateLimitError) return 'The model is rate-limited right now. Try again in a moment.';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the Anthropic API. Check your network.';
  if (err instanceof Anthropic.APIError) return `Model error ${err.status ?? ''}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
