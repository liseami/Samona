/**
 * [INPUT]: 依赖 ogl 的 Renderer/Program/Mesh/Triangle/Texture，react 的 useEffect/useRef/memo，./prismatic-shaders 的双版本 shader
 * [OUTPUT]: 对外提供 PrismaticBurst 组件（memo）：WebGL 彩色光线爆发——Laper PrismaticBurst 的 TypeScript 移植；WebGL 不可用时空渲染降级；IntersectionObserver 不可见时不绘制；鼠标位置平滑跟随
 * [POS]: components/effects 的 GPU 效果层；Samo AI 药丸（launcher）用 performanceMode='high'（DPR 0.5、6 次循环）把它压在渐变底之上、受光层之下
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { memo, useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { fragmentShaderHigh, fragmentShaderNormal, vertexShader } from './prismatic-shaders';

export interface PrismaticBurstProps {
  intensity?: number;
  speed?: number;
  animationType?: 'rotate' | 'rotate3d' | 'hover';
  colors?: string[];
  distort?: number;
  paused?: boolean;
  offset?: { x?: number; y?: number };
  hoverDampness?: number;
  rayCount?: number;
  mixBlendMode?: string;
  performanceMode?: 'normal' | 'high';
}

const WEBGL_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
};
const DEFAULT_OFFSET = Object.freeze({ x: 0, y: 0 });
const ANIM_TYPE = { rotate: 0, rotate3d: 1, hover: 2 } as const;

function hexToRgb01(hex: string): [number, number, number] {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const v = parseInt(h, 16);
  if (Number.isNaN(v) || (h.length !== 6 && h.length !== 8)) return [1, 1, 1];
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function createWebGLCanvas(): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  try {
    const gl = canvas.getContext('webgl2', WEBGL_CONTEXT_ATTRIBUTES) || canvas.getContext('webgl', WEBGL_CONTEXT_ATTRIBUTES);
    return gl ? canvas : null;
  } catch {
    return null;
  }
}

export const PrismaticBurst = memo(function PrismaticBurst({
  intensity = 2,
  speed = 0.5,
  animationType = 'rotate3d',
  colors,
  distort = 0,
  paused = false,
  offset = DEFAULT_OFFSET,
  hoverDampness = 0,
  rayCount,
  mixBlendMode = 'lighten',
  performanceMode = 'normal',
}: PrismaticBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const gradTexRef = useRef<Texture | null>(null);
  const mouseTargetRef = useRef<[number, number]>([0.5, 0.5]);
  const mouseSmoothRef = useRef<[number, number]>([0.5, 0.5]);
  const pausedRef = useRef(paused);
  const hoverDampRef = useRef(hoverDampness);
  const visibleRef = useRef(true);
  const offsetX = offset?.x ?? 0;
  const offsetY = offset?.y ?? 0;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    hoverDampRef.current = hoverDampness;
  }, [hoverDampness]);

  // ---- WebGL 初始化：只随 performanceMode 重建 ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = createWebGLCanvas();
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer({ canvas, dpr: performanceMode === 'high' ? 0.5 : 1, alpha: true, antialias: false });
    } catch {
      return;
    }
    rendererRef.current = renderer;
    const gl = renderer.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    Object.assign(gl.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', mixBlendMode: mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '' });
    container.appendChild(gl.canvas);

    const gradientTex = new Texture(gl, { image: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1, generateMipmaps: false, flipY: false });
    gradientTex.minFilter = gl.LINEAR;
    gradientTex.magFilter = gl.LINEAR;
    gradientTex.wrapS = gl.CLAMP_TO_EDGE;
    gradientTex.wrapT = gl.CLAMP_TO_EDGE;
    gradTexRef.current = gradientTex;

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: performanceMode === 'high' ? fragmentShaderHigh : fragmentShaderNormal,
      uniforms: {
        uResolution: { value: [1, 1] },
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uSpeed: { value: 1 },
        uAnimType: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uColorCount: { value: 0 },
        uDistort: { value: 0 },
        uOffset: { value: [0, 0] },
        uGradient: { value: gradientTex },
        uNoiseAmount: { value: 0.8 },
        uRayCount: { value: 0 },
      },
    });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const onPointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      mouseTargetRef.current = [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
    };
    container.addEventListener('pointermove', onPointer, { passive: true });
    const io = new IntersectionObserver((entries) => {
      if (entries[0]) visibleRef.current = entries[0].isIntersecting;
    }, { threshold: 0.01 });
    io.observe(container);

    let raf = 0;
    let last = performance.now();
    let accum = 0;
    const update = (now: number) => {
      const dt = Math.max(0, now - last) * 0.001;
      last = now;
      if (!pausedRef.current) accum += dt;
      if (visibleRef.current && !document.hidden) {
        const tau = 0.02 + Math.max(0, Math.min(1, hoverDampRef.current)) * 0.5;
        const alpha = 1 - Math.exp(-dt / tau);
        const tgt = mouseTargetRef.current;
        const sm = mouseSmoothRef.current;
        sm[0] += (tgt[0] - sm[0]) * alpha;
        sm[1] += (tgt[1] - sm[1]) * alpha;
        program.uniforms.uMouse.value = sm;
        program.uniforms.uTime.value = accum;
        renderer.render({ scene: mesh });
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      io.disconnect();
      try {
        container.removeChild(gl.canvas);
      } catch {
        /* 已移除 */
      }
      try {
        if (gradientTex.texture) gl.deleteTexture(gradientTex.texture);
      } catch {
        /* 上下文已丢失 */
      }
      programRef.current = null;
      rendererRef.current = null;
      gradTexRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceMode]);

  useEffect(() => {
    const canvas = rendererRef.current?.gl?.canvas;
    if (canvas) canvas.style.mixBlendMode = mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '';
  }, [mixBlendMode]);

  // ---- uniforms：随 props 更新，不重建上下文 ----
  useEffect(() => {
    const program = programRef.current;
    const renderer = rendererRef.current;
    const gradTex = gradTexRef.current;
    if (!program || !renderer || !gradTex) return;
    program.uniforms.uIntensity.value = intensity;
    program.uniforms.uSpeed.value = speed;
    program.uniforms.uAnimType.value = ANIM_TYPE[animationType] ?? 0;
    program.uniforms.uDistort.value = distort;
    program.uniforms.uOffset.value = [offsetX, offsetY];
    program.uniforms.uRayCount.value = Math.max(0, Math.floor(rayCount ?? 0));
    let count = 0;
    if (Array.isArray(colors) && colors.length > 0) {
      const gl = renderer.gl;
      const capped = colors.slice(0, 64);
      count = capped.length;
      const data = new Uint8Array(count * 4);
      capped.forEach((c, i) => {
        const [r, g, b] = hexToRgb01(c);
        data.set([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255], i * 4);
      });
      gradTex.image = data;
      gradTex.width = count;
      gradTex.height = 1;
      gradTex.format = gl.RGBA;
      gradTex.type = gl.UNSIGNED_BYTE;
      gradTex.needsUpdate = true;
    }
    program.uniforms.uColorCount.value = count;
  }, [intensity, speed, animationType, colors, distort, offsetX, offsetY, rayCount]);

  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" />;
});
