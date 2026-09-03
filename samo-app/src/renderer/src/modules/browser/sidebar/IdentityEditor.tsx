/**
 * [INPUT]: 依赖 react，../../store/browser 的 useBrowser/send，../ui/{popover,input,button}，../../lib/utils 的 cn，../../icons 的 IDENTITY_ICON，@shared/model 的 IDENTITY_COLORS/IDENTITY_COLOR_HEX/IDENTITY_ICONS
 * [OUTPUT]: 对外提供 IdentityEditor 组件：锚在身份栏上的编辑浮层——名称、Pika 图标网格、颜色色板即时生效，底部删除（至少保留一个身份）
 * [POS]: renderer/components/sidebar 的身份编辑器，由 store.identityEditor 请求（+ 按钮 / 双击 pip / 右键 / ⇧⌘N）打开
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState, type ReactNode } from 'react';
import { IDENTITY_COLORS, IDENTITY_COLOR_HEX, IDENTITY_ICONS } from '@shared/model';
import { IDENTITY_ICON } from '../../../icons';
import { cn } from '../../../lib/utils';
import { send, useBrowser } from '../../../store/browser';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../../components/ui/popover';

export function IdentityEditor({ children }: { children: ReactNode }) {
  const request = useBrowser((s) => s.identityEditor);
  const identities = useBrowser((s) => s.snapshot?.identities ?? []);
  const [open, setOpen] = useState(false);
  const [identityId, setIdentityId] = useState<number | null>(null);
  const identity = identities.find((s) => s.id === identityId);

  useEffect(() => {
    if (!request) return;
    setIdentityId(request.value);
    setOpen(true);
  }, [request?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && identityId !== null && !identity) setOpen(false); // 被删除后自动关闭
  }, [open, identityId, identity]);

  return (
    <Popover open={open && !!identity} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div>{children}</div>
      </PopoverAnchor>
      {identity && (
        <PopoverContent className="w-64 p-3" align="start" side="top" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Input
            autoFocus
            value={identity.name}
            placeholder="Identity name"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => send({ type: 'identity.update', identityId: identity.id, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setOpen(false);
            }}
          />
          <div className="mt-3 grid grid-cols-7 gap-1">
            {IDENTITY_ICONS.map((key) => {
              const Icon = IDENTITY_ICON[key];
              return (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => send({ type: 'identity.update', identityId: identity.id, icon: key })}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-200',
                    identity.icon === key ? 'border-border bg-card text-foreground shadow-xs' : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 px-0.5">
            {IDENTITY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => send({ type: 'identity.update', identityId: identity.id, color })}
                className={cn('h-4.5 w-4.5 rounded-full transition-transform duration-200 hover:scale-110', identity.color === color && 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-popover')}
                style={{ background: IDENTITY_COLOR_HEX[color] }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={identities.length <= 1}
              className="text-destructive hover:border-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete “${identity.name}” and close its tabs?`)) send({ type: 'identity.delete', identityId: identity.id });
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
