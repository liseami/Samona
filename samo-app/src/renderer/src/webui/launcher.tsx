/**
 * [INPUT]: 依赖 ./boot（先装桥），../launcher/main（右下角 Samo AI 药丸页的启动引导）
 * [OUTPUT]: 无导出；chrome://samo-launcher 的入口（浮在网页之上的透明子 widget 里承载，与 Electron 的 LauncherWindow 对应）
 * [POS]: WebUI 宿主的药丸页入口，与 renderer/launcher.html 一一对应
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import '../launcher/main';
