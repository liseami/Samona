/**
 * [INPUT]: 依赖 node:fs/promises 的读写、node:path，依赖 ./store 的 PersistedState 类型
 * [OUTPUT]: 对外提供 loadJson(file)、loadState(file)（v3，兼容 v1/v2 由 store 迁移）、createSaver<T>(file) —— 防抖 + 原子写（tmp → rename）
 * [POS]: browser 模块的落盘层，只认识 JSON 与文件路径，不认识 Electron；store 与 history 都经它落盘
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AnyPersistedState, PersistedState } from './store';

const SAVE_DEBOUNCE_MS = 400;

export async function loadJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function loadState(file: string): Promise<AnyPersistedState | null> {
  const parsed = await loadJson<{ version: number; spaces?: unknown; identities?: unknown }>(file);
  if (!parsed) return null;
  if (parsed.version === 3 && Array.isArray(parsed.identities)) return parsed as unknown as PersistedState;
  if ((parsed.version === 1 || parsed.version === 2) && Array.isArray(parsed.spaces)) return parsed as unknown as AnyPersistedState;
  return null;
}

export function createSaver<T = PersistedState>(file: string): { schedule(state: () => T): void; flush(): Promise<void> } {
  let timer: NodeJS.Timeout | null = null;
  let pending: (() => T) | null = null;
  let inflight: Promise<void> = Promise.resolve();

  const write = async () => {
    const produce = pending;
    pending = null;
    if (!produce) return;
    const json = JSON.stringify(produce(), null, 2);
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, json, 'utf8');
    await rename(tmp, file);
  };

  return {
    schedule(state) {
      pending = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        inflight = inflight.then(write).catch((err) => console.error('[samo] state save failed', err));
      }, SAVE_DEBOUNCE_MS);
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      inflight = inflight.then(write).catch((err) => console.error('[samo] state save failed', err));
      await inflight;
    },
  };
}
