/**
 * [INPUT]: 依赖 react，../store/session 的 useSession，../store/browser 的 send/useBrowser，../components/ui/{avatar,menu-row,kbd,button}，../icons 的 Globe/ChevronRight/SunIcon/MoonIcon/MonitorIcon/Settings/Support/Gift/Docs/LogOut，../lib/utils 的 cn
 * [OUTPUT]: 对外提供 UserMenu 组件：Laper UserMenu 的 Samo 版——账户卡（头像 + 昵称 + 会员键帽 + Upgrade）→ Credits / Add credits / Invite friends → 分隔 → Docs / Contact support → 分隔 → Language（悬停子菜单）/ Appearance（悬停子菜单：System / Light / Dark，真的切主进程 nativeTheme）→ Settings → 分隔 → Log out；menu-pop 入场、子菜单 submenu-slide
 * [POS]: shell 的账户入口菜单，由 UserButton 弹出；升级/积分/邀请/设置在 Samo 账号体系接上之前是占位动作
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { useSession } from '../store/session';
import { send } from '../store/browser';
import { Avatar } from '../components/ui/avatar';
import { MenuRow } from '../components/ui/menu-row';
import { Kbd } from '../components/ui/kbd';
import { Button } from '../components/ui/button';
import { ChevronRight, Docs, Gift, Globe, LogOut, MonitorIcon, MoonIcon, Settings, SunIcon, Support } from '../icons';
import { cn } from '../lib/utils';

type ThemeMode = 'system' | 'light' | 'dark';
const THEMES: { mode: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { mode: 'system', label: 'System', Icon: MonitorIcon },
  { mode: 'light', label: 'Light', Icon: SunIcon },
  { mode: 'dark', label: 'Dark', Icon: MoonIcon },
];
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '简体中文' },
];
const THEME_KEY = 'samo.theme';
const LANG_KEY = 'samo.lang';

export function UserMenu({ onClose }: { onClose: () => void }) {
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');
  const [langHover, setLangHover] = useState(false);
  const [themeHover, setThemeHover] = useState(false);
  if (!user) return null;

  const chooseTheme = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem(THEME_KEY, mode);
    send({ type: 'shell.setTheme', mode });
    onClose();
  };
  const chooseLang = (code: string) => {
    setLang(code);
    localStorage.setItem(LANG_KEY, code);
    onClose();
  };
  const placeholder = () => onClose(); // 升级 / 积分 / 邀请 / 设置 / 文档 / 客服：账号体系接上前的占位

  return (
    <div className="menu-pop w-64 rounded-2xl border border-border bg-card p-1.5" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
      {/* 账户卡：整行可点开设置 */}
      <MenuRow as="div" role="button" tabIndex={0} onClick={placeholder} onKeyDown={(e) => e.key === 'Enter' && placeholder()}>
        <Avatar user={user} size={40} />
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm leading-normal font-semibold text-foreground">{user.nickname || user.email.split('@')[0]}</div>
          <div className="mt-0.5 flex min-w-0">
            <Kbd className="capitalize">{user.tier}</Kbd>
          </div>
        </div>
        {user.tier !== 'max' && (
          <Button
            variant="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              placeholder();
            }}
          >
            Upgrade
          </Button>
        )}
      </MenuRow>
      <MenuRow justify="between" onClick={placeholder}>
        <span className="truncate text-sm leading-normal text-foreground">Credits</span>
        <span className="shrink-0 text-sm leading-normal font-semibold text-foreground tabular-nums">{user.credits}</span>
      </MenuRow>
      <MenuRow tone="primary" onClick={placeholder}>
        <span className="block truncate text-sm leading-normal font-medium text-primary">Add credits</span>
      </MenuRow>
      <MenuRow justify="between" onClick={placeholder}>
        <span className="truncate text-sm leading-normal text-foreground">Invite friends</span>
        <Gift size={16} className="shrink-0 text-muted-foreground" />
      </MenuRow>
      <Separator />
      <MenuRow justify="between" onClick={placeholder}>
        <span className="truncate text-sm leading-normal text-foreground">Samo docs</span>
        <Docs size={16} className="shrink-0 text-muted-foreground" />
      </MenuRow>
      <MenuRow justify="between" onClick={placeholder}>
        <span className="truncate text-sm leading-normal text-foreground">Contact us</span>
        <Support size={16} className="shrink-0 text-muted-foreground" />
      </MenuRow>
      <Separator />
      {/* Language：悬停展开子菜单（右侧） */}
      <div className="relative" onMouseEnter={() => setLangHover(true)} onMouseLeave={() => setLangHover(false)}>
        <MenuRow as="div" justify="between">
          <span className="truncate text-sm leading-normal text-foreground">{LANGUAGES.find((l) => l.code === lang)?.name}</span>
          <Globe size={16} className="shrink-0 text-foreground" />
        </MenuRow>
        {langHover && (
          <Submenu>
            {LANGUAGES.map((l) => (
              <SubmenuItem key={l.code} active={l.code === lang} onClick={() => chooseLang(l.code)}>
                {l.name}
              </SubmenuItem>
            ))}
          </Submenu>
        )}
      </div>
      {/* Appearance：悬停展开子菜单 */}
      <div className="relative" onMouseEnter={() => setThemeHover(true)} onMouseLeave={() => setThemeHover(false)}>
        <MenuRow as="div" justify="between">
          <span className="truncate text-sm leading-normal text-foreground">{THEMES.find((t) => t.mode === theme)?.label}</span>
          <ChevronRight size={16} className="shrink-0 text-foreground" />
        </MenuRow>
        {themeHover && (
          <Submenu>
            {THEMES.map(({ mode, label, Icon }) => (
              <SubmenuItem key={mode} active={mode === theme} onClick={() => chooseTheme(mode)}>
                <Icon size={18} />
                {label}
              </SubmenuItem>
            ))}
          </Submenu>
        )}
      </div>
      <MenuRow justify="between" onClick={placeholder}>
        <span className="truncate text-sm leading-normal text-foreground">Settings</span>
        <Settings size={16} className="shrink-0 text-muted-foreground" />
      </MenuRow>
      <Separator />
      <MenuRow
        justify="between"
        onClick={() => {
          onClose();
          signOut();
        }}
      >
        <span className="block truncate text-sm leading-normal text-foreground">Log out</span>
        <LogOut size={16} className="shrink-0 text-muted-foreground" />
      </MenuRow>
    </div>
  );
}

const Separator = () => <div className="my-1 h-px w-full bg-border" />;

/** 子菜单：右侧贴出（rail 场景），submenu-slide 入场 */
function Submenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="submenu-slide absolute bottom-0 left-full z-2 ml-2">
      <div className="w-max min-w-40 rounded-2xl border border-border bg-card p-1.5" style={{ boxShadow: 'var(--shadow-dropdown)' }}>{children}</div>
    </div>
  );
}
function SubmenuItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm leading-normal transition-colors hover:bg-accent', active ? 'font-semibold text-foreground' : 'font-normal text-foreground')}>
      {children}
    </button>
  );
}
