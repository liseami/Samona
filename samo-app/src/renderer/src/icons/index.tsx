/**
 * [INPUT]: 依赖 react，@shared/model 的 IdentityIcon/ModuleId，./pika/index.js（Laper 的 Pika 图标库，1200+ 描边图标，API: size/color/className/ariaLabel）
 * [OUTPUT]: 对外提供壳所需图标的语义命名（SidebarClose/SidebarOpen/ArrowLeft/ArrowRight/Refresh/Close/Plus/Lock/Search/Window/Clock/Globe/Bot/Hand/Spinner/VolumeOn/VolumeMute/ChevronRight/Folder/FolderOpen/Eraser/Bug/Settings/Download）、模块图标表 MODULE_ICON、身份图标表 IDENTITY_ICON 与 IconProps 类型；全部以装饰性（aria-hidden）渲染，按钮的可访问名由文字/aria-label 决定
 * [POS]: renderer/icons 的语义层——组件只认语义名，换图标只改这里；pika/ 目录原样复制自 Laper，不手改
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ComponentType, SVGProps } from 'react';
import type { IdentityIcon, ModuleId } from '@shared/model';
// 具名导入才能被 tree-shake：namespace 导入 + 动态取键会把 1200+ 图标全打进包（实测 2.4MB）
import {
  ArrowLeft as PiArrowLeft,
  BriefcaseJob,
  Camera,
  ChatDefault,
  CloudDefault,
  CoffeeCup01,
  Code,
  EnvelopeDefault,
  Film,
  GraduationHat,
  Heart,
  HomeDefault,
  Incognito,
  LabFlaskConical,
  Leaf,
  LightningThunderElectricOn,
  MusicQuaverNote,
  RocketShip,
  Shield,
  ShoppingCart,
  Star,
  TerminalConsoleSquare,
  Trophy,
  UserDefault,
  WalletDefault,
  ArrowRight as PiArrowRight,
  Bot as PiBot,
  Bug as PiBug,
  ChevronRight as PiChevronRight,
  ClockDefault,
  DownloadDown,
  EraserDefault,
  FolderDefault,
  FolderOpen as PiFolderOpen,
  Globe as PiGlobe,
  LockClose,
  MultipleCrossCancelDefault,
  PlusDefault,
  Refresh as PiRefresh,
  SearchDefault,
  Settings01,
  SidebarLeftClose,
  SidebarLeftOpen,
  Spinner as PiSpinner,
  SwipeRightHand,
  VolumeMute as PiVolumeMute,
  VolumeTwo,
  WindowBrowser,
} from './pika/index.js';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; color?: string; className?: string };
type PikaIcon = ComponentType<IconProps & { ariaLabel?: string; role?: string }>;

/** Pika 图标默认带 role=img + aria-label；壳里图标全是装饰性的，统一隐藏于无障碍树 */
const decorative = (Icon: PikaIcon): ComponentType<IconProps> => {
  const Decorated = (props: IconProps) => <Icon aria-hidden="true" role="presentation" ariaLabel="" focusable="false" {...props} />;
  Decorated.displayName = Icon.displayName ?? Icon.name ?? 'Icon';
  return Decorated;
};

const d = (icon: unknown) => decorative(icon as PikaIcon);

export const SidebarClose = d(SidebarLeftClose);
export const SidebarOpen = d(SidebarLeftOpen);
export const ArrowLeft = d(PiArrowLeft);
export const ArrowRight = d(PiArrowRight);
export const Refresh = d(PiRefresh);
export const Close = d(MultipleCrossCancelDefault);
export const Plus = d(PlusDefault);
export const Lock = d(LockClose);
export const Search = d(SearchDefault);
export const Window = d(WindowBrowser);
export const Clock = d(ClockDefault);
export const Globe = d(PiGlobe);
export const Bot = d(PiBot);
export const Hand = d(SwipeRightHand);
export const Spinner = d(PiSpinner);
export const VolumeOn = d(VolumeTwo);
export const VolumeMute = d(PiVolumeMute);
export const ChevronRight = d(PiChevronRight);
export const Folder = d(FolderDefault);
export const FolderOpen = d(PiFolderOpen);
export const Eraser = d(EraserDefault);
export const Bug = d(PiBug);
export const Settings = d(Settings01);
export const Download = d(DownloadDown);

/** 模块图标：icon navi 的四个维度 */
export const MODULE_ICON: Record<ModuleId, ComponentType<IconProps>> = {
  browser: d(PiGlobe),
  mail: d(EnvelopeDefault),
  knowledge: d(GraduationHat),
  drive: d(CloudDefault),
};

/** 身份图标：语义键 → Pika 组件（禁止 emoji） */
export const IDENTITY_ICON: Record<IdentityIcon, ComponentType<IconProps>> = {
  user: d(UserDefault),
  home: d(HomeDefault),
  briefcase: d(BriefcaseJob),
  code: d(Code),
  terminal: d(TerminalConsoleSquare),
  shopping: d(ShoppingCart),
  wallet: d(WalletDefault),
  heart: d(Heart),
  star: d(Star),
  bolt: d(LightningThunderElectricOn),
  globe: d(PiGlobe),
  lock: d(LockClose),
  incognito: d(Incognito),
  shield: d(Shield),
  bot: d(PiBot),
  flask: d(LabFlaskConical),
  graduation: d(GraduationHat),
  camera: d(Camera),
  film: d(Film),
  music: d(MusicQuaverNote),
  chat: d(ChatDefault),
  mail: d(EnvelopeDefault),
  rocket: d(RocketShip),
  coffee: d(CoffeeCup01),
  leaf: d(Leaf),
  trophy: d(Trophy),
};
