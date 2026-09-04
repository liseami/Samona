/**
 * [INPUT]: 依赖 ./mock 的 StoreApp/storeTone，../../lib/utils 的 cn
 * [OUTPUT]: 对外提供 StoreLogo（圆角方形首字母 logo，中性色阶）与 AddButton（右侧「添加」：未添加 = secondary + Plus，已添加 = outline + 勾，点击互切）
 * [POS]: modules/appstore 的图形原子，精选卡、列表行、侧栏共用；真实商店接上后 logo 换成发布方图标，本组件只换内部渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Button } from '../../components/ui/button';
import { CheckOk, Plus } from '../../icons';
import { cn } from '../../lib/utils';
import { storeTone, type StoreApp } from './mock';
import { useAppStore } from './store';

export function StoreLogo({ app, size, className }: { app: StoreApp; size: number; className?: string }) {
  const initials = app.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center font-semibold tracking-tight select-none', size >= 32 ? 'rounded-xl' : 'rounded-lg', storeTone(app.id), className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </span>
  );
}

export function AddButton({ app }: { app: StoreApp }) {
  const added = useAppStore((s) => !!s.added[app.id]);
  const add = useAppStore((s) => s.add);
  const remove = useAppStore((s) => s.remove);
  return added ? (
    <Button variant="outline" size="small" className="shrink-0" title="Remove from your apps" onClick={() => remove(app.id)}>
      <CheckOk size={13} /> Added
    </Button>
  ) : (
    <Button variant="secondary" size="small" className="shrink-0" onClick={() => add(app.id)}>
      <Plus size={13} /> Add
    </Button>
  );
}
