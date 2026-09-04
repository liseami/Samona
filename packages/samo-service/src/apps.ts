/**
 * [INPUT]: 依赖 node:fs 同步读写（apps.json，格式与 samo-app 的 AppsService 相同），samo-app main/apps/scanner 的 scanLocalApps，@shared/model 的 AppEntry，./protocol 的 Wire（host 请求 openApp/closeApp）
 * [OUTPUT]: 对外提供 Apps：扫描 + 应用维度活跃时 12s（否则 60s）重扫，固定项落盘并合并（没在跑的标 offline），http 图标抓成 data: URL（WebUI 渲染器不许加载 http 资源），open/home/pin/rescan；应用标签由浏览器开（host openApp），消失的应用请浏览器关它的标签
 * [POS]: samo-service 的应用维度——samo-app main/apps/service.ts 的宿主无关版本：标签与呈现交给浏览器进程，这里只管「用户的应用」是什么（DRY 债：两份合并逻辑待抽成共享核心）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AppEntry } from '@shared/model';
import { scanLocalApps } from '../../../samo-app/src/main/apps/scanner';
import type { Wire } from './protocol';

const ACTIVE_INTERVAL = 12_000;
const IDLE_INTERVAL = 60_000;
interface PersistedApps {
  version: 1;
  pinned: AppEntry[];
}

export class Apps {
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;
  private scanned: AppEntry[] = [];
  private pinned: AppEntry[] = [];
  private active = false;
  apps: AppEntry[] = [];
  activeAppId: string | null = null;

  constructor(
    private readonly wire: Wire,
    private readonly file: string,
    private readonly onChange: () => void,
    private readonly excludePorts: ReadonlySet<number> = new Set(),
  ) {
    this.pinned = this.load();
  }

  start(): void {
    this.publish();
    void this.rescan();
    this.schedule();
  }
  setModuleActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.schedule();
    if (active) void this.rescan();
  }
  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.rescan().finally(() => this.schedule()), this.active ? ACTIVE_INTERVAL : IDLE_INTERVAL);
  }
  async rescan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      this.scanned = await scanLocalApps(this.excludePorts);
      this.publish();
    } finally {
      this.scanning = false;
    }
  }
  // WebUI 渲染器不许直接加载 http(s) 资源（浏览器会以 "Incorrect scheme" 杀掉它），应用图标先由服务抓成 data: URL
  private iconCache = new Map<string, string | null>();
  private async inlineIcons(apps: AppEntry[]): Promise<boolean> {
    let changed = false;
    await Promise.all(
      apps.map(async (a) => {
        if (!a.icon || !/^https?:/.test(a.icon)) return;
        if (!this.iconCache.has(a.icon)) {
          this.iconCache.set(a.icon, null);
          try {
            const r = await fetch(a.icon, { signal: AbortSignal.timeout(2500) });
            const type = r.headers.get('content-type')?.split(';')[0] ?? 'image/png';
            const buf = Buffer.from(await r.arrayBuffer());
            if (r.ok && buf.length > 0 && buf.length < 300_000) this.iconCache.set(a.icon, `data:${type};base64,${buf.toString('base64')}`);
          } catch {
            /* 拿不到就没有图标 */
          }
        }
        const data = this.iconCache.get(a.icon);
        if (data !== undefined && a.icon !== data) {
          a.icon = data; // data: URL 或 null
          changed = true;
        }
      }),
    );
    return changed;
  }

  private publish(): void {
    const byId = new Map(this.scanned.map((a) => [a.id, a]));
    const pinned = this.pinned.map((p) => ({ ...p, ...(byId.get(p.id) ?? {}), pinned: true, offline: !byId.has(p.id) }));
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const rest = this.scanned.filter((a) => !pinnedIds.has(a.id)).map((a) => ({ ...a, pinned: false, offline: false }));
    const before = new Set(this.apps.filter((a) => !a.offline).map((a) => a.id));
    this.apps = [...pinned, ...rest];
    void this.inlineIcons(this.apps).then((changed) => changed && this.onChange());
    const alive = new Set(this.apps.filter((a) => !a.offline).map((a) => a.id));
    for (const id of before) {
      if (!alive.has(id)) {
        if (this.activeAppId === id) this.activeAppId = null;
        void this.wire.host({ type: 'closeApp', appId: id }); // 本地应用不积累标签
      }
    }
    this.onChange();
  }
  home(): void {
    this.activeAppId = null;
    this.onChange();
  }
  pin(id: string, pinned: boolean): void {
    const app = this.apps.find((a) => a.id === id);
    if (!app) return;
    this.pinned = this.pinned.filter((p) => p.id !== id);
    if (pinned) this.pinned.push({ id: app.id, visibility: app.visibility, name: app.name, url: app.url, port: app.port, process: app.process, icon: app.icon ?? null });
    this.save();
    this.publish();
  }
  open(id: string): void {
    const app = this.apps.find((a) => a.id === id);
    if (!app || app.offline) return;
    this.activeAppId = id;
    this.onChange();
    void this.wire.host({ type: 'openApp', url: app.url, appId: id });
  }
  private load(): AppEntry[] {
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as PersistedApps;
      return parsed.version === 1 && Array.isArray(parsed.pinned) ? parsed.pinned : [];
    } catch {
      return [];
    }
  }
  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ version: 1, pinned: this.pinned } satisfies PersistedApps, null, 2));
  }
}
