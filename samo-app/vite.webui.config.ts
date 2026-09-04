/**
 * [INPUT]: 依赖 vite 的 defineConfig，@vitejs/plugin-react 与 @tailwindcss/vite 插件
 * [OUTPUT]: WebUI 宿主构建：把 renderer 的壳（webui.html）、新标签页（webui-newtab.html）、弹层（webui-overlay.html：命令面板 + 用户菜单）与对话（webui-chat.html）打成 chrome://samo/ 下的静态资源，输出到 ../samo-chromium/src/samo/webui/dist（就在挂进 Chromium 树的目录里，BUILD.gn 以 //samo/webui/dist 引用）（Chromium 侧用 generate_grd 收进资源包）；chrome://resources 的模块保持 external 由 Chromium 运行时提供
 * [POS]: samo-app 的第二份构建宪法，与 electron.vite.config.ts 并列：同一份 renderer 源码、两种宿主
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** 产物清单：GN 的 generate_grd 需要静态文件列表，Vite 写出 manifest.txt（相对 dist 的路径，一行一个）供 read_file 读取 */
function manifest(): Plugin {
  return {
    name: 'samo-webui-manifest',
    writeBundle(options, bundle) {
      const files = Object.keys(bundle).sort();
      writeFileSync(resolve(options.dir!, 'manifest.txt'), files.join('\n') + '\n');
    },
  };
}

export default defineConfig({
  root: resolve('src/renderer'),
  base: './', // 相对地址：同一份产物同时服务 chrome://samo（壳/新标签页）与 chrome://samo-overlay（弹层气泡），各自的数据源都能命中 assets/
  resolve: { alias: { '@': resolve('src/renderer/src'), '@shared': resolve('src/shared') } },
  plugins: [react(), tailwindcss(), manifest()],
  build: {
    outDir: resolve('../samo-chromium/src/samo/webui/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve('src/renderer/webui.html'),
        newtab: resolve('src/renderer/webui-newtab.html'),
        overlay: resolve('src/renderer/webui-overlay.html'),
        chat: resolve('src/renderer/webui-chat.html'),
        launcher: resolve('src/renderer/webui-launcher.html'),
      },
      external: (id) => id.startsWith('chrome://'),
      // 文件名不带哈希：资源名进 grd 后成为 IDR_ 常量，必须稳定
      output: { entryFileNames: 'assets/[name].js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name].[ext]' },
    },
  },
});
