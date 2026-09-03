/**
 * [INPUT]: 无依赖，纯函数
 * [OUTPUT]: 对外提供 resolveInput（地址栏输入 → 可加载 URL）、displayUrl（URL → 地址栏展示串）、isInternalUrl
 * [POS]: shared 的地址语义工具；主进程 navigate 与渲染层 Omnibox 共用同一套判定，杜绝两侧各写一版
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const SEARCH_ENDPOINT = 'https://www.google.com/search?q=';
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HOST_LIKE = /^(localhost|[\w-]+(\.[\w-]+)+|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i;

export const INTERNAL_PREFIXES = ['about:', 'samo:', 'chrome:', 'devtools:'];

export function isInternalUrl(url: string): boolean {
  return INTERNAL_PREFIXES.some((p) => url.startsWith(p));
}

/** 地址栏输入 → 真正要加载的 URL：显式 scheme 直通，像主机名就补 https，否则走搜索 */
export function resolveInput(raw: string): string {
  const input = raw.trim();
  if (!input) return 'about:blank';
  if (SCHEME.test(input)) return input;
  if (HOST_LIKE.test(input)) {
    const insecure = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:|\/|$)/i.test(input);
    return `${insecure ? 'http' : 'https'}://${input}`;
  }
  return SEARCH_ENDPOINT + encodeURIComponent(input);
}

/** URL → 地址栏里给人看的短形式（去掉协议与尾斜杠） */
export function displayUrl(url: string): string {
  if (!url || url === 'about:blank' || isInternalUrl(url)) return '';
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return (u.host + u.pathname + u.search + u.hash).replace(/\/$/, '');
    }
    return url;
  } catch {
    return url;
  }
}
