/**
 * [INPUT]: 无运行时依赖，纯函数
 * [OUTPUT]: 对外提供 avatarGradient(seed)（三点径向渐变，Laper avatarUtils 的 djb2 取色移植到中性偏冷的色板）与 avatarText(nickname, email)（显示字：中文取首两字，英文取首字母）
 * [POS]: renderer 的头像算法；Avatar 组件消费，真实头像存在时不用它
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** 中性偏冷的色板（银灰范式下头像仍要可辨识，所以给一点色相，饱和度压低） */
const PALETTE = ['#8c95a6', '#a3aab8', '#7f8aa3', '#9aa5b1', '#6f7b8f', '#b1b7c4', '#8a97b0', '#a9b0bd', '#76829a', '#9ca7ba'];

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) + hash + str.charCodeAt(i);
  return Math.abs(hash);
}

export function avatarGradient(seed: string): string {
  const h = djb2(seed || 'samo');
  const c1 = PALETTE[h % PALETTE.length];
  const c2 = PALETTE[(h >> 3) % PALETTE.length];
  const c3 = PALETTE[(h >> 6) % PALETTE.length];
  return `radial-gradient(circle at 30% 30%, ${c1} 0%, transparent 70%), radial-gradient(circle at 70% 40%, ${c2} 0%, transparent 70%), radial-gradient(circle at 50% 80%, ${c3} 0%, transparent 70%), ${c2}`;
}

export function avatarText(nickname?: string | null, email?: string | null): string {
  const name = (nickname || email?.split('@')[0] || '').trim();
  if (!name) return '·';
  if (/[一-鿿]/.test(name)) return name.replace(/\s+/g, '').slice(0, 2);
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 1)).toUpperCase();
}
