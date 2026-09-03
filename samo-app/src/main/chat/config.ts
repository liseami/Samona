/**
 * [INPUT]: 依赖 node:fs 同步读写，node:path
 * [OUTPUT]: 对外提供 ChatConfigStore：config.json（userData，0600）里的模型密钥、模型 id 与外观主题；resolveKey() 先看文件再看 ANTHROPIC_API_KEY 环境变量
 * [POS]: chat 模块的密钥保管处；只有主进程读它，渲染层永远拿不到密钥本身（快照里只有 needsKey 布尔）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ChatConfig {
  anthropicApiKey?: string;
  model?: string;
  theme?: 'system' | 'light' | 'dark'; // 外观（虽在 chat 的 config.json 里，但属于全应用设置）
}

export const DEFAULT_MODEL = 'claude-opus-5';

export class ChatConfigStore {
  constructor(private readonly path: string) {}

  read(): ChatConfig {
    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as ChatConfig;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  write(patch: ChatConfig): ChatConfig {
    const next = { ...this.read(), ...patch };
    for (const key of Object.keys(next) as (keyof ChatConfig)[]) if (!next[key]) delete next[key];
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(next, null, 2), { mode: 0o600 });
    chmodSync(this.path, 0o600);
    return next;
  }

  /** 文件里的密钥优先，其次环境变量；都没有则 null */
  resolveKey(): string | null {
    const fromFile = this.read().anthropicApiKey?.trim();
    if (fromFile) return fromFile;
    const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
    return fromEnv || null;
  }

  resolveModel(): string {
    return this.read().model?.trim() || DEFAULT_MODEL;
  }
}
