/**
 * [INPUT]: 依赖 react，../../store/browser 的 useBrowser/send，../ui/{popover,input,button}，../../lib/utils 的 cn，@shared/model 的 SPACE_COLORS/SPACE_COLOR_HEX
 * [OUTPUT]: 对外提供 SpaceEditor 组件：包住 SpacesStrip 作锚点的编辑浮层——名称、emoji 网格、颜色色板即时生效，底部删除（至少保留一个 Space）
 * [POS]: renderer/components/sidebar 的 Space 编辑器，由 store.spaceEditor 请求（+ 按钮 / 双击 pip / 右键 / ⇧⌘N）打开
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState, type ReactNode } from 'react';
import { SPACE_COLORS, SPACE_COLOR_HEX } from '@shared/model';
import { cn } from '../../lib/utils';
import { send, useBrowser } from '../../store/browser';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';

const EMOJIS = ['🏠', '💼', '🧪', '🎨', '📚', '🛒', '🎵', '🎬', '✈️', '💡', '🧠', '🚀', '🌱', '🔥', '⚡', '🧩', '🎯', '📈', '💬', '📷', '🐙', '🦄', '🌊', '🍜', '🏋️', '🎮', '🧭', '🛠️', '🤖', '✦', '☕', '🌙'];

export function SpaceEditor({ children }: { children: ReactNode }) {
  const request = useBrowser((s) => s.spaceEditor);
  const spaces = useBrowser((s) => s.snapshot?.spaces ?? []);
  const [open, setOpen] = useState(false);
  const [spaceId, setSpaceId] = useState<number | null>(null);
  const space = spaces.find((s) => s.id === spaceId);

  useEffect(() => {
    if (!request) return;
    setSpaceId(request.value);
    setOpen(true);
  }, [request?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && spaceId !== null && !space) setOpen(false); // 被删除后自动关闭
  }, [open, spaceId, space]);

  return (
    <Popover open={open && !!space} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div>{children}</div>
      </PopoverAnchor>
      {space && (
        <PopoverContent className="w-64 p-3" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Input
            autoFocus
            value={space.name}
            placeholder="Space name"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => send({ type: 'space.update', spaceId: space.id, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setOpen(false);
            }}
          />
          <div className="mt-3 grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => send({ type: 'space.update', spaceId: space.id, emoji })}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md border text-base transition-colors duration-200',
                  space.emoji === emoji ? 'border-border bg-card shadow-xs' : 'border-transparent hover:bg-accent/60',
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 px-0.5">
            {SPACE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => send({ type: 'space.update', spaceId: space.id, color })}
                className={cn('h-4.5 w-4.5 rounded-full transition-transform duration-200 hover:scale-110', space.color === color && 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-popover')}
                style={{ background: SPACE_COLOR_HEX[color] }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={spaces.length <= 1}
              className="text-destructive hover:border-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete “${space.name}” and close its tabs?`)) send({ type: 'space.delete', spaceId: space.id });
              }}
            >
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
