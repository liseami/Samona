/**
 * [INPUT]: 依赖 electron-vite 的 defineConfig/externalizeDepsPlugin，@vitejs/plugin-react 与 @tailwindcss/vite 插件
 * [OUTPUT]: 对外提供 main/preload/renderer 三段构建配置（renderer 为双页：index 壳 + newtab 新标签页）
 * [POS]: samo-app 的构建宪法，决定三个进程各自的入口、别名与产物位置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const shared = { '@shared': resolve('src/shared') };

export default defineConfig({
  // ============ 主进程：Node 侧，依赖外置（ws 等由 electron-builder 打包） ============
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: shared },
  },
  // ============ 预加载：contextBridge 暴露 window.samo；沙盒渲染器只认 CJS，故强制 .js/cjs ============
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: shared },
    build: { rollupOptions: { external: ['electron'], output: { format: 'cjs', entryFileNames: '[name].js' } } },
  },
  // ============ 渲染进程：React 壳 + 新标签页，两页共用一套 Tailwind ============
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src'), ...shared } },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          newtab: resolve('src/renderer/newtab.html'),
        },
      },
    },
  },
});
