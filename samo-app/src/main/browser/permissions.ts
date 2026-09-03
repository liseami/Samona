/**
 * [INPUT]: 依赖 electron 的 Session/dialog/BaseWindow，node:fs 同步读写（permissions.json）
 * [OUTPUT]: 对外提供 installPermissions(session, file)：网页权限请求的策略——静默放行无害项（全屏、指针锁、剪贴板写入、显示捕获之外的 mediaKeySystem…），敏感项（摄像头/麦克风/定位/通知/剪贴板读取/MIDI/USB/串口）首次按站点弹原生询问，选择按 origin 记住并落盘；setPermissionCheckHandler 与之一致
 * [POS]: browser 模块的「浏览器体验」层之一：Electron 默认对所有权限一律放行，这里补上 Chromium 那种「按站点询问并记住」
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { BaseWindow, dialog, type Session } from 'electron';

type Decision = 'allow' | 'deny';
interface Persisted {
  version: 1;
  grants: Record<string, Decision>; // `${origin}|${permission}`
}

const SILENT_ALLOW = new Set(['fullscreen', 'pointerLock', 'clipboard-sanitized-write', 'window-management', 'keyboardLock', 'idle-detection', 'background-sync', 'storage-access', 'top-level-storage-access', 'speaker-selection']);
const ASK = new Set(['media', 'geolocation', 'notifications', 'clipboard-read', 'midi', 'midiSysex', 'usb', 'serial', 'hid', 'bluetooth', 'display-capture', 'fileSystem', 'openExternal']);
const LABEL: Record<string, string> = {
  media: 'use your camera and microphone',
  geolocation: 'know your location',
  notifications: 'show notifications',
  'clipboard-read': 'read your clipboard',
  midi: 'use MIDI devices',
  midiSysex: 'use MIDI devices',
  usb: 'connect to a USB device',
  serial: 'connect to a serial port',
  hid: 'connect to a HID device',
  bluetooth: 'use Bluetooth',
  'display-capture': 'share your screen',
  fileSystem: 'access files',
  openExternal: 'open another app',
};

export function installPermissions(ses: Session, file: string): void {
  let grants = load(file);
  const key = (origin: string, permission: string) => `${origin}|${permission}`;
  const originOf = (url: string) => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  };

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (SILENT_ALLOW.has(permission)) return callback(true);
    const origin = originOf(details.requestingUrl || wc?.getURL() || '');
    if (!ASK.has(permission)) return callback(false);
    const k = key(origin, permission);
    const remembered = grants[k];
    if (remembered) return callback(remembered === 'allow');
    const owner = BaseWindow.getAllWindows().find((w) => w.isFocused()) ?? BaseWindow.getAllWindows()[0];
    const ask = dialog.showMessageBox(owner!, {
      type: 'question',
      message: `${origin} wants to ${LABEL[permission] ?? permission}`,
      detail: 'Samo will remember your choice for this site.',
      buttons: ['Allow', 'Block'],
      defaultId: 0,
      cancelId: 1,
    });
    void ask.then(({ response }) => {
      const decision: Decision = response === 0 ? 'allow' : 'deny';
      grants = { ...grants, [k]: decision };
      save(file, grants);
      callback(decision === 'allow');
    });
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    if (SILENT_ALLOW.has(permission)) return true;
    const remembered = grants[key(requestingOrigin, permission)];
    return remembered ? remembered === 'allow' : ASK.has(permission); // 未决定的敏感项：允许「检查」，真正使用时再弹询问
  });
}

function load(file: string): Record<string, Decision> {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Persisted;
    return parsed.version === 1 && parsed.grants ? parsed.grants : {};
  } catch {
    return {};
  }
}
function save(file: string, grants: Record<string, Decision>): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ version: 1, grants } satisfies Persisted, null, 2));
}
