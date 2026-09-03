/**
 * [INPUT]: 依赖 ./scanner 的 scanLocalApps，../browser/engine 的 BrowserEngine（store 读写 + 标签复用/新建），@shared/model 的 AppEntry
 * [OUTPUT]: 对外提供 AppsService：启动扫描 + 在应用维度里每 12s 重扫（其余时候 60s），open(id) 在当前身份复用同源标签或新建并激活，进入应用维度且无选中时默认打开第一张
 * [POS]: apps 模块的指挥：把「用户的应用」投影成 store 里的 apps/activeAppId；网页本身仍由浏览器引擎承载（应用 = 一个被记住的标签），云端列表预留给 Samo 部署
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { AppEntry } from '@shared/model';
import type { BrowserEngine } from '../browser/engine';
import { scanLocalApps } from './scanner';

const ACTIVE_INTERVAL = 12_000;
const IDLE_INTERVAL = 60_000;

export class AppsService {
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;
  private cloud: AppEntry[] = []; // 预留：Samo 云端部署的应用

  constructor(private readonly engine: BrowserEngine) {
    engine.store.subscribe((snap) => {
      if (snap.layout.module === 'apps' && snap.activeAppId === null && snap.apps.length > 0) this.open(snap.apps[0].id);
    });
  }

  start(): void {
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
      const local = await scanLocalApps();
      this.engine.store.setApps([...local, ...this.cloud]);
    } finally {
      this.scanning = false;
    }
  }

  /** 打开一张卡：同源标签复用，否则新建；都在当前身份里 */
  open(id: string): void {
    const app = this.engine.store.appList.find((a) => a.id === id);
    if (!app) return;
    const store = this.engine.store;
    const origin = new URL(app.url).origin;
    const existing = store.tabsInIdentity(store.activeIdentityId).find((t) => safeOrigin(t.url) === origin);
    if (existing) this.engine.activateTab(existing.id);
    else this.engine.createTab({ url: app.url, activate: true });
    store.setActiveApp(id);
  }
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}
