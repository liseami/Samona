/**
 * [INPUT]: 无运行时依赖，纯数据
 * [OUTPUT]: 对外提供 StoreApp 类型、STORE_CATEGORIES（分类顺序与标签）、STORE_APPS（商店里的应用）、storeTone()（logo 的中性色阶）
 * [POS]: modules/appstore 的假数据源——Samo 商店后端（公开发布的应用索引）接上之前先用它；换成真实数据时只换这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type StoreCategory = 'productivity' | 'developer' | 'writing' | 'media' | 'data' | 'agents';

export interface StoreApp {
  id: string;
  name: string;
  tagline: string;
  author: string; // 发布者句柄
  category: StoreCategory;
  installs: string; // 展示用
  rating: number;
  featured?: boolean;
}

export const STORE_CATEGORIES: { id: StoreCategory; label: string }[] = [
  { id: 'productivity', label: 'Productivity' },
  { id: 'developer', label: 'Developer' },
  { id: 'writing', label: 'Writing' },
  { id: 'media', label: 'Media' },
  { id: 'data', label: 'Data' },
  { id: 'agents', label: 'Agents' },
];

export const STORE_APPS: StoreApp[] = [
  { id: 'laper', name: 'Laper', tagline: 'AI screenwriting studio, from logline to shooting script', author: '@chunxiangzhao', category: 'writing', installs: '12.4k', rating: 4.9, featured: true },
  { id: 'kanban-lite', name: 'Kanban Lite', tagline: 'Boards that stay out of your way', author: '@mina', category: 'productivity', installs: '8.1k', rating: 4.7, featured: true },
  { id: 'inbox-zero', name: 'Inbox Zero', tagline: 'Triage your mail with an agent that learns your rules', author: '@arlo', category: 'agents', installs: '3.9k', rating: 4.6, featured: true },
  { id: 'deploy-log', name: 'Deploy Log', tagline: 'Watch every Samo deploy in one timeline', author: '@samo', category: 'developer', installs: '10.5k', rating: 4.8 },
  { id: 'daily-notes', name: 'Daily Notes', tagline: 'One page a day, nothing else', author: '@ines', category: 'writing', installs: '9.7k', rating: 4.6 },
  { id: 'pomodoro-rail', name: 'Pomodoro Rail', tagline: 'A timer that lives in the sidebar', author: '@noor', category: 'productivity', installs: '7.3k', rating: 4.4 },
  { id: 'ledger', name: 'Ledger', tagline: 'Personal finance, local first', author: '@tomas', category: 'data', installs: '6.2k', rating: 4.8 },
  { id: 'regex-lab', name: 'Regex Lab', tagline: 'Test patterns against real text as you type', author: '@devon', category: 'developer', installs: '5.6k', rating: 4.8 },
  { id: 'subtitle-forge', name: 'Subtitle Forge', tagline: 'Cut, time and translate subtitles', author: '@yuki', category: 'media', installs: '4.4k', rating: 4.7 },
  { id: 'sql-scratch', name: 'SQL Scratch', tagline: 'Query CSVs like tables', author: '@priya', category: 'data', installs: '3.1k', rating: 4.7 },
  { id: 'clip-deck', name: 'Clip Deck', tagline: 'Sort screenshots by project, automatically', author: '@leo', category: 'media', installs: '2.9k', rating: 4.5 },
  { id: 'prompt-bench', name: 'Prompt Bench', tagline: 'Compare prompts side by side, keep the winner', author: '@sasha', category: 'agents', installs: '2.3k', rating: 4.5 },
  { id: 'color-scale', name: 'Color Scale', tagline: 'Build neutral palettes in OKLCH', author: '@kai', category: 'developer', installs: '1.8k', rating: 4.9 },
  { id: 'mentor', name: 'Mentor', tagline: 'A tutor that remembers your gaps', author: '@sol', category: 'agents', installs: '1.2k', rating: 4.6 },
];

/** logo 只用中性色阶（银灰范式）：按 id 稳定落到四档之一 */
const TONES = ['bg-foreground text-background', 'bg-foreground/70 text-background', 'bg-muted text-foreground border border-border', 'bg-card text-foreground border border-border'];
export function storeTone(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
