import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite + React + Tailwind v4（插件式，无 postcss 配置）
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
