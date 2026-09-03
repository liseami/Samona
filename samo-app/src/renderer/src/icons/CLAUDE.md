# icons/
> L2 | 父级: ../../CLAUDE.md

壳的全部图标来源。`pika/` 是从 Laper（src/shared/pika-icons）原样复制的 Pika 描边图标库（1200+，按 31 个分类目录组织，JSX 组件，API 为 size/color/className/ariaLabel，24 视口、2px 描边），不做手改，升级时整目录覆盖。`index.tsx` 是语义层：组件只认 `SidebarClose`、`Refresh`、`Close` 这类语义名，换图标只改这一处；所有图标经 `decorative()` 以 aria-hidden 渲染，按钮的可访问名只由文字或 aria-label 决定（Pika 默认的 role=img + "xxx icon" 会污染可访问名）。

## 成员清单
index.tsx: 语义命名表（SidebarClose/SidebarOpen/ArrowLeft/ArrowRight/Refresh/Close/Plus/Lock/Search/Window/Clock/Globe/Bot/Hand/Spinner/VolumeOn/VolumeMute/ChevronRight/Folder/FolderOpen/Eraser/Bug/Settings/Download）、IconProps 类型、decorative 包装。
pika/index.js: Pika 图标桶装导出（自动生成，勿手改）。
pika/<category>/Pi*Stroke.jsx: 各分类图标组件。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
