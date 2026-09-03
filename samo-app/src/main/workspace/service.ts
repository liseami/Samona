/**
 * [INPUT]: 依赖 electron 的 dialog/shell，node:fs 同步读写（workspaces.json），node:path，@shared/model 的 Workspace，../browser/store 的 BrowserStore，../chat/service 的 ChatService
 * [OUTPUT]: 对外提供 WorkspaceService：工作区 = 本机目录——add()（原生目录选择器）、remove(id)、select(id)（切到该工作区的对话线程）、reveal(id)（在访达中显示）；列表落盘 userData/workspaces.json
 * [POS]: workspace 模块的指挥：把「用户的目录」投影成 store 里的 workspaces/activeWorkspaceId，把对话线程与目录绑定；agent 在目录里读写与执行的工具留待接入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { dialog, shell } from 'electron';
import type { Workspace } from '@shared/model';
import type { BrowserStore } from '../browser/store';
import type { ChatService } from '../chat/service';

interface PersistedWorkspaces {
  version: 1;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

export class WorkspaceService {
  constructor(
    private readonly store: BrowserStore,
    private readonly chat: ChatService,
    private readonly file: string,
  ) {
    const persisted = this.load();
    store.setWorkspaces(persisted.workspaces);
    if (persisted.activeWorkspaceId) store.setActiveWorkspace(persisted.activeWorkspaceId);
  }

  /** 原生目录选择器；已存在的目录直接选中 */
  async add(): Promise<void> {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Add workspace', buttonLabel: 'Add' });
    if (result.canceled || result.filePaths.length === 0) return;
    for (const path of result.filePaths) {
      const existing = this.store.workspaceList.find((w) => w.path === path);
      if (existing) {
        this.select(existing.id);
        continue;
      }
      const ws: Workspace = { id: crypto.randomUUID(), name: basename(path) || path, path, addedAt: Date.now() };
      this.store.setWorkspaces([...this.store.workspaceList, ws]);
      this.select(ws.id);
    }
    this.save();
  }

  remove(id: string): void {
    this.store.setWorkspaces(this.store.workspaceList.filter((w) => w.id !== id));
    this.save();
  }

  /** 选中工作区：面板切到它的对话线程（无则新建，标题即目录名） */
  select(id: string | null): void {
    this.store.setActiveWorkspace(id);
    const ws = id ? this.store.workspaceList.find((w) => w.id === id) : undefined;
    if (ws) this.chat.openWorkspaceThread(ws.id, ws.name);
    this.save();
  }

  reveal(id: string): void {
    const ws = this.store.workspaceList.find((w) => w.id === id);
    if (ws) shell.showItemInFolder(ws.path);
  }

  /** 当前工作区的目录（给 agent 的上下文） */
  currentPath(): string | null {
    const id = this.store.currentWorkspaceId;
    return (id && this.store.workspaceList.find((w) => w.id === id)?.path) ?? null;
  }

  private load(): PersistedWorkspaces {
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as PersistedWorkspaces;
      if (parsed.version === 1 && Array.isArray(parsed.workspaces)) return parsed;
    } catch {
      /* 首次 */
    }
    return { version: 1, workspaces: [], activeWorkspaceId: null };
  }
  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ version: 1, workspaces: this.store.workspaceList, activeWorkspaceId: this.store.currentWorkspaceId } satisfies PersistedWorkspaces, null, 2));
  }
}
