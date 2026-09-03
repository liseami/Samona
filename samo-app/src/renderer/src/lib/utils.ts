/**
 * [INPUT]: 依赖 clsx 与 tailwind-merge
 * [OUTPUT]: 对外提供 cn(...)：条件类名合并并去重冲突（shadcn 约定）
 * [POS]: renderer/lib 的通用工具，所有组件的 className 拼接统一走这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
