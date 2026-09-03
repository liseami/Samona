/**
 * [INPUT]: 依赖 electron 的 app/nativeImage/nativeTheme，node:fs/path，./browser/{store,engine,persistence,history,downloads}，./shell/window，./ipc/handlers，./menu，./menus/context-menu，./agent/{gateway,runner,presence}，./apps/service，./workspace/service，./chat/{store,provider,agent-provider,config,service,window,launcher-window,choreographer}
 * [OUTPUT]: 无导出；主进程引导——装配 store→window→engine→chat→ipc/menu→gateway，并处理生命周期（恢复/落盘/退出）、系统外观跟随与开发态 Dock 图标
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
import { ChatStore, type PersistedChat } from './chat/store';
import { KeylessProvider, type ChatProvider } from './chat/provider';
import { AgentProvider } from './chat/agent-provider';
import { ChatConfigStore } from './chat/config';
import { ChatService } from './chat/service';
import { ChatWindow } from './chat/window';
import { ChatChoreographer } from './chat/choreographer';
import { LauncherWindow } from './chat/launcher-window';
import { locateCli, ScriptRunner } from './agent/runner';
import { AgentPresence } from './agent/presence';
import { AppsService } from './apps/service';
import { installPermissions } from './browser/permissions';
import { installNetTrace } from './browser/net-trace';
import { WorkspaceService } from './workspace/service';
import { loadJson } from './browser/persistence';
import { CHANNELS } from '@shared/ipc';

app.setName('Samo');
// UA 规范成纯 Chrome：带 Electron/Samo 标记的 UA 会被 Google 登录等判定为「不安全的浏览器」，也会触发各家的机器人策略
app.userAgentFallback = app.userAgentFallback.replace(/ Samo\/\S+/, '').replace(/ samo-app\/\S+/, '').replace(/ Electron\/\S+/, '');
const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL;

// ============ 渲染资源定位：dev 走 Vite 服务（HMR），prod 走打包产物 ============
function rendererUrl(page: 'index' | 'newtab' | 'overlay' | 'launcher' | 'chat' | 'agent'): string {
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

  const preloadPath = join(__dirname, '../preload/index.js');
  const window = new ShellWindow({ preloadPath, shellUrl: rendererUrl('index'), overlayUrl: rendererUrl('overlay'), isDev });
  const downloads = new DownloadManager(store);
  const engine = new BrowserEngine(store, history, window, {
    newTabUrl: rendererUrl('newtab'),
    onSession: (ses) => {
      downloads.attach(ses);
      installPermissions(ses, join(userData, 'permissions.json')); // 按站点询问并记住
      installNetTrace(ses); // SAMO_TRACE_NET=1 才生效
    },
    legacyPartitionExists: existsSync(join(userData, 'Partitions', 'samo')),
  });
  const ownPorts = new Set<number>();
  if (isDev && process.env.ELECTRON_RENDERER_URL) ownPorts.add(Number(new URL(process.env.ELECTRON_RENDERER_URL).port)); // 自己的渲染开发服务器不算应用
  const apps = new AppsService(engine, join(userData, 'apps.json'), ownPorts); // 应用维度：扫描 localhost 上的应用，固定项落盘
  const menus = new ContextMenus(engine, window, apps);
  // ---- agent 存在感：可见身份被 agent 驱动时，透明点击穿透的子窗口盖在网页上画光标、动作标签与边缘发光 ----
  const presence = new AgentPresence(window, engine, { preloadPath, agentUrl: rendererUrl('agent') });
  engine.registerAux('agent', () => presence.webContents());

  // ---- AI 对话：主进程持有真相，三处 UI（launcher / 浮窗 / 停靠卡）只读快照 ----
  const chatStore = new ChatStore();
  const persistedChat = await loadJson<PersistedChat>(join(userData, 'chat.json'));
  if (persistedChat?.version === 1) chatStore.hydrate(persistedChat);
  // 回答者：有密钥 → Claude + samo-browser 运行时（真正驱动浏览器）；无密钥 → 引导语
  const chatConfig = new ChatConfigStore(join(userData, 'config.json'));
  nativeTheme.themeSource = chatConfig.read().theme ?? 'system'; // 外观：用户在用户菜单里选的
  const runner = new ScriptRunner(locateCli());
  const makeProvider = (): ChatProvider => {
    const apiKey = chatConfig.resolveKey();
    if (!apiKey) return new KeylessProvider();
    return new AgentProvider({
      apiKey,
      model: chatConfig.resolveModel(),
      runner,
      context: () => {
        const identity = store.activeIdentity;
        const tab = store.activeTab(identity.id);
        return { identityName: identity.name, activeUrl: tab?.url ?? null, activeTitle: tab?.title ?? null, tabCount: store.tabsInIdentity(identity.id).length, workspacePath: store.currentWorkspaceId ? (store.workspaceList.find((w) => w.id === store.currentWorkspaceId)?.path ?? null) : null };
      },
      identityForTask: (task) => store.allIdentities().find((i) => i.taskId === task)?.id ?? null,
    });
  };
  const chat = new ChatService(chatStore, makeProvider());
  const chatWindow = new ChatWindow(window, { preloadPath, chatUrl: rendererUrl('chat'), onClosedByUser: () => chat.setMode('closed') });
  const launcher = new LauncherWindow(window, { preloadPath, launcherUrl: rendererUrl('launcher') });
  const chatSaver = createSaver<PersistedChat>(join(userData, 'chat.json'));
  engine.registerAux('launcher', () => launcher.webContents());
  engine.registerAux('chat', () => (chatWindow.isOpen() ? chatWindow.webContents() : null));
  const choreographer = new ChatChoreographer(window, chatWindow, launcher);
  chatStore.subscribe((snap) => {
    window.send(CHANNELS.chat, snap);
    launcher.send(CHANNELS.chat, snap);
    chatWindow.send(CHANNELS.chat, snap);
    choreographer.apply(snap); // 形态切换 = 窗口几何编舞
    chatSaver.schedule(() => chatStore.toPersisted());
  });
  window.shellView.webContents.once('did-finish-load', () => choreographer.init(chatStore.currentMode, chatStore.snapshot().dockWidth));
  store.subscribe((snap) => choreographer.setSuppressed(snap.layout.module === 'workspace')); // 工作区维度自身就是对话，不显示药丸

  const workspaces = new WorkspaceService(store, chat, join(userData, 'workspaces.json')); // 工作区维度：本机目录 = 工作区
  menus.attachWorkspaces(workspaces);
  registerIpc({
    engine,
    downloads,
    menus,
    window,
    chat,
    apps,
    workspaces,
    setApiKey: (key) => {
      chatConfig.write({ anthropicApiKey: key.trim() });
      chat.setProvider(makeProvider());
    },
    setTheme: (mode) => {
      nativeTheme.themeSource = mode;
      chatConfig.write({ theme: mode });
    },
  });
  installMenu(engine, window, chat);
  window.win.on('focus', () => store.setFocused(true));
  window.win.on('blur', () => store.setFocused(false));
  window.win.on('enter-full-screen', () => store.setFullscreen(true));
  window.win.on('leave-full-screen', () => store.setFullscreen(false));

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
  apps.start();

  const reveal = () => {
    if (window.win.isDestroyed()) return;
    if (window.win.isMinimized()) window.win.restore();
    window.win.show();
    window.win.focus();
  };
  app.on('second-instance', reveal);
  app.on('activate', reveal); // Dock 点击：红灯只是隐藏了窗口，这里再显示
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', () => {
    window.allowClose();
    gateway.stop();
  });
  app.on('will-quit', (event) => {
    event.preventDefault();
    void Promise.all([saver.flush(), history.flush(), chatSaver.flush()]).finally(() => app.exit(0));
  });
}
