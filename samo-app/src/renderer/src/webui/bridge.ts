/**
 * [INPUT]: 依赖 chrome://resources/js/cr.js 的 sendWithPromise/addWebUiListener/removeWebUiListener，@shared/ipc 的 SamoBridge/Command/Query/QueryResult/ShellEvent，@shared/model 的 BrowserSnapshot，@shared/chat 的 ChatSnapshot
 * [OUTPUT]: 对外提供 installWebUiBridge() 与 emitLocalEvent()：在 window 上装出与 preload 同一契约的 samo: SamoBridge——invoke/query/getState/getChat 走 sendWithPromise（浏览器进程的 SamoWebUIHandler 以 ResolveJavascriptCallback 回应），onState/onEvent/onChat 走 WebUI 监听（浏览器进程 FireWebUIListener 推送）
 * [POS]: WebUI 宿主（Chromium fork 里的 chrome://samo）版本的桥；与 preload/index.ts 互为兄弟：同一 SamoBridge 契约、不同运输层。壳代码永远只认 window.samo，不知道自己跑在 Electron 还是 Chromium 里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { addWebUiListener, removeWebUiListener, sendWithPromise } from 'chrome://resources/js/cr.js';
import type { Command, Query, QueryResult, SamoBridge, ShellEvent } from '@shared/ipc';
import type { BrowserSnapshot } from '@shared/model';
import type { ChatSnapshot } from '@shared/chat';

// 浏览器进程侧消息名（SamoWebUIHandler 注册同名回调）；push 事件名与之对称
export const WEBUI_MESSAGES = {
  invoke: 'samo.invoke',
  query: 'samo.query',
  getState: 'samo.getState',
  getChat: 'samo.getChat',
  state: 'samo.state',
  event: 'samo.event',
  chat: 'samo.chat',
} as const;

const localEventListeners = new Set<(event: ShellEvent) => void>();
const pendingLocal: ShellEvent[] = [];
/** 本地事件：弹层页由 URL 查询串得知意图后自行触发 openPalette / openUserMenu，与主进程推送走同一条 onEvent；
 *  监听者还没挂上（React 尚未 mount、或气泡未显示时 rAF 不跑）就先排队，首个 onEvent 注册时冲掉 */
export function emitLocalEvent(event: ShellEvent): void {
  if (localEventListeners.size === 0) {
    pendingLocal.push(event);
    return;
  }
  for (const l of localEventListeners) l(event);
}

function listen<T>(name: string, listener: (payload: T) => void): () => void {
  const handle = addWebUiListener(name, (payload: T) => listener(payload));
  return () => {
    removeWebUiListener(handle);
  };
}

export function installWebUiBridge(): SamoBridge {
  const bridge: SamoBridge = {
    platform: 'darwin',
    host: 'chromium',
    invoke: (command: Command) => sendWithPromise<void>(WEBUI_MESSAGES.invoke, command),
    query: <Q extends Query>(query: Q) => sendWithPromise<QueryResult<Q>>(WEBUI_MESSAGES.query, query),
    getState: () => sendWithPromise<BrowserSnapshot>(WEBUI_MESSAGES.getState),
    onState: (listener) => listen<BrowserSnapshot>(WEBUI_MESSAGES.state, listener),
    onEvent: (listener) => {
      localEventListeners.add(listener);
      // 排队的意图交给每一个新挂上的监听者（Palette 与 UserMenuOverlay 各自监听），mount 完成后再清空队列
      if (pendingLocal.length) {
        const queued = [...pendingLocal];
        queueMicrotask(() => queued.forEach((e) => listener(e)));
        setTimeout(() => pendingLocal.splice(0), 200);
      }
      const off = listen<ShellEvent>(WEBUI_MESSAGES.event, listener);
      return () => {
        localEventListeners.delete(listener);
        off();
      };
    },
    getChat: () => sendWithPromise<ChatSnapshot>(WEBUI_MESSAGES.getChat),
    onChat: (listener) => listen<ChatSnapshot>(WEBUI_MESSAGES.chat, listener),
  };
  (window as unknown as { samo: SamoBridge }).samo = bridge;
  return bridge;
}
