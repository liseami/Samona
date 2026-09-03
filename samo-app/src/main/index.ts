/**
 * [INPUT]: 依赖 electron 的 app/nativeImage/nativeTheme，node:fs/path，./browser/{store,engine,persistence,history,downloads}，./shell/window，./ipc/handlers，./menu，./menus/context-menu，./agent/gateway
 * [OUTPUT]: 无导出；主进程引导——装配 store→window→engine→ipc/menu→gateway，并处理生命周期（恢复/落盘/退出）、系统外观跟随与开发态 Dock 图标
 * [POS]: samo-app 主进程的根，唯一知道所有模块如何拼在一起的地方；各模块彼此通过构造注入相识，不互相 import 单例
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, nativeImage, nativeTheme } from 'electron';
import { BrowserStore } from './browser/store';
import { BrowserEngine } from './browser/engine';
import { createSaver, loadState } from './browser/persistence';
import { HistoryStore } from './browser/history';
import { DownloadManager } from './browser/downloads';
import { ShellWindow } from './shell/window';
import { registerIpc } from './ipc/handlers';
import { installMenu } from './menu';
import { ContextMenus } from './menus/context-menu';
import { AgentGateway } from './agent/gateway';

app.setName('Samo');
const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL;

// ============ 渲染资源定位：dev 走 Vite 服务（HMR），prod 走打包产物 ============
function rendererUrl(page: 'index' | 'newtab' | 'overlay'): string {
  if (isDev) return `${process.env.ELECTRON_RENDERER_URL}/${page}.html`;
  return pathToFileURL(join(__dirname, `../renderer/${page}.html`)).href;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  const userData = app.getPath('userData');

  // ---- 开发态 Dock 图标：打包后由 electron-builder 的 build/icon.png 生成 icns，这里只管未打包时不显示 Electron 默认图标 ----
  if (!app.isPackaged && process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(join(app.getAppPath(), 'build', 'icon.png'));
    if (!icon.isEmpty()) app.dock?.setIcon(icon);
  }

  const store = new BrowserStore();
  store.setDark(nativeTheme.shouldUseDarkColors);
  nativeTheme.on('updated', () => store.setDark(nativeTheme.shouldUseDarkColors));

  const history = new HistoryStore(join(userData, 'history.json'));
  await history.load();

  const window = new ShellWindow({ preloadPath: join(__dirname, '../preload/index.js'), shellUrl: rendererUrl('index'), overlayUrl: rendererUrl('overlay'), isDev });
  const downloads = new DownloadManager(store);
  const engine = new BrowserEngine(store, history, window, {
    newTabUrl: rendererUrl('newtab'),
    onSession: (ses) => downloads.attach(ses),
    legacyPartitionExists: existsSync(join(userData, 'Partitions', 'samo')),
  });
  const menus = new ContextMenus(engine, window);

  registerIpc({ engine, downloads, menus, window });
  installMenu(engine, window);

  const stateFile = join(userData, 'browser-state.json');
  const persisted = await loadState(stateFile);
  const restorable = persisted && ('identities' in persisted ? persisted.identities.length : persisted.spaces.length) > 0;
  if (persisted && restorable) {
    store.hydrate(persisted);
    engine.wake();
  } else {
    engine.seed();
  }

  const saver = createSaver(stateFile);
  store.subscribe(() => saver.schedule(() => store.toPersisted()));

  const gateway = new AgentGateway(engine);
  await gateway.start();

  app.on('second-instance', () => {
    if (window.win.isMinimized()) window.win.restore();
    window.win.focus();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => window.win.show());
  app.on('before-quit', () => gateway.stop());
  app.on('will-quit', (event) => {
    event.preventDefault();
    void Promise.all([saver.flush(), history.flush()]).finally(() => app.exit(0));
  });
}
