/**
 * [INPUT]: 依赖 node:fs/path/os，samo-app main/chat 的 ChatStore/ChatService/ChatConfigStore/KeylessProvider/AgentProvider，main/agent/runner 的 ScriptRunner/locateCli，./protocol 的 Wire，./apps 的 Apps，./workspaces 的 Workspaces
 * [OUTPUT]: 可执行入口：`node dist/index.js --data-dir <dir> [--exclude-ports 5174,…] [--cdp-port 9222]`——装配对话/应用/工作区/agent 网关四块业务，把 Command/Query 分发给它们，把快照与事件推给浏览器
 * [POS]: samo-service 的装配根（对应 Electron 时代的 main/index.ts 里宿主无关的那一半）；浏览器进程（samo/service/samo_service.cc）拉起并持有它
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Command, Query } from '@shared/ipc';
import { ChatStore, type PersistedChat } from '../../../samo-app/src/main/chat/store';
import { ChatService } from '../../../samo-app/src/main/chat/service';
import { ChatConfigStore } from '../../../samo-app/src/main/chat/config';
import { KeylessProvider } from '../../../samo-app/src/main/chat/provider';
import { AgentProvider } from '../../../samo-app/src/main/chat/agent-provider';
import { ScriptRunner, locateCli } from '../../../samo-app/src/main/agent/runner';
import type { ChatProvider } from '../../../samo-app/src/main/chat/provider';
import { Wire, type BrowserContext } from './protocol';
import { Apps } from './apps';
import { Workspaces } from './workspaces';
import { AgentGateway } from './gateway';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const dataDir = arg('--data-dir') ?? join(homedir(), 'Library', 'Application Support', 'Samo');
mkdirSync(dataDir, { recursive: true });
const excludePorts = new Set((arg('--exclude-ports') ?? '').split(',').filter(Boolean).map(Number));
const cdpPort = Number(arg('--cdp-port') ?? 0);
// 应用内 AI 的 browser 工具（samo-browser 子进程）必须连本服务自己的网关，而不是同机可能在跑的 Electron 版
process.env.SAMO_GATEWAY_FILE = join(dataDir, 'agent-gateway.json');

// ---- 对话 ----
const chatStore = new ChatStore();
try {
  const persisted = JSON.parse(readFileSync(join(dataDir, 'chat.json'), 'utf8')) as PersistedChat;
  if (persisted.version === 1) chatStore.hydrate(persisted);
} catch {
  /* 首次 */
}
const chatConfig = new ChatConfigStore(join(dataDir, 'config.json'));
let context: BrowserContext = { activeUrl: null, activeTitle: null, tabCount: 0 };
let runner: ScriptRunner | null = null;
try {
  runner = new ScriptRunner(locateCli());
} catch {
  runner = null; // 没装 samo-agent：对话仍可用，只是没有 browser 工具
}
const makeProvider = (): ChatProvider => {
  const apiKey = chatConfig.resolveKey();
  if (!apiKey || !runner) return new KeylessProvider();
  return new AgentProvider({
    apiKey,
    model: chatConfig.resolveModel(),
    runner,
    context: () => ({ identityName: 'Samo', activeUrl: context.activeUrl, activeTitle: context.activeTitle, tabCount: context.tabCount, workspacePath: workspaces.currentPath() }),
    identityForTask: () => null,
  });
};
const chat = new ChatService(chatStore, makeProvider());
let saveTimer: NodeJS.Timeout | null = null;
chatStore.subscribe((snap) => {
  wire.pushChat(snap);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeFileSync(join(dataDir, 'chat.json'), JSON.stringify(chatStore.toPersisted())), 500);
});

// ---- 应用 / 工作区 ----
const serviceState = () => ({
  apps: apps.apps,
  activeAppId: apps.activeAppId,
  workspaces: workspaces.workspaces,
  activeWorkspaceId: workspaces.activeWorkspaceId,
  // agent 任务空间：Identity 形状 + 标签归属 + 各空间活动标签（浏览器合并进 BrowserSnapshot）
  identities: gateway?.identities() ?? [],
  tabSpaces: gateway?.tabSpaces() ?? {},
  activeTabBySpace: gateway?.activeTabBySpace() ?? {},
});
const pushState = () => wire.pushState(serviceState());
const wire = new Wire({
  getState: () => serviceState(),
  getChat: () => chatStore.snapshot(),
  layout: (module) => apps.setModuleActive(module === 'apps'),
  context: (c) => {
    context = c;
  },
  query: (query: Query) => (query.type === 'suggest' ? [] : []), // 建议/缩略图由浏览器侧提供
  invoke: async (command: Command) => {
    switch (command.type) {
      case 'chat.setApiKey':
        chatConfig.write({ anthropicApiKey: command.key });
        chat.setProvider(makeProvider());
        break;
      case 'chat.setMode':
        chat.setMode(command.mode);
        break;
      case 'chat.send':
        void chat.send(command.text);
        break;
      case 'chat.stop':
        chat.stop();
        break;
      case 'chat.newThread':
        chat.newThread();
        break;
      case 'chat.switchThread':
        chat.switchThread(command.threadId);
        break;
      case 'chat.deleteThread':
        chat.deleteThread(command.threadId);
        break;
      case 'chat.setDockWidth':
        chat.store.setDockWidth(command.width);
        break;
      case 'shell.setTheme':
        chatConfig.write({ theme: command.mode });
        void wire.host({ type: 'setTheme', mode: command.mode });
        break;
      case 'apps.open':
        apps.open(command.id);
        break;
      case 'apps.home':
        apps.home();
        break;
      case 'apps.rescan':
        void apps.rescan();
        break;
      case 'apps.pin':
        apps.pin(command.id, command.pinned);
        break;
      case 'workspace.add':
        void workspaces.add();
        break;
      case 'workspace.select':
        workspaces.select(command.id);
        break;
      case 'workspace.remove':
        workspaces.remove(command.id);
        break;
      case 'identity.takeControl':
        gateway?.setOwnership(command.identityId, 'agentDelegatedToUser');
        break;
      case 'identity.handBack':
        gateway?.setOwnership(command.identityId, 'agent');
        break;
      default:
        return { unhandled: command.type };
    }
    return null;
  },
});
const apps = new Apps(wire, join(dataDir, 'apps.json'), pushState, excludePorts);
const workspaces = new Workspaces(wire, chat, join(dataDir, 'workspaces.json'), pushState);
let gateway: AgentGateway | null = null;
if (cdpPort > 0) {
  gateway = new AgentGateway(cdpPort, dataDir, pushState);
  gateway.start().catch((e: unknown) => {
    process.stderr.write(`[samo-service] gateway failed: ${e instanceof Error ? e.message : String(e)}\n`);
    gateway = null;
  });
}
apps.start();
pushState();
process.stderr.write(`[samo-service] ready data=${dataDir}\n`);
