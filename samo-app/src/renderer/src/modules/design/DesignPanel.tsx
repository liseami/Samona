/**
 * [INPUT]: 依赖 react，./store 的 useDesignNav/SECTIONS，./Showcase 的各章节组件
 * [OUTPUT]: 对外提供 DesignPanel 组件：Kumo 文档站形态的组件陈列页——页头（text-4xl 标题 + text-lg 描述 + hairline）+ max-w-6xl 内容列 + 逐章节的示例（预览面 + 代码块）与 API 表；侧栏点击滚动到章节，滚动时回写当前章节
 * [POS]: modules/design 的面板；只在开发环境的 Design 模块出现
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef } from 'react';
import { SECTIONS, useDesignNav } from './store';
import { ButtonsShowcase, ColorsShowcase, IconsShowcase, InputsShowcase, KeycapsShowcase, OverlaysShowcase, SidebarButtonShowcase, SurfacesShowcase, TypographyShowcase } from './Showcase';

const RENDERERS = {
  buttons: ButtonsShowcase,
  'sidebar-button': SidebarButtonShowcase,
  inputs: InputsShowcase,
  overlays: OverlaysShowcase,
  keycaps: KeycapsShowcase,
  surfaces: SurfacesShowcase,
  colors: ColorsShowcase,
  typography: TypographyShowcase,
  icons: IconsShowcase,
} as const;

export function DesignPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  const jumpTo = useDesignNav((s) => s.section);
  const nonce = useDesignNav((s) => s.nonce);
  const setSection = useDesignNav((s) => s.setSection);

  // ---- 侧栏点击 → 滚到章节 ----
  useEffect(() => {
    if (!nonce) return;
    document.getElementById(`design-${jumpTo}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [jumpTo, nonce]);

  // ---- 滚动 → 回写当前章节 ----
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setSection(top.target.id.replace('design-', '') as (typeof SECTIONS)[number]['id']);
      },
      { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );
    root.querySelectorAll('section[id^="design-"]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [setSection]);

  return (
    <div ref={scroller} className="no-drag h-full w-full overflow-y-auto" style={{ letterSpacing: '-0.01em' }}>
      {/* ---- Kumo DocLayout：页头带 hairline，内容 max-w-6xl p-12 ---- */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-12 py-12">
          <div className="mb-3 flex items-center gap-3">
            <h1 className="text-4xl font-semibold text-foreground">Components</h1>
            <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">dev only</span>
          </div>
          <p className="text-lg leading-normal text-foreground/80">
            Every primitive the shell is built from, rendered live. Colors are the oklch token set; shadows, radii, density and the lit button recipe come from Laper and Kumo. If it is not on this page, it does not exist.
          </p>
        </div>
      </div>
      <div className="isolate mx-auto max-w-6xl px-12 py-12 pb-28">
        {SECTIONS.map((s) => {
          const Renderer = RENDERERS[s.id];
          return (
            <section key={s.id} id={`design-${s.id}`} className="mb-16 scroll-mt-6">
              <Renderer />
            </section>
          );
        })}
      </div>
    </div>
  );
}
