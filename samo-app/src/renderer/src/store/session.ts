/**
 * [INPUT]: 依赖 zustand 的 create，localStorage（samo.session）与 storage 事件（壳与 overlay 两个窗口同源，任一处登入/登出另一处即时镜像）
 * [OUTPUT]: 对外提供 useSession：当前用户（null = 未登录）、signIn()（暂为本地 mock，接 Samo 账号时换成真实登录）、signOut()、tier/credits；SessionUser 类型
 * [POS]: renderer 的账号状态；壳的 UserButton / UserMenu 只读它。真实登录态未来由主进程持有并经快照下发，这里届时退化为镜像
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from 'zustand';
import type { SessionUser } from '@shared/model';

export type { SessionUser };

interface SessionState {
  user: SessionUser | null;
  signIn(): void;
  signOut(): void;
}

const KEY = 'samo.session';
const MOCK_USER: SessionUser = { id: 'mock', nickname: '翔宇 赵', email: 'chunxiangzhao@samo.app', avatarUrl: null, tier: 'free', credits: 0 };

function load(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY || e.key === null) useSession.setState({ user: load() });
});

export const useSession = create<SessionState>((set) => ({
  user: load(),
  signIn: () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(MOCK_USER));
    } catch {
      /* 私密模式 */
    }
    set({ user: MOCK_USER });
  },
  signOut: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 私密模式 */
    }
    set({ user: null });
  },
}));
