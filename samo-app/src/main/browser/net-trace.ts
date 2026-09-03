/**
 * [INPUT]: 依赖 electron 的 Session/WebContents（webRequest 与框架级导航事件）
 * [OUTPUT]: 对外提供 NET_TRACE 开关、installNetTrace(ses)、traceFrames(wc)
 * [POS]: browser 模块的开发态诊断：SAMO_TRACE_NET=1 时把主框架/子框架的请求错误、重定向、
 *        响应状态与提交结果打到主进程日志，专治「网页某块空白但没有任何报错」——生产态零开销
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Session, WebContents } from 'electron';

export const NET_TRACE = process.env.SAMO_TRACE_NET === '1';
const short = (url: string) => url.slice(0, 140);
const FRAMES = new Set(['mainFrame', 'subFrame']);
const XHRISH = new Set(['xhr', 'fetch', 'ping', 'cspReport', 'webSocket']);

export function installNetTrace(ses: Session): void {
  if (!NET_TRACE) return;
  const filter = { urls: ['<all_urls>'] };
  ses.webRequest.onBeforeRedirect(filter, (d) => {
    if (FRAMES.has(d.resourceType)) console.log(`[net] redirect ${d.resourceType} ${d.statusCode} ${short(d.url)} → ${short(d.redirectURL)}`);
  });
  ses.webRequest.onHeadersReceived(filter, (d, cb) => {
    if (FRAMES.has(d.resourceType)) {
      const h = d.responseHeaders ?? {};
      const pick = (k: string) => Object.entries(h).find(([n]) => n.toLowerCase() === k)?.[1]?.join(' ');
      console.log(
        `[net] headers ${d.resourceType} ${d.statusCode} ${short(d.url)} type=${pick('content-type')} xfo=${pick('x-frame-options')} csp=${pick('content-security-policy')?.slice(0, 160)} disp=${pick('content-disposition')}`,
      );
    }
    cb({});
  });
  ses.webRequest.onErrorOccurred(filter, (d) => {
    if (FRAMES.has(d.resourceType) || XHRISH.has(d.resourceType)) console.log(`[net] error ${d.resourceType} ${d.error} ${short(d.url)}`);
  });
  ses.webRequest.onCompleted(filter, (d) => {
    if (XHRISH.has(d.resourceType) && (d.statusCode >= 400 || d.statusCode === 0)) console.log(`[net] xhr ${d.statusCode} ${short(d.url)}`);
  });
}

export function traceFrames(wc: WebContents): void {
  if (!NET_TRACE) return;
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => console.log(`[frame] fail main=${isMainFrame} ${code} ${desc} ${short(url)}`));
  wc.on('did-frame-navigate', (_e, url, code, text, isMainFrame) => console.log(`[frame] navigate main=${isMainFrame} ${code} ${text} ${short(url)}`));
  wc.on('will-frame-navigate', (d) => console.log(`[frame] will main=${d.isMainFrame} ${short(d.url)}`));
  wc.on('console-message', (d) => {
    if (d.level === 'error' || d.level === 'warning') console.log(`[console] ${d.level} ${d.message.slice(0, 200)} @${short(d.sourceId ?? '')}`);
  });
}
