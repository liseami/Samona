/**
 * [INPUT]: 依赖 @shared/ipc 的 SamoBridge 类型
 * [OUTPUT]: 全局声明 window.samo，供渲染层 TS 感知 preload 暴露的桥
 * [POS]: preload 的类型影子，随 index.ts 的暴露面同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { SamoBridge } from '@shared/ipc';

declare global {
  interface Window {
    samo: SamoBridge;
  }
}
export {};
