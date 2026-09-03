/**
 * [INPUT]: 依赖 react
 * [OUTPUT]: 对外提供 PlaceholderSidebar / PlaceholderPanel：未上线模块的侧栏骨架与面板空态（Laper Placeholder 形态：居中、muted 标题与说明）
 * [POS]: modules/placeholder——邮件/知识库/网盘在有真实实现前共用的占位
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export function PlaceholderSidebar({ label }: { label: string }) {
  return (
    <div data-panel="sidebar" className="flex h-full min-w-0 flex-1 flex-col px-2 pt-1">
      <div className="px-2 pt-3.5 pb-3 text-base font-normal text-foreground">{label}</div>
      <div className="flex flex-col gap-1">
        {[72, 56, 64, 48].map((w, i) => (
          <div key={i} className="flex h-8 items-center gap-2 rounded-lg pl-2">
            <span className="h-4 w-4 rounded-[3px] bg-sidebar-accent/70" />
            <span className="h-2.5 rounded-full bg-sidebar-accent/70" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlaceholderPanel({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div className="flex h-full min-h-52 w-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-2 text-center text-base font-medium text-muted-foreground">{label}</div>
      <div className="max-w-80 text-center text-sm leading-relaxed text-muted-foreground">{blurb}</div>
    </div>
  );
}
