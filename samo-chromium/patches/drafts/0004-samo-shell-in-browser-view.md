# 草案 0004：壳铺满整窗（首次构建通过、chrome://samo 在标签里跑通之后再成为真补丁）
> 父级: ../README.md

前置：`webui/samo_ui.*` 改成 top-chrome 形态——`SamoUI : TopChromeWebUIController(web_ui, /*enable_chrome_send=*/true)` + `static constexpr std::string_view GetWebUIName() { return "Samo"; }`；`SamoUIConfig : DefaultTopChromeWebUIConfig<SamoUI>`（`ShouldAutoResizeHost()=false`，`IsPreloadable()=false`）；BUILD.gn 加依赖 `//chrome/browser/ui/webui/top_chrome:top_chrome`。

上游改动（行号对应 152.0.7977.83）：
1. `chrome/browser/ui/BUILD.gn`：`sources += [ "//samo/shell/samo_shell_view.cc", "//samo/shell/samo_shell_view.h" ]`（SamoShellView 依赖 views/BrowserView，必须编进 //chrome/browser/ui，不能反向依赖）。
2. `chrome/browser/ui/views/frame/browser_view.h`：成员 `raw_ptr<samo::SamoShellView> samo_shell_view_ = nullptr;` 与 `gfx::Rect samo_content_bounds_;` + `void SetSamoContentBounds(const gfx::Rect&)`。
3. `browser_view.cc` `InitViews()`，在 `contents_container_ = AddChildView(std::move(contents_container));`（~947 行）之后：
   `samo_shell_view_ = AddChildViewAt(std::make_unique<samo::SamoShellView>(GetProfile()), 0);`（索引 0：壳画在最底，网页容器在其上）`top_container_->SetVisible(false);`
4. `browser_view.cc` `Layout(PassKey)`（~4763 行）末尾：`if (samo_shell_view_) { samo_shell_view_->SetBoundsRect(GetLocalBounds()); contents_container_->SetBoundsRect(samo_content_bounds_); }`；圆角走 `multi_contents_view_->SetRoundedCorners(...)`（frame/multi_contents_view.cc ~228）。
5. 壳侧：面板卡里的网页占位元素用 ResizeObserver 量矩形 → `window.samo.invoke({type:'layout.contentBounds', rect})` → SamoUIHandler → BrowserView::SetSamoContentBounds → InvalidateLayout。
6. 可拖拽区：SamoShellView::DraggableRegionsChanged → BrowserView（PWA 窗口已有 `DraggableRegionsChanged` 管线）。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
