/**
 * [INPUT]: 依赖 react，../../components/ui/{button,input,tooltip,popover,kbd,keycap,sidebar-button}，../../icons，@shared/model 的 IDENTITY_ICONS/MODULES
 * [OUTPUT]: 对外提供各章节陈列组件：ButtonsShowcase / SidebarButtonShowcase / InputsShowcase / OverlaysShowcase / KeycapsShowcase / SurfacesShowcase / ColorsShowcase / TypographyShowcase / IconsShowcase，以及 Kumo 文档站的陈列原语 Section(h2)/Group(h3)/Example(h4 + 预览面 + 代码块)/PropsTable
 * [POS]: modules/design 的内容层；预览面上的一切都是真实组件，不是截图；每个示例的代码块就是它旁边渲染的那段 JSX
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState, type ReactNode } from 'react';
import { IDENTITY_ICONS, MODULES } from '@shared/model';
import { Button, type ButtonSize, type ButtonVariant } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Kbd } from '../../components/ui/kbd';
import { Keycap } from '../../components/ui/keycap';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { sidebarButtonClass } from '../../components/ui/sidebar-button';
import { Tip } from '../../components/ui/tooltip';
import * as Icons from '../../icons';
import { IDENTITY_ICON, MODULE_ICON } from '../../icons';
import { cn } from '../../lib/utils';

// ============ Kumo 文档站陈列原语（Heading levelStyles / ComponentExample / PropsTable 原样） ============
export function Section({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold text-foreground">{title}</h2>
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground">{blurb}</p>
      {children}
    </>
  );
}
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-xl font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
/** h4 标题 + 预览面（rounded-t-lg、hairline、canvas 底、p-6 居中）+ 无上边的代码块 */
export function Example({ title, code, surface, children }: { title?: string; code?: string; surface?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      {title && <h4 className="mb-3 text-base font-semibold text-foreground">{title}</h4>}
      <div className="not-prose overflow-hidden rounded-lg">
        <div className={cn('flex min-h-[120px] items-center justify-center border border-border bg-card p-6', code ? 'rounded-t-lg' : 'rounded-lg', surface)}>
          <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
        </div>
        {code && <CodeBlock code={code} />}
      </div>
    </div>
  );
}
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative border border-t-0 border-border bg-card">
      <pre className="overflow-x-auto py-3.5 pr-8 pl-4 font-mono text-sm leading-normal text-foreground" style={{ letterSpacing: 'normal' }}>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        aria-label="Copy code"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute top-3 right-3 flex size-6.5 cursor-pointer items-center justify-center rounded-md bg-card text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted"
      >
        {copied ? <Icons.Copied size={14} /> : <Icons.Copy size={14} />}
      </button>
    </div>
  );
}
function PropsTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left font-semibold">Prop</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map(([p, v, n]) => (
            <tr key={p} className="border-b border-border">
              <td className="px-4 py-3 font-mono text-xs">{p}</td>
              <td className="max-w-xs px-4 py-3 font-mono text-xs">
                <code className="text-wrap break-words">{v}</code>
              </td>
              <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Button ============
const EMPHASIS: ButtonVariant[] = ['primary', 'info', 'warning', 'danger'];
const FLAT: ButtonVariant[] = ['secondary', 'ghost', 'outline', 'selected', 'dashed'];
const SIZES: ButtonSize[] = ['small', 'medium', 'large'];

