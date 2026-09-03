/**
 * [INPUT]: 依赖 react-dom/client 的 createRoot，依赖 ./App 的根组件，依赖 ./index.css 的全局样式
 * [OUTPUT]: 无导出，仅将 <App/> 挂载到 #root
 * [POS]: src 的启动引导，Vite module 入口的落点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
