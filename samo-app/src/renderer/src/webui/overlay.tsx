/**
 * [INPUT]: 依赖 ./boot（先装桥），../overlay/main（overlay 页的启动引导）
 * [OUTPUT]: 无导出；chrome://samo/webui-overlay.html 的入口（WebUI 气泡里承载）
 * [POS]: WebUI 宿主的 overlay 页入口，与 renderer/overlay.html 一一对应
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import '../overlay/main';
