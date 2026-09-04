/**
 * [INPUT]: 依赖 ./boot（先装桥），../main（壳的启动引导）
 * [OUTPUT]: 无导出；chrome://samo 壳页的入口——装桥后复用 Electron 同一份 main.tsx
 * [POS]: WebUI 宿主的壳入口，与 renderer/index.html → main.tsx 一一对应
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import '../main';
