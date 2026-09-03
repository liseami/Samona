/**
 * [INPUT]: 依赖 electron 的 contextBridge/ipcRenderer，@shared/ipc 的 CHANNELS/SamoBridge/Command/Query/ShellEvent，@shared/model 的 BrowserSnapshot
 * [OUTPUT]: 在渲染层 window 上暴露 samo: SamoBridge（invoke/query/getState/onState/onEvent/getChat/onChat/platform）
 * [POS]: preload 的唯一成员，主进程与 React 壳之间的受控窄门；只转发，不含业务逻辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS, type Command, type Query, type QueryResult, type SamoBridge, type ShellEvent } from '@shared/ipc';
import type { BrowserSnapshot } from '@shared/model';
import type { ChatSnapshot } from '@shared/chat';

const bridge: SamoBridge = {
  platform: process.platform,
  invoke: (command: Command) => ipcRenderer.invoke(CHANNELS.invoke, command),
  query: <Q extends Query>(query: Q) => ipcRenderer.invoke(CHANNELS.query, query) as Promise<QueryResult<Q>>,
  getState: () => ipcRenderer.invoke(CHANNELS.getState) as Promise<BrowserSnapshot>,
  onState: (listener) => {
    const handler = (_e: Electron.IpcRendererEvent, snapshot: BrowserSnapshot) => listener(snapshot);
    ipcRenderer.on(CHANNELS.state, handler);
    return () => ipcRenderer.removeListener(CHANNELS.state, handler);
  },
  onEvent: (listener) => {
    const handler = (_e: Electron.IpcRendererEvent, event: ShellEvent) => listener(event);
    ipcRenderer.on(CHANNELS.event, handler);
    return () => ipcRenderer.removeListener(CHANNELS.event, handler);
  },
  getChat: () => ipcRenderer.invoke(CHANNELS.getChat) as Promise<ChatSnapshot>,
  onChat: (listener) => {
    const handler = (_e: Electron.IpcRendererEvent, snapshot: ChatSnapshot) => listener(snapshot);
    ipcRenderer.on(CHANNELS.chat, handler);
    return () => ipcRenderer.removeListener(CHANNELS.chat, handler);
  },
};

contextBridge.exposeInMainWorld('samo', bridge);
