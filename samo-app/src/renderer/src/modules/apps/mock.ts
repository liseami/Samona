/**
 * [INPUT]: 无运行时依赖，纯数据与确定性伪随机
 * [OUTPUT]: 对外提供 MOCK_PROFILE（用户信息）、MOCK_STATS（四项指标）、mockHeatmap()（一年的活跃度点阵）、MOCK_TOKENS / MOCK_AGENTS（时间序列）
 * [POS]: modules/apps/dashboard 的假数据源——用户主页与热力图在接入 Samo 账号与 agent 遥测之前先用它；换成真实数据时只换这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const MOCK_PROFILE = { name: '翔宇 赵', handle: '@chunxiangzhao', initials: 'ZX', since: 'Since 2019' };

export const MOCK_STATS = [
  { label: 'Longest Agent', value: '8.2h' },
  { label: 'Agents', value: '38' },
  { label: 'Longest Streak', value: '9d' },
  { label: 'Current Streak', value: '0d', muted: true },
] as const;

/** xorshift32：同一种子每次得到同一张热力图 */
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

export interface HeatCell {
  week: number; // 0..52
  day: number; // 0 = Mon … 6 = Sun
  level: 0 | 1 | 2 | 3; // 0 无活动
}

/** 53 周 × 7 天；活动集中在最近三个月，越近越密 */
export function mockHeatmap(): HeatCell[] {
  const r = rng(20260903);
  const cells: HeatCell[] = [];
  for (let week = 0; week < 53; week++) {
    for (let day = 0; day < 7; day++) {
      const recency = (week - 26) / 27; // 下半年才开始
      const p = recency > 0 ? recency * 0.45 : 0.01;
      const roll = r();
      const level: HeatCell['level'] = roll < p * 0.25 ? 3 : roll < p * 0.55 ? 2 : roll < p ? 1 : 0;
      cells.push({ week, day, level });
    }
  }
  return cells;
}

export const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** 30 天 token 用量（M） */
export const MOCK_TOKENS = { total: '747.8M', from: 'Aug 5', to: 'Today', series: [0, 0, 62, 41, 48, 20, 12, 33, 22, 28, 12, 6, 2, 0, 0, 0, 55, 3, 0, 20, 10, 16, 5, 1, 0, 0, 0, 9, 1, 0] };

/** 30 天 agent 会话数（本地 / 云端） */
export const MOCK_AGENTS = { total: 38, local: 38, cloud: 0, from: 'Aug 5', to: 'Today', series: [0, 0, 9, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0] };
