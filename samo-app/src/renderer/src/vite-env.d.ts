/**
 * [INPUT]: 依赖 vite/client 的类型声明
 * [OUTPUT]: 让渲染层 TS 认识 import 静态资源（png 等）与 import.meta.env
 * [POS]: renderer 的环境类型影子
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
/// <reference types="vite/client" />
