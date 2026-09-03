/**
 * [INPUT]: 无运行时依赖，纯常量与纯函数
 * [OUTPUT]: 对外提供 DUR 时长阶梯（ms）、EASE 贝塞尔曲线族、EASE_CSS 同源 CSS 字符串、bezier() 求值器（主进程窗口编舞用）、lerpRect()
 * [POS]: 全应用动画参数的唯一真相源（Laper shared/ui/motion 的 Samo 版）：渲染层 CSS 在 styles.css 的 @theme 里镜像同名令牌，主进程的窗口几何动画直接 import。禁回弹铁律：所有曲线控制点 y ≤ 1，终点零过冲、结尾慢而有阻尼
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** 时长阶梯（毫秒）——只取档不手写 */
export const DUR = {
  xfast: 120, // 瞬时反馈：按压高亮
  fast: 150, // 菜单 / 工具条 / 标准退场
  quick: 200, // 淡入淡出 / 常规 enter
  base: 240, // 内容着陆：列表项 / 卡片小位移
  gentle: 320, // 从容展开：模态 / 抽屉 / 大面板 / 窗口变形
  slow: 420, // 缓慢强调：长位移
} as const;

export type EaseBezier = readonly [number, number, number, number];

/** 缓动曲线族——快起 · 稳中 · 果断趋近 · 柔和收尾；全部 y ≤ 1 零过冲 */
export const EASE = {
  settle: [0.22, 0.8, 0.36, 1] as EaseBezier, // 气泡 / 卡片着陆（主力曲线）
  drawer: [0.32, 0.72, 0, 1] as EaseBezier, // 模态 / 抽屉 / 面板开合（iOS 曲线）
  entrance: [0.2, 0.7, 0.2, 1] as EaseBezier, // 大区块入场
  glide: [0.16, 1, 0.3, 1] as EaseBezier, // expo-out：长尾滑入
  snap: [0.2, 0, 0, 1] as EaseBezier, // 硬而灵敏：NavRail 展开
  standard: [0.4, 0, 0.2, 1] as EaseBezier, // 对称标准：scale+opacity 开合
  exitHard: [0.4, 0, 1, 1] as EaseBezier, // 加速离场
} as const;

const toCss = (c: EaseBezier) => `cubic-bezier(${c.join(', ')})`;
export const EASE_CSS = {
  settle: toCss(EASE.settle),
  drawer: toCss(EASE.drawer),
  entrance: toCss(EASE.entrance),
  glide: toCss(EASE.glide),
  snap: toCss(EASE.snap),
  standard: toCss(EASE.standard),
  exitHard: toCss(EASE.exitHard),
} as const;

/** 把四点贝塞尔变成 t → 进度 的函数（牛顿迭代 + 二分兜底），主进程用它驱动窗口几何 */
export function bezier([x1, y1, x2, y2]: EaseBezier): (t: number) => number {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    if (t < 0 || t > 1 || Math.abs(calc(t, x1, x2) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (calc(t, x1, x2) < x) lo = t;
        else hi = t;
      }
    }
    return t;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : calc(solveX(t), y1, y2));
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function lerpRect(a: Rect, b: Rect, k: number): Rect {
  return {
    x: Math.round(a.x + (b.x - a.x) * k),
    y: Math.round(a.y + (b.y - a.y) * k),
    width: Math.round(a.width + (b.width - a.width) * k),
    height: Math.round(a.height + (b.height - a.height) * k),
  };
}
