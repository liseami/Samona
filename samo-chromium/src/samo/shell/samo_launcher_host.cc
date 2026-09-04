// [INPUT]: 依赖 ./samo_launcher_host.h，content::WebContents/RenderWidgetHostView（透明背景），chrome/grit/generated_resources.h，url/gurl.h
// [OUTPUT]: SamoLauncherHost 的实现：CLIENT_OWNS_WIDGET + TYPE_CONTROL + kTranslucent + Activatable::kNo 的子 widget，contents 是装了 WebUIContentsWrapperT<SamoLauncherUI> 的 WebView；页面就绪（ShowUI）后把渲染背景设为透明并 ShowInactive
// [POS]: samo/shell 的药丸宿主实现
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/shell/samo_launcher_host.h"

#include <utility>

#include "chrome/browser/profiles/profile.h"
#include "chrome/grit/generated_resources.h"
#include "content/public/browser/render_widget_host_view.h"
#include "content/public/browser/web_contents.h"
#include "third_party/skia/include/core/SkColor.h"
#include "url/gurl.h"

namespace samo {

SamoLauncherHost::SamoLauncherHost(Profile* profile, views::Widget* parent) {
  contents_wrapper_ = std::make_unique<WebUIContentsWrapperT<SamoLauncherUI>>(
      GURL("chrome://samo-launcher/"), profile, IDS_TASK_MANAGER_OMNIBOX,
      /*esc_closes_ui=*/false, /*supports_draggable_regions=*/false);
  contents_wrapper_->SetHost(weak_factory_.GetWeakPtr());

  widget_ = std::make_unique<views::Widget>();
  views::Widget::InitParams params(views::Widget::InitParams::CLIENT_OWNS_WIDGET, views::Widget::InitParams::TYPE_CONTROL);
  params.name = "SamoLauncher";
  params.parent = parent->GetNativeView();
  params.opacity = views::Widget::InitParams::WindowOpacity::kTranslucent;
  params.activatable = views::Widget::InitParams::Activatable::kNo;
  params.shadow_type = views::Widget::InitParams::ShadowType::kNone;
  widget_->Init(std::move(params));
  auto web_view = std::make_unique<views::WebView>(profile);
  web_view->SetWebContents(contents_wrapper_->web_contents());
  web_view_ = widget_->SetContentsView(std::move(web_view));
  // 药丸页不会主动调 embedder()->ShowUI()（那是 Chrome 自家 top-chrome 页的约定）：这里直接就绪
  ready_ = true;
  widget_->ShowInactive();
}

SamoLauncherHost::~SamoLauncherHost() {
  if (web_view_)
    web_view_->SetWebContents(nullptr);
  web_view_ = nullptr;
  widget_.reset();
}

void SamoLauncherHost::Layout(const gfx::Rect& anchor) {
  if (!widget_)
    return;
  widget_->SetBounds(gfx::Rect(anchor.right() - kMargin - kWidth, anchor.bottom() - kMargin - kHeight, kWidth, kHeight));
  // 渲染背景透明（药丸页自己是透明底）；RWHV 在首次导航后才有，重排时补设一次即可
  if (auto* rwhv = contents_wrapper_->web_contents()->GetRenderWidgetHostView())
    rwhv->SetBackgroundColor(SK_ColorTRANSPARENT);
}

void SamoLauncherHost::SetShown(bool shown) {
  shown_ = shown;
  if (!widget_ || !ready_)
    return;
  if (shown) {
    widget_->ShowInactive();
    widget_->StackAtTop();
  } else {
    widget_->Hide();
  }
}

void SamoLauncherHost::ShowUI() {
  SetShown(shown_);
}

void SamoLauncherHost::CloseUI() {}

}  // namespace samo