export function ButtonsShowcase() {
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Button" blurb="The soul of the system. Emphasis buttons use the Kumo recipe: base = token + 30% white, 1px ring = token + 10% black, a top-down lit gradient (token + 15% white → token) under the label with a 1px inner highlight on top; hover lifts the gradient start to the base and scales 1.02, press scales 0.98. Flat variants carry no shadow.">
      <Group title="Variants">
        <Example title="Emphasis" code={`<Button variant="primary">Primary</Button>\n<Button variant="info">Info</Button>\n<Button variant="warning">Warning</Button>\n<Button variant="danger">Danger</Button>`}>
          {EMPHASIS.map((v) => (
            <Button key={v} variant={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Example>
        <Example title="Flat" code={`<Button variant="secondary">Secondary</Button>\n<Button variant="ghost">Ghost</Button>\n<Button variant="outline">Outline</Button>\n<Button variant="selected">Selected</Button>\n<Button variant="dashed">Dashed</Button>`}>
          {FLAT.map((v) => (
            <Button key={v} variant={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Example>
      </Group>
      <Group title="Sizes">
        <Example code={`<Button size="small">Small</Button>\n<Button size="medium">Medium</Button>\n<Button size="large">Large</Button>`}>
          {SIZES.map((s) => (
            <Button key={s} size={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
          {SIZES.map((s) => (
            <Button key={`s-${s}`} size={s} variant="secondary">
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </Example>
      </Group>
      <Group title="With icon">
        <Example code={`<Button leftIcon={<Plus size={14} />}>New tab</Button>\n<Button variant="secondary" rightIcon={<ArrowRight size={14} />}>Continue</Button>`}>
          <Button leftIcon={<Icons.Plus size={14} />}>New tab</Button>
          <Button variant="secondary" rightIcon={<Icons.ArrowRight size={14} />}>
            Continue
          </Button>
          <Button variant="outline" leftIcon={<Icons.Refresh size={14} />}>
            Reload
          </Button>
        </Example>
      </Group>
      <Group title="Icon only">
        <Example code={`<Button variant="secondary" leftIcon={<Download size={14} />} aria-label="Download" />\n<Button variant="icon" aria-label="Settings"><Settings size={16} /></Button>`}>
          <Button variant="secondary" leftIcon={<Icons.Download size={14} />} aria-label="Download" />
          <Button variant="primary" leftIcon={<Icons.Plus size={14} />} aria-label="Add" />
          <Button variant="icon" aria-label="Settings">
            <Icons.Settings size={16} />
          </Button>
        </Example>
      </Group>
      <Group title="Loading state">
        <Example code={`<Button loading>Working…</Button>\n<Button onClick={() => doAsyncThing()}>Click to load</Button>`}>
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => setBusy(false), 1800);
            }}
          >
            {busy ? 'Working…' : 'Click to load'}
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
        </Example>
      </Group>
      <Group title="Disabled state">
        <Example code={`<Button disabled>Disabled</Button>  // clicking shakes instead of doing nothing`}>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
        </Example>
      </Group>
      <Group title="API Reference">
        <PropsTable
          rows={[
            ['variant', '"primary" | "info" | "warning" | "danger" | "secondary" | "ghost" | "outline" | "selected" | "icon" | "dashed"', 'Only primary/info/warning/danger are lit (EmphasisEffect). Default "primary".'],
            ['size', '"small" | "medium" | "large"', 'h-7 / h-8 / h-9; padding shifts with icons (Laper PADDING_CONFIG). Default "small".'],
            ['leftIcon / rightIcon', 'ReactNode', 'Icon-only buttons get symmetric padding.'],
            ['loading', 'boolean', 'Spinner replaces the left icon; a shimmer band sweeps across; clicks are ignored.'],
            ['disabled', 'boolean', 'Clicking a disabled button shakes it.'],
            ['asChild', 'boolean', 'Render into the child (Radix Slot) for triggers and links.'],
          ]}
        />
      </Group>
    </Section>
  );
}

// ============ SidebarButton ============
export function SidebarButtonShowcase() {
  const [active, setActive] = useState(1);
  const rows = ['Inbox', 'Starred', 'Archive'];
  return (
    <Section title="SidebarButton" blurb="The one selection language for rails, tab rows, folder heads, grid cells and identity pips: rounded-2xl, an always-present border, active = raised card (bg-card + border + shadow-sm), hover = sidebar-accent/66, 300ms ease-out.">
      <Example title="On a panel surface" surface="bg-panel" code={`<button className={sidebarButtonClass({ active })}>…</button>`}>
        <div className="flex w-56 flex-col gap-1">
          {rows.map((r, i) => (
            <button key={r} type="button" onClick={() => setActive(i)} className={sidebarButtonClass({ active: active === i, className: 'h-8 w-full gap-2 pl-2 pr-3 text-base' })}>
              <Icons.Folder size={14} className="text-muted-foreground" />
              <span>{r}</span>
            </button>
          ))}
          <button type="button" className={sidebarButtonClass({ disabled: true, className: 'h-8 w-full gap-2 pl-2 pr-3 text-base' })}>
            <Icons.Lock size={14} className="text-muted-foreground" />
            <span>Disabled</span>
          </button>
        </div>
      </Example>
    </Section>
  );
}

// ============ Input ============
export function InputsShowcase() {
  return (
    <Section title="Input" blurb="h-8, bg-input, rounded-lg. Focus swaps the border to primary and adds a 3px soft glow (Laper glow-input). No focus ring inside sidebars.">
      <Example code={`<Input placeholder="Identity name" />`}>
        <Input placeholder="Identity name" className="w-64" />
        <Input defaultValue="Personal" className="w-64" />
        <Input placeholder="Disabled" disabled className="w-64" />
      </Example>
    </Section>
  );
}

// ============ Tooltip & Popover ============
export function OverlaysShowcase() {
  return (
    <Section title="Tooltip & Popover" blurb="Light surfaces, never dark tags. Tooltip: bg-popover + outline-border + shadow-md, 600ms delay, z-3. Popover: rounded-xl, border/60, shadow-lg, pop-in 150ms, z-2.">
      <Example code={`<Tip label="Reload ⌘R"><Button variant="secondary">Hover me</Button></Tip>\n<Popover><PopoverTrigger asChild><Button variant="secondary">Open</Button></PopoverTrigger><PopoverContent>…</PopoverContent></Popover>`}>
        <Tip label="Reload ⌘R">
          <Button variant="secondary" leftIcon={<Icons.Refresh size={14} />}>
            Hover me
          </Button>
        </Tip>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="text-sm font-semibold text-foreground">Popover</div>
            <div className="mt-1 text-sm text-muted-foreground">Menu surface: rounded-xl, border/60, shadow-lg.</div>
          </PopoverContent>
        </Popover>
      </Example>
    </Section>
  );
}

// ============ Keycap & Kbd ============
export function KeycapsShowcase() {
  return (
    <Section title="Keycap & Kbd" blurb="Keycap is Laper's KeyboardHint: gradient muted face, 1.5px border with a 4px bottom edge. Kbd is the flat inline hint used inside fields.">
      <Example title="Keycap" code={`<Keycap>⌘</Keycap> <Keycap>↵</Keycap> <Keycap>Esc</Keycap>`}>
        <Keycap>⌘</Keycap>
        <Keycap>↵</Keycap>
        <Keycap>Esc</Keycap>
        <Keycap>↑</Keycap>
        <Keycap>↓</Keycap>
      </Example>
      <Example title="Kbd" code={`<Kbd>⌘T</Kbd>`}>
        <Kbd>⌘T</Kbd>
        <Kbd>⌘L</Kbd>
        <Kbd>⇧⌘A</Kbd>
      </Example>
    </Section>
  );
}

// ============ Surfaces & Shadows ============
const SHADOWS = ['shadow-2xs', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-card', 'shadow-dropdown'];
const RADII = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'];
export function SurfacesShowcase() {
  return (
    <Section title="Surfaces & Shadows" blurb="Three tiers: sidebar (floor) < panel (SoftPanel cards) < card (raised rows). Shadows are Laper's flat scale. Every radius is an Apple squircle via corner-shape.">
      <Example title="SoftPanel on the floor" surface="bg-sidebar" code={`<div className="rounded-2xl border border-border bg-panel shadow-sm">…</div>`}>
        <div className="flex h-28 w-48 flex-col rounded-2xl border border-border bg-panel p-3 shadow-sm">
          <div className="text-sm font-semibold">SoftPanel</div>
          <div className="mt-1 text-xs text-muted-foreground">bg-panel · rounded-2xl · border · shadow-sm</div>
          <div className="mt-auto rounded-2xl border border-border bg-card px-2 py-1 text-xs shadow-sm">raised row (bg-card)</div>
        </div>
      </Example>
      <Example title="Shadow scale">
        {SHADOWS.map((s) => (
          <div key={s} className={`flex h-16 w-24 items-center justify-center rounded-xl border border-border bg-panel text-xs text-muted-foreground ${s}`}>
            {s.replace('shadow-', '') || 'base'}
          </div>
        ))}
      </Example>
      <Example title="Radius scale (squircle)">
        {RADII.map((r) => (
          <div key={r} className={`flex h-14 w-20 items-center justify-center border border-border bg-panel text-xs text-muted-foreground ${r}`}>
            {r.replace('rounded-', '')}
          </div>
        ))}
      </Example>
    </Section>
  );
}

// ============ Colors ============
const COLOR_TOKENS = ['sidebar', 'panel', 'card', 'background', 'muted', 'accent', 'sidebar-accent', 'border', 'input', 'primary', 'destructive', 'info', 'warning', 'foreground', 'muted-foreground'];
export function ColorsShowcase() {
  return (
    <Section title="Colors" blurb="Neutral oklch tokens. Floor, panel and card form the depth ladder; muted/accent/border are the wash tokens that decide how loud hover and selection feel.">
      <Example title="Tokens">
        {COLOR_TOKENS.map((t) => (
          <div key={t} className="flex w-36 flex-col gap-1.5">
            <div className="h-12 rounded-lg border border-border" style={{ background: `var(--${t})` }} />
            <div className="font-mono text-xs text-foreground">--{t}</div>
            <TokenValue token={t} />
          </div>
        ))}
      </Example>
    </Section>
  );
}
function TokenValue({ token }: { token: string }) {
  const value = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() : '';
  return <div className="truncate font-mono text-xs text-muted-foreground">{value}</div>;
}

// ============ Typography ============
const TYPE = [
  ['text-xs', '10px'],
  ['text-sm', '12px'],
  ['text-base', '13px'],
  ['text-lg', '14px'],
  ['text-xl', '16px'],
  ['text-2xl', '20px'],
];
export function TypographyShowcase() {
  return (
    <Section title="Typography" blurb="Laper's compressed scale. Nothing in the chrome exceeds 14px; Montserrat in light mode, Inter in dark.">
      <Example title="Scale">
        <div className="flex flex-col items-start gap-2">
          {TYPE.map(([cls, px]) => (
            <div key={cls} className="flex items-baseline gap-4">
              <span className="w-24 font-mono text-xs text-muted-foreground" style={{ letterSpacing: 'normal' }}>
                {cls} · {px}
              </span>
              <span className={`${cls} text-foreground`}>The quick brown fox jumps over the lazy dog</span>
            </div>
          ))}
        </div>
      </Example>
    </Section>
  );
}

// ============ Icons ============
const SEMANTIC = ['SidebarClose', 'SidebarOpen', 'ArrowLeft', 'ArrowRight', 'Refresh', 'Close', 'Plus', 'Lock', 'Search', 'Window', 'Clock', 'Globe', 'Bot', 'Hand', 'Spinner', 'VolumeOn', 'VolumeMute', 'ChevronRight', 'Folder', 'FolderOpen', 'Eraser', 'Bug', 'Settings', 'Download', 'Copy', 'Copied'] as const;
export function IconsShowcase() {
  return (
    <Section title="Icons" blurb="Pika only (Laper's library, 1200+ stroke icons at 24 viewport / 2px). The shell names icons semantically; identity and module icons are curated subsets.">
      <Example title="Semantic">
        {SEMANTIC.map((name) => {
          const Icon = Icons[name];
          return (
            <div key={name} className="flex w-24 flex-col items-center gap-1.5 rounded-lg border border-border bg-panel py-3">
              <Icon size={18} className="text-foreground" />
              <span className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: 'normal' }}>
                {name}
              </span>
            </div>
          );
        })}
      </Example>
      <Example title="Identity">
        {IDENTITY_ICONS.map((key) => {
          const Icon = IDENTITY_ICON[key];
          return (
            <div key={key} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card shadow-sm" title={key}>
              <Icon size={15} />
            </div>
          );
        })}
      </Example>
      <Example title="Modules">
        {MODULES.map((m) => {
          const Icon = MODULE_ICON[m.id];
          return (
            <div key={m.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-1.5 text-sm shadow-sm">
              <Icon size={16} /> {m.label}
            </div>
          );
        })}
      </Example>
    </Section>
  );
}
