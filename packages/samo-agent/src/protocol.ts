/**
 * [INPUT]: 无依赖，纯类型
 * [OUTPUT]: 对外提供网关线形：GatewayPointer（指针文件）、RpcRequest/RpcResponse/ServerPush（WebSocket 报文）、GATEWAY_FILE_NAME、resolvePointerPath
 * [POS]: samo-agent 的契约根；samo-app 的 agent/gateway 与本包的 host/cli 共用这一份定义，任何线形变更只改这里
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

export const GATEWAY_FILE_NAME = 'agent-gateway.json';
export const APP_DIR_NAME = 'Samo';

/** Samo 启动后写在 userData 里的指针文件 */
export interface GatewayPointer {
  url: string; // ws://127.0.0.1:<port>
  token: string; // 每次启动随机生成的会话凭证
  pid: number;
  version: string;
}

// ============ CLI → 网关 ============
export type RpcRequest =
  | { id: number; method: string; params?: unknown[] } // ego 宿主方法调用
  | { cdp: string }; // 原样透传的 CDP 报文（ego.sendCDPMessage）

// ============ 网关 → CLI ============
export interface RpcResponse {
  id: number;
  result?: unknown;
  error?: { message: string; error_code?: string };
}
export interface ServerPush {
  event: 'cdp';
  message: string; // 原样回推的 CDP 响应/事件（ego.onCDPMessage）
}

/** 指针文件路径：与 Electron app.getPath('userData')（app.setName('Samo')）保持一致；可用 SAMO_GATEWAY_FILE 覆盖 */
export function resolvePointerPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SAMO_GATEWAY_FILE) return env.SAMO_GATEWAY_FILE;
  const home = homedir();
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', APP_DIR_NAME, GATEWAY_FILE_NAME);
    case 'win32':
      return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), APP_DIR_NAME, GATEWAY_FILE_NAME);
    default:
      return join(env.XDG_CONFIG_HOME ?? join(home, '.config'), APP_DIR_NAME, GATEWAY_FILE_NAME);
  }
}
