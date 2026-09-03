/**
 * [INPUT]: 依赖 node:child_process 的 spawn，node:module 的 createRequire，samo-agent 包的 dist/cli.js（`samo-browser` 可执行入口）
 * [OUTPUT]: 对外提供 ScriptRunner：把 agent 写的一段 JS 交给 samo-browser 子进程（ELECTRON_RUN_AS_NODE 复用 Electron 自带的 Node）执行，收集 console.log 输出，超时/中止即杀；locateCli() 定位入口
 * [POS]: agent 模块里「应用内 agent」与「外部 agent」的汇合点：应用内的 Samo AI 和终端里的 Claude Code 走的是同一个 CLI、同一个网关、同一套 ego-browser helper——Code base, not CLI base
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

export interface ScriptResult {
  ok: boolean;
  output: string; // stdout + stderr，已截断
  durationMs: number;
}

export interface RunOptions {
  taskSpace: string; // 脚本应工作的 task space 名（= 对话线程）
  label?: string; // 动作标签：作为身份的 agentState 显示在侧栏与光标旁
  signal: AbortSignal;
  timeoutMs?: number;
}

const MAX_OUTPUT = 12_000; // 交给模型的输出上限；超出时保留头尾
const DEFAULT_TIMEOUT = 180_000;

export function locateCli(): string {
  const require = createRequire(import.meta.url);
  return require.resolve('samo-agent/cli');
}

export class ScriptRunner {
  constructor(private readonly cliPath: string) {}

  async run(script: string, options: RunOptions): Promise<ScriptResult> {
    const started = Date.now();
    const code = withPrelude(script, options);
    return new Promise<ScriptResult>((resolve) => {
      const chunks: string[] = [];
      let size = 0;
      const collect = (buf: Buffer) => {
        const text = buf.toString('utf8');
        size += text.length;
        chunks.push(text);
      };
      const child = spawn(process.execPath, [this.cliPath], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', SAMO_AGENT_NAME: 'Samo AI' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);

      let settled = false;
      const finish = (ok: boolean, extra = '') => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal.removeEventListener('abort', onAbort);
        resolve({ ok, output: truncate(chunks.join('') + extra, size), durationMs: Date.now() - started });
      };
      const kill = () => {
        try {
          child.kill('SIGTERM');
        } catch {
          /* 已退出 */
        }
      };
      const onAbort = () => {
        kill();
        finish(false, '\n[stopped by user]');
      };
      const timer = setTimeout(() => {
        kill();
        finish(false, `\n[timed out after ${Math.round((options.timeoutMs ?? DEFAULT_TIMEOUT) / 1000)}s]`);
      }, options.timeoutMs ?? DEFAULT_TIMEOUT);
      if (options.signal.aborted) return onAbort();
      options.signal.addEventListener('abort', onAbort);

      child.on('error', (err) => finish(false, `\n[failed to start samo-browser: ${err.message}]`));
      child.on('close', (exitCode) => finish(exitCode === 0));
      child.stdin.end(code);
    });
  }
}

/** 脚本没自己选 task space 时补上；带标签时先汇报动作，侧栏与光标旁即刻显示 */
function withPrelude(script: string, options: RunOptions): string {
  const lines: string[] = [];
  if (!/taskSpaces\.(useOrCreate|claim|takeOver|switch|new)\s*\(/.test(script)) {
    lines.push(`await taskSpaces.useOrCreate(${JSON.stringify(options.taskSpace)});`);
  }
  if (options.label) lines.push(`globalThis.ego?.setAgentTaskState?.(${JSON.stringify(options.label)});`);
  return lines.length ? `${lines.join('\n')}\n${script}` : script;
}

function truncate(text: string, size: number): string {
  if (size <= MAX_OUTPUT) return text;
  const half = Math.floor(MAX_OUTPUT / 2);
  return `${text.slice(0, half)}\n\n[… ${size - MAX_OUTPUT} characters omitted …]\n\n${text.slice(-half)}`;
}
