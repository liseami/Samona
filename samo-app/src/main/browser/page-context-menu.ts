/**
 * [INPUT]: 依赖 electron 的 Menu/clipboard/nativeImage/WebContents/ContextMenuParams
 * [OUTPUT]: 对外提供 showPageContextMenu(wc, params, host)：网页里的原生右键菜单——链接（新标签打开 / 后台打开 / 复制链接）、图片（新标签打开 / 复制图片 / 复制图片地址 / 存储图片）、选中文字（复制 / 用 Samo 搜索）、可编辑区（拼写建议 / 剪切 复制 粘贴 全选）、页面（后退 前进 重载 / 打印 / 检查元素）
 * [POS]: browser 模块的「浏览器体验」层之一：Electron 不给网页任何右键菜单，这里补上 Chromium 用户习惯的那一份；phi 的原生 Chromium 壳自带，Samo 在 Electron 上自绘
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Menu, clipboard, type ContextMenuParams, type MenuItemConstructorOptions, type WebContents } from 'electron';

export interface PageMenuHost {
  openUrl(url: string, background: boolean): void; // 同工作区新标签
  search(query: string): void; // 用默认搜索开新标签
  saveImage(url: string): void; // 走下载
}

export function showPageContextMenu(wc: WebContents, params: ContextMenuParams, host: PageMenuHost): void {
  const items: MenuItemConstructorOptions[] = [];
  const sep = () => items.length && items[items.length - 1].type !== 'separator' && items.push({ type: 'separator' });
  const selection = params.selectionText.trim();

  if (params.linkURL) {
    items.push(
      { label: 'Open Link in New Tab', click: () => host.openUrl(params.linkURL, false) },
      { label: 'Open Link in Background', click: () => host.openUrl(params.linkURL, true) },
      { label: 'Copy Link', click: () => clipboard.writeText(params.linkURL) },
    );
  }
  if (params.mediaType === 'image' && params.srcURL) {
    sep();
    items.push(
      { label: 'Open Image in New Tab', click: () => host.openUrl(params.srcURL, false) },
      { label: 'Copy Image', click: () => wc.copyImageAt(params.x, params.y) },
      { label: 'Copy Image Address', click: () => clipboard.writeText(params.srcURL) },
      { label: 'Save Image…', click: () => host.saveImage(params.srcURL) },
    );
  }
  if (params.mediaType === 'video' || params.mediaType === 'audio') {
    sep();
    items.push({ label: 'Copy Media Address', click: () => clipboard.writeText(params.srcURL) });
  }
  if (params.isEditable) {
    sep();
    if (params.misspelledWord) {
      for (const s of params.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) });
      items.push({ label: 'Add to Dictionary', click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord) }, { type: 'separator' });
    }
    items.push(
      { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
      { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
      { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
      { label: 'Select All', role: 'selectAll' },
    );
  } else if (selection) {
    sep();
    const short = selection.length > 32 ? `${selection.slice(0, 32)}…` : selection;
    items.push({ label: 'Copy', role: 'copy' }, { label: `Search for “${short}”`, click: () => host.search(selection) });
  }
  if (!params.linkURL && !params.isEditable && !selection && params.mediaType === 'none') {
    items.push(
      { label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
      { label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
      { label: 'Reload', click: () => wc.reload() },
      { type: 'separator' },
      { label: 'Print…', click: () => wc.print() },
    );
  }
  sep();
  items.push({ label: 'Inspect Element', click: () => wc.inspectElement(params.x, params.y) });
  Menu.buildFromTemplate(items).popup();
}
