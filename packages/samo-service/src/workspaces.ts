/**
 * [INPUT]: 依赖 node:fs 同步读写（workspaces.json，格式与 samo-app 的 WorkspaceService 相同），node:path，@shared/model 的 Workspace，./protocol 的 Wire（host pickFolder/reveal），samo-app main/chat/service 的 ChatService
 * [OUTPUT]: 对外提供 Workspaces：add()（请浏览器弹目录选择器）、remove、select（切到该目录的对话线程）、reveal（请浏览器在访达显示）、currentPath()
 * [POS]: samo-service 的工作区维度——samo-app main/workspace/service.ts 的宿主无关版本（DRY 债：待抽共享核心）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import type { Workspace } from '@shared/model';
import type { ChatService } from '../../../samo-app/src/main/chat/service';
import type { Wire } from './protocol';

interface PersistedWorkspaces {
  version: 1;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

export class Workspaces {
  workspaces: Workspace[] = [];
  activeWorkspaceId: string | null = null;
  constructor(
    private readonly wire: Wire,
    private readonly chat: ChatService,
    private readonly file: string,
    private readonly onChange: () => void,
  ) {
    const p = this.load();
    this.workspaces = p.workspaces;
    this.activeWorkspaceId = p.activeWorkspaceId;
  }
  async add(): Promise<void> {
    const path = await this.wire.host<string | null>({ type: 'pickFolder' });
    if (!path) return;
    const existing = this.workspaces.find((w) => w.path === path);
    if (existing) return this.select(existing.id);
    const ws: Workspace = { id: crypto.randomUUID(), name: basename(path) || path, path, addedAt: Date.now() };
    this.workspaces = [...this.workspaces, ws];
    this.select(ws.id);
  }
  remove(id: string): void {
    this.workspaces = this.workspaces.filter((w) => w.id !== id);
    if (this.activeWorkspaceId === id) this.activeWorkspaceId = null;
    this.save();
    this.onChange();
  }
  select(id: string | null): void {
    this.activeWorkspaceId = id;
    const ws = id ? this.workspaces.find((w) => w.id === id) : undefined;
    if (ws) this.chat.openWorkspaceThread(ws.id, ws.name);
    this.save();
    this.onChange();
  }
  reveal(id: string): void {
    const ws = this.workspaces.find((w) => w.id === id);
    if (ws) void this.wire.host({ type: 'reveal', path: ws.path });
  }
  currentPath(): string | null {
    return (this.activeWorkspaceId && this.workspaces.find((w) => w.id === this.activeWorkspaceId)?.path) ?? null;
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
    writeFileSync(this.file, JSON.stringify({ version: 1, workspaces: this.workspaces, activeWorkspaceId: this.activeWorkspaceId } satisfies PersistedWorkspaces, null, 2));
  }
}
