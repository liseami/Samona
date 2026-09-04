/**
 * [INPUT]: 依赖 ./bridge 的 installWebUiBridge
 * [OUTPUT]: 无导出；副作用——在任何壳代码求值之前把 window.samo 装好（各 WebUI 页入口先 import 本文件，再 import 页面 main）
 * [POS]: WebUI 宿主的启动前置；ES 模块按 import 顺序求值，所以它必须是入口的第一条 import
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { installWebUiBridge } from './bridge';

installWebUiBridge();
