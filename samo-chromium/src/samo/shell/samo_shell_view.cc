// [INPUT]: 依赖 ./samo_shell_view.h，samo/webui/samo_ui.h，chrome/grit/generated_resources.h（任务管理器里的名字，先借 IDS_TAB_SEARCH_TITLE，待 Samo 字符串表），url/gurl.h
// [OUTPUT]: SamoShellView 的实现：构造即创建 WebUIContentsWrapperT<SamoUI>（不自动调整宿主大小、Esc 不关闭、支持可拖拽区——壳头部的 -webkit-app-region: drag 就靠它）并 SetWebContents
// [POS]: samo/shell 的核心实现。可拖拽区先留 TODO：BrowserView 侧要把 regions 交给窗口（Chrome 的 PWA 窗口已有同样管线：BrowserView::DraggableRegionsChanged → frame）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/shell/samo_shell_view.h"

#include "chrome/browser/profiles/profile.h"
#include "chrome/grit/generated_resources.h"
#include "samo/webui/samo_ui.h"
#include "ui/base/metadata/metadata_impl_macros.h"
#include "url/gurl.h"

namespace samo {

SamoShellView::SamoShellView(Profile* profile) {
  contents_wrapper_ = std::make_unique<WebUIContentsWrapperT<SamoUI>>(
      GURL("chrome://samo/"), profile, IDS_TAB_SEARCH_TITLE,
      /*esc_closes_ui=*/false, /*supports_draggable_regions=*/true);
  contents_wrapper_->SetHost(weak_factory_.GetWeakPtr());
  SetWebContents(contents_wrapper_->web_contents());
  SetVisible(true);
}

SamoShellView::~SamoShellView() {
  SetWebContents(nullptr);
}

void SamoShellView::ShowUI() {
  SetVisible(true);
}

void SamoShellView::CloseUI() {
  // 壳永远在；Esc 已关闭，这里无事可做
}

void SamoShellView::DraggableRegionsChanged(
    const std::vector<blink::mojom::DraggableRegionPtr>& regions,
    content::WebContents* contents) {
  // TODO(samo): 交给 BrowserView/frame（同 PWA 窗口的 DraggableRegionsChanged 管线），让壳头部能拖动窗口
}

BEGIN_METADATA(SamoShellView)
END_METADATA

}  // namespace samo
