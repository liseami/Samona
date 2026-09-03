/**
 * [INPUT]: 依赖 ./persistence 的 loadJson/createSaver，@shared/model 的 Suggestion
 * [OUTPUT]: 对外提供 HistoryStore 类：record/touchTitle 记录访问，search 给地址栏出建议；自带落盘（history.json）
 * [POS]: browser 模块的记忆层，只认 http(s) 主框架导航；engine 的事件投影是唯一写者，ipc 的 suggest 查询是主要读者
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createSaver, loadJson } from './persistence';

export interface HistoryEntry {
  url: string;
  title: string;
  visits: number;
  lastVisitAt: number;
}
interface PersistedHistory {
  version: 1;
  entries: HistoryEntry[];
}

const MAX_ENTRIES = 5000;

export class HistoryStore {
  private entries = new Map<string, HistoryEntry>();
  private saver: ReturnType<typeof createSaver>;

  constructor(private readonly file: string) {
    this.saver = createSaver(file);
  }

  async load(): Promise<void> {
    const data = await loadJson<PersistedHistory>(this.file);
    if (data?.version !== 1) return;
    for (const e of data.entries) this.entries.set(e.url, e);
  }

  async flush(): Promise<void> {
    await this.saver.flush();
  }

  record(url: string, title = ''): void {
    if (!/^https?:\/\//i.test(url)) return;
    const existing = this.entries.get(url);
    if (existing) {
      existing.visits += 1;
      existing.lastVisitAt = Date.now();
      if (title) existing.title = title;
    } else {
      this.entries.set(url, { url, title, visits: 1, lastVisitAt: Date.now() });
      this.evict();
    }
    this.schedule();
  }

  touchTitle(url: string, title: string): void {
    const e = this.entries.get(url);
    if (!e || !title || e.title === title) return;
    e.title = title;
    this.schedule();
  }

  /** 前缀命中 > 包含命中；同级按访问次数与新近度 */
  search(input: string, limit = 5): HistoryEntry[] {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    const scored: { e: HistoryEntry; s: number }[] = [];
    for (const e of this.entries.values()) {
      const host = e.url.replace(/^https?:\/\/(www\.)?/i, '').toLowerCase();
      const title = e.title.toLowerCase();
      let s = 0;
      if (host.startsWith(q)) s = 3;
      else if (title.startsWith(q)) s = 2;
      else if (host.includes(q) || title.includes(q)) s = 1;
      if (s) scored.push({ e, s: s * 1000 + Math.min(e.visits, 50) * 10 + e.lastVisitAt / 1e12 });
    }
    return scored
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.e);
  }

  private evict(): void {
    if (this.entries.size <= MAX_ENTRIES) return;
    const victims = [...this.entries.values()].sort((a, b) => a.lastVisitAt - b.lastVisitAt).slice(0, this.entries.size - MAX_ENTRIES);
    for (const v of victims) this.entries.delete(v.url);
  }

  private schedule(): void {
    this.saver.schedule(() => ({ version: 1, entries: [...this.entries.values()] }) satisfies PersistedHistory);
  }
}
