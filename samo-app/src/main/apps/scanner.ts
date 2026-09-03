/**
 * [INPUT]: 依赖 node:child_process 的 execFile（lsof），全局 fetch，@shared/model 的 AppEntry
 * [OUTPUT]: 对外提供 scanLocalApps()：枚举本机监听中的 TCP 端口（lsof），逐个用 HTTP 探测根路径，只把回 text/html 的当作应用，名字取 <title>；按端口排除 Samo 自己的开发服务器
 * [POS]: apps 模块的眼睛——「正在 localhost 上跑的应用」的唯一判定；探测并发、单端口 700ms 超时，一次扫描通常 < 1s
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { execFile } from 'node:child_process';
import type { AppEntry } from '@shared/model';

const PROBE_TIMEOUT_MS = 700;
const MAX_BODY = 64 * 1024;
/** 明知不是网页的端口：数据库、缓存、SSH、打印 */
const SKIP_PORTS = new Set([22, 25, 53, 110, 143, 445, 631, 993, 995, 1433, 3306, 5432, 6379, 11211, 27017]);

interface Listener {
  port: number;
  process: string;
}

function listListeners(): Promise<Listener[]> {
  return new Promise((resolve) => {
    execFile('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeout: 4000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err && !stdout) return resolve([]);
      const seen = new Map<number, Listener>();
      for (const line of String(stdout).split('\n').slice(1)) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 9) continue;
        const name = cols[cols.length - 1] === '(LISTEN)' ? cols[cols.length - 2] : cols[cols.length - 1]; // NAME 列形如 *:5173 / 127.0.0.1:5173 / [::1]:5173
        const port = Number(name.slice(name.lastIndexOf(':') + 1));
        if (!Number.isInteger(port) || port <= 0 || SKIP_PORTS.has(port)) continue;
        if (!seen.has(port)) seen.set(port, { port, process: cols[0].replace(/\\x20/g, ' ') });
      }
      resolve([...seen.values()].sort((a, b) => a.port - b.port));
    });
  });
}

async function probe(listener: Listener): Promise<AppEntry | null> {
  const url = `http://localhost:${listener.port}/`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS), redirect: 'follow', headers: { accept: 'text/html' } });
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/html')) return null;
    const body = (await res.text()).slice(0, MAX_BODY);
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    const icon = await findIcon(url, body);
    return { id: `local:${listener.port}`, visibility: 'local', name: title || listener.process, url, port: listener.port, process: listener.process, icon };
  } catch {
    return null;
  }
}

/** 网页的 favicon：先看 <link rel="icon">（含 shortcut / apple-touch），再试 /favicon.ico */
async function findIcon(pageUrl: string, html: string): Promise<string | null> {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    if (!/(^|\s)(icon|shortcut icon|apple-touch-icon)(\s|$)/.test(rel)) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      /* 非法 href */
    }
  }
  try {
    const fallback = new URL('/favicon.ico', pageUrl).toString();
    const res = await fetch(fallback, { method: 'HEAD', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) return fallback;
  } catch {
    /* 没有 */
  }
  return null;
}

export async function scanLocalApps(excludePorts: ReadonlySet<number> = new Set()): Promise<AppEntry[]> {
  const listeners = (await listListeners()).filter((l) => !excludePorts.has(l.port)); // 排除 Samo 自己的开发服务器
  const results = await Promise.allSettled(listeners.map(probe));
  return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
}
