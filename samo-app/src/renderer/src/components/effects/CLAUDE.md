# components/effects/
> L2 | 父级: ../../../CLAUDE.md

GPU 效果层：给设计系统里少数「有魂」的表面（Samo AI 药丸）用的 WebGL 组件，与 components/ui 的原子组件并列。WebGL 不可用时空渲染降级，不可见时不绘制；不进 Tailwind 令牌体系，但服从 shared/motion 的禁回弹铁律之外的例外（shader 循环动画不入令牌）。

## 成员清单
PrismaticBurst.tsx: PrismaticBurst（memo）——Laper PrismaticBurst 的 TypeScript 移植：ogl Renderer/Program/Mesh/Triangle/Texture，渐变纹理由 colors 生成，performanceMode high（DPR 0.5、6 次循环）给按钮、normal 给全屏；鼠标平滑跟随、IntersectionObserver 可见性、ResizeObserver 重设分辨率。
prismatic-shaders.ts: vertexShader 与 fragmentShaderHigh/Normal（Ray Marching + layeredNoise + edgeFade + 渐变采样），原样搬运自 Laper。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
