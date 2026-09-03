# samo-web/
> L2 | 父级: ../CLAUDE.md

Samo 的落地页——「人类唯一需要的 AI 应用」。独立的 Vite 站点，与 samo-app 无代码依赖，只共享一个品牌。

Bun + Vite + React 18 + TypeScript + Tailwind CSS v4 · WebGL(OGL) 背景 · Motion 文字动效 · Cloudflare Pages 托管

<directory>
src/ - 全部前端源码 (2 子目录: components 组件层, i18n 语言数据)
</directory>

<config>
index.html - Vite 入口模板，挂载点 #root
vite.config.ts - Vite 配置：@vitejs/plugin-react + @tailwindcss/vite 插件式集成
tsconfig.json - TS 严格模式，bundler 解析，react-jsx
package.json - 依赖清单与脚本 (dev/build/preview)，bun 管理
</config>

<deploy>
Cloudflare Pages：构建命令 `bun run build`，输出目录 `dist`，Node 18+
</deploy>

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
