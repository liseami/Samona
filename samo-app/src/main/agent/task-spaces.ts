/**
 * [INPUT]: 依赖 @shared/model 的 Space/Ownership 类型
 * [OUTPUT]: 对外提供 toTaskSpace（Space → ego task space 线形）、EgoError 工厂 egoError/EgoRejection、EGO_CODE 常量
 * [POS]: agent 模块的语义翻译层：Samo 的 Space 与 ego-browser 的 task space 是同一实体的两个名字，这里是唯一的换算点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Space } from '@shared/model';

// ============ ego-browser 识别的稳定错误码（见 ego-errors.ts） ============
export const EGO_CODE = {
  invalidArgument: 'EGO_INVALID_ARGUMENT',
  operationFailed: 'EGO_OPERATION_FAILED',
  snapshotFailed: 'EGO_SNAPSHOT_FAILED',
  spaceInactive: 'EGO_TASK_SPACE_INACTIVE',
  spaceNotFound: 'EGO_TASK_SPACE_NOT_FOUND',
  spaceNotSelected: 'EGO_TASK_SPACE_NOT_SELECTED',
  userInControl: 'EGO_TASK_SPACE_USER_IN_CONTROL',
  webContentsUnavailable: 'EGO_WEB_CONTENTS_UNAVAILABLE',
} as const;
export type EgoCode = (typeof EGO_CODE)[keyof typeof EGO_CODE];

/** 「已解决的错误」：ego 约定的 { error, error_code } 返回形 */
export interface EgoErrorResult {
  error: string;
  error_code: EgoCode;
}
export function egoError(code: EgoCode, message: string): EgoErrorResult {
  return { error: message, error_code: code };
}

/** 「拒绝的错误」：snapshot 等必须 reject 的路径使用，携带 error_code 供 isEgoUserControlError 识别 */
export class EgoRejection extends Error {
  readonly error_code: EgoCode;
  constructor(code: EgoCode, message: string) {
    super(message);
    this.name = 'EgoRejection';
    this.error_code = code;
  }
}

export interface TaskSpaceWire {
  id: number;
  name: string;
  taskId: string;
  ownership: Space['ownership'];
  active: boolean;
  state: string | null;
}

export function toTaskSpace(space: Space, selectedId: number | null): TaskSpaceWire {
  return {
    id: space.id,
    name: space.name,
    taskId: space.taskId ?? space.name,
    ownership: space.ownership,
    active: space.id === selectedId,
    state: space.agentState,
  };
}
