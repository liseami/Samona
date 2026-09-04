/**
 * [INPUT]: 依赖 ./boot（先装桥），../chat/main（chat 页的启动引导）
 * [OUTPUT]: 无导出；chrome://samo/webui-chat.html 的入口（WebUI 气泡里承载）
 * [POS]: WebUI 宿主的 chat 页入口，与 renderer/chat.html 一一对应
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import '../chat/main';
