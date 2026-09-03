/**
 * [INPUT]: 依赖 electron 的 Session/DownloadItem/shell，./store 的 BrowserStore，@shared/model 的 Download
 * [OUTPUT]: 对外提供 DownloadManager 类：监听 will-download 把进度投影进 store，提供 open/reveal/cancel
 * [POS]: browser 模块的下载侧翼；只认识 Electron 下载项与 store，由 index.ts 装配到标签页所在的 session
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { basename } from 'node:path';
import { shell, type DownloadItem, type Session } from 'electron';
import type { Download } from '@shared/model';
import type { BrowserStore } from './store';

export class DownloadManager {
  private items = new Map<string, DownloadItem>();

  constructor(private readonly store: BrowserStore) {}

  attach(session: Session): void {
    session.on('will-download', (_event, item) => this.track(item));
  }

  open(id: string): void {
    const d = this.store.getDownload(id);
    if (d?.state === 'completed') void shell.openPath(d.path);
  }
  reveal(id: string): void {
    const d = this.store.getDownload(id);
    if (d?.path) shell.showItemInFolder(d.path);
  }
  cancel(id: string): void {
    this.items.get(id)?.cancel();
  }
  clear(): void {
    this.store.clearFinishedDownloads();
  }

  private track(item: DownloadItem): void {
    const id = crypto.randomUUID();
    this.items.set(id, item);
    const project = (state: Download['state']): Download => ({
      id,
      filename: item.getFilename() || basename(item.getSavePath()),
      url: item.getURL(),
      path: item.getSavePath(),
      state,
      received: item.getReceivedBytes(),
      total: item.getTotalBytes(),
      startedAt: item.getStartTime() * 1000,
    });
    this.store.upsertDownload(project('progressing'));
    item.on('updated', (_e, state) => this.store.upsertDownload(project(state === 'interrupted' ? 'interrupted' : 'progressing')));
    item.once('done', (_e, state) => {
      this.store.upsertDownload(project(state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted'));
      this.items.delete(id);
    });
  }
}
