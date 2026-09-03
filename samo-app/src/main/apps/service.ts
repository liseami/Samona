/**
 * [INPUT]: 依赖 node:fs 同步读写（apps.json），./scanner 的 scanLocalApps，../browser/engine 的 BrowserEngine（store 读写 + 标签新建/呈现），@shared/model 的 AppEntry
 * [OUTPUT]: 对外提供 AppsService：启动扫描 + 在应用维度里每 12s 重扫（其余 60s）；固定项落盘 apps.json 并与扫描结果合并（固定但没在跑的标 offline）；open(id) 复用/新建带 appId 的应用视图（不落盘、不进浏览器）交给引擎呈现；home() 回桌面；pin(id, pinned)；扫描发现应用不在跑就关掉它的视图——本地应用不积累标签
 * [POS]: apps 模块的指挥：把「用户的应用」投影成 store 里的 apps/activeAppId；网页本身仍由浏览器引擎承载（应用 = 一个带 appId 的标签），云端列表预留给 Samo 部署
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AppEntry } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import { scanLocalApps } from './scanner';

const ACTIVE_INTERVAL = 12_000;
const IDLE_INTERVAL = 60_000;

interface PersistedApps {
  version: 1;
  pinned: AppEntry[]; // 固定项记住名字/地址/logo，没在跑时也能显示
}

export class AppsService {
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;
  private scanned: AppEntry[] = [];
  private pinned: AppEntry[] = [];
  private cloud: AppEntry[] = []; // 预留：Samo 部署的应用（visibility private / public）

  constructor(
    private readonly engine: BrowserEngine,
    private readonly file: string,
    private readonly excludePorts: ReadonlySet<number> = new Set(),
  ) {
    this.pinned = this.load();
  }

  start(): void {
    this.publish();
    void this.rescan();
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    const active = this.engine.store.getLayout().module === 'apps';
    this.timer = setTimeout(() => {
      void this.rescan().finally(() => this.schedule());
    }, active ? ACTIVE_INTERVAL : IDLE_INTERVAL);
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

  /** 合并：固定项在前（在跑的用最新扫描结果覆盖名字/logo，没在跑的标 offline），其余扫描结果与云端在后 */
  private publish(): void {
    const byId = new Map(this.scanned.map((a) => [a.id, a]));
    const pinned = this.pinned.map((p) => ({ ...p, ...(byId.get(p.id) ?? {}), pinned: true, offline: !byId.has(p.id) }));
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const rest = [...this.scanned, ...this.cloud].filter((a) => !pinnedIds.has(a.id)).map((a) => ({ ...a, pinned: false, offline: false }));
    const apps = [...pinned, ...rest];
    this.engine.store.setApps(apps);
    // 本地应用不积累标签：不在跑的应用，把它的应用视图关掉；正呈现的就回桌面
    const alive = new Set(apps.filter((a) => !a.offline).map((a) => a.id));
    for (const tab of this.engine.store.allTabs()) {
      if (tab.appId && !alive.has(tab.appId)) {
        if (this.engine.store.currentAppId === tab.appId) this.engine.store.setActiveApp(null);
        this.engine.closeTab(tab.id);
      }
    }
    this.engine.present();
  }

  /** 回到桌面：不呈现任何应用视图（视图仍在后台，下次点开即现） */
  home(): void {
    this.engine.store.setActiveApp(null);
    this.engine.present();
  }

  pin(id: string, pinned: boolean): void {
    const app = this.engine.store.appList.find((a) => a.id === id);
    if (!app) return;
    this.pinned = this.pinned.filter((p) => p.id !== id);
    if (pinned) this.pinned.push({ id: app.id, visibility: app.visibility, name: app.name, url: app.url, port: app.port, process: app.process, icon: app.icon ?? null });
    this.save();
    this.publish();
  }

  /** 打开一张卡：本身份里已有该应用的标签就复用，否则新建一个带 appId 的标签（不进浏览器侧栏、不改浏览器活动标签），然后由引擎在应用维度呈现 */
  open(id: string): void {
    const store = this.engine.store;
    const app = store.appList.find((a) => a.id === id);
    if (!app || app.offline) return;
    if (!store.appTab(id)) this.engine.createTab({ url: app.url, activate: false, appId: id });
    store.setActiveApp(id);
    this.engine.present();
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
