# components/
> L2 | 父级: ../../CLAUDE.md

纯展示层，两个组件各自独立、互不依赖，由 App 编排合成为「背景 + 前景」两层。

## 成员清单
Ferrofluid.tsx: WebGL 铁磁流体背景。用 OGL 在全屏三角面上跑片元着色器，值噪声(vn)叠加成峰(dbn)、以 smin 平滑融合模拟流体表面，沿 flowDirection 缓流。参数化 scale/speed/turbulence/glow 等；App 传入 scale=3 speed=0.1 得「慢而大、如熔银缓流」。自管 RAF 循环与 ResizeObserver，卸载时销毁 GL 资源。
ShinyText.tsx: 高光扫过的渐变文本。用 motion 的 useAnimationFrame 驱动一个 0→100 的 progress，映射为 linear-gradient 的 background-position，配合 background-clip:text 让一道亮带沿文字滑过。支持 yoyo/direction/pauseOnHover/delay。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
