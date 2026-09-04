/**
 * [INPUT]: 无
 * [OUTPUT]: 声明 chrome://resources/js/cr.js 模块（Chromium WebUI 的消息原语：sendWithPromise / addWebUiListener / removeWebUiListener），供 bridge.ts 类型检查
 * [POS]: webui 宿主的类型垫片；运行时由 Chromium 提供，构建时标为 external 不打包
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
declare module 'chrome://resources/js/cr.js' {
  export interface WebUiListener {
    eventName: string;
    uid: number;
  }
  export function sendWithPromise<T = unknown>(methodName: string, ...args: unknown[]): Promise<T>;
  export function addWebUiListener(eventName: string, callback: (...args: any[]) => void): WebUiListener;
  export function removeWebUiListener(listener: WebUiListener): boolean;
}
