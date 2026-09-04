# patches/
> L2 | 父级: ../CLAUDE.md

Samo 对上游 Chromium 的补丁，`git format-patch` 格式，按文件名序号顺序应用（scripts/apply-patches.sh）。纪律（Brave）：能放独立文件就不改上游文件；每个补丁只做一件事、有可读的 Subject；rebase 时冲突集中在这里。格式是统一 diff（a/ b/ 前缀），由真实上游文件生成。0001 注册 chrome://samo（chrome_web_ui_configs.cc 两行）；0002 //chrome/browser/ui 依赖 //samo:webui；0003 resources.pak 合入 samo_resources.pak（chrome_paks.gni）；0004 tools/gritsettings/resource_ids.spec 登记 samo/resources.grd 的资源 ID 段（grit 要求每个 grd 都有起始 ID，否则 AssignFirstIds KeyError）。0005 WebUIName 白名单加 .Samo（histograms.xml → 生成的 views_metrics 允许列表，Views 装载 WebUI 的 static_assert）；0006 //chrome/browser/ui 编入 samo/shell/samo_shell_view；0007 BrowserView 加 SamoShellView（索引 0 铺满整窗、隐藏 top_container_、布局末尾按 samo_content_bounds_ 摆放 contents_container_、SetSamoContentBounds）。0008 BrowserView：壳的可拖拽区进命中测试（HTCAPTION，同 PWA 的 window-controls-overlay 逻辑）+ 网页容器裁圆角（ContentsContainerView::SetRoundedCorners 13）。后续：品牌、新标签页、弹层气泡。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
