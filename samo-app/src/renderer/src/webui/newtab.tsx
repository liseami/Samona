/**
 * [INPUT]: 依赖 ./boot（先装桥），../newtab/main（新标签页的启动引导）
 * [OUTPUT]: 无导出；chrome://samo/newtab.html 的入口
 * [POS]: WebUI 宿主的新标签页入口，与 renderer/newtab.html 一一对应
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import '../newtab/main';
