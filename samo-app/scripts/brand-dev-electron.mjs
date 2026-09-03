/**
 * [INPUT]: 依赖 electron 包（解析开发态 Electron.app 路径）、build/icon.png、macOS 自带 PlistBuddy / sips / iconutil / codesign
 * [OUTPUT]: 无导出；把 node_modules 里的开发态 Electron.app 改名换图标为 Samo——Dock 悬停名、About 面板、活动监视器、系统隐私权限提示里都不再出现「Electron」；幂等（按图标 mtime 打戳），--restore 还原
 * [POS]: samo-app 的开发态品牌脚本，dev 脚本启动前自动运行；打包态由 electron-builder（productName / appId / icon）处理，与本脚本无关。
 *        为什么要改 bundle：app.setName 只改 Electron 内部名，macOS 认的是 Info.plist；dist 里的 Electron.app 本就是 ad-hoc 签名，改完重签 ad-hoc 即可
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

if (process.platform !== 'darwin') process.exit(0);

const NAME = 'Samo';
const BUNDLE_ID = 'app.samo.browser';
const require = createRequire(import.meta.url);
const bin = require('electron'); // …/Electron.app/Contents/MacOS/Electron
const app = bin.replace(/\/Contents\/MacOS\/.*$/, '');
const plist = join(app, 'Contents/Info.plist');
const backup = `${plist}.orig`;
const iconPng = join(dirname(fileURLToPath(import.meta.url)), '..', 'build', 'icon.png');

const pb = (file, cmd) => execFileSync('/usr/libexec/PlistBuddy', ['-c', cmd, file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const get = (file, key) => {
  try {
    return pb(file, `Print :${key}`);
  } catch {
    return null;
  }
};
const set = (file, key, value) => {
  try {
    pb(file, `Set :${key} "${value}"`);
  } catch {
    pb(file, `Add :${key} string "${value}"`);
  }
};
const resign = () => execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'ignore' });

if (process.argv.includes('--restore')) {
  if (existsSync(backup)) copyFileSync(backup, plist);
  resign();
  console.log('[brand] restored Electron.app');
  process.exit(0);
}

const stamp = `${NAME}@${Math.floor(statSync(iconPng).mtimeMs)}`;
if (get(plist, 'SamoBrand') === stamp) process.exit(0); // 已是 Samo

if (!existsSync(backup)) copyFileSync(plist, backup);

// ---- 图标：icon.png → iconset → 覆盖 electron.icns（文件名不动，CFBundleIconFile 仍有效） ----
const tmp = mkdtempSync(join(tmpdir(), 'samo-icon-'));
const iconset = join(tmp, 'icon.iconset');
mkdirSync(iconset);
for (const s of [16, 32, 128, 256, 512]) {
  execFileSync('sips', ['-z', String(s), String(s), iconPng, '--out', join(iconset, `icon_${s}x${s}.png`)], { stdio: 'ignore' });
  execFileSync('sips', ['-z', String(s * 2), String(s * 2), iconPng, '--out', join(iconset, `icon_${s}x${s}@2x.png`)], { stdio: 'ignore' });
}
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(app, 'Contents/Resources/electron.icns')], { stdio: 'ignore' });
rmSync(tmp, { recursive: true, force: true });

// ---- 名字与标识：主应用 + 各 Helper 的显示名（Helper 的 bundle id 不动，Chromium 靠路径找它们） ----
set(plist, 'CFBundleName', NAME);
set(plist, 'CFBundleDisplayName', NAME);
set(plist, 'CFBundleIdentifier', BUNDLE_ID);
const frameworks = join(app, 'Contents/Frameworks');
for (const entry of readdirSync(frameworks)) {
  if (!/^Electron Helper.*\.app$/.test(entry)) continue;
  const helperPlist = join(frameworks, entry, 'Contents/Info.plist');
  const helperName = basename(entry, '.app').replace(/^Electron/, NAME);
  set(helperPlist, 'CFBundleName', helperName);
  set(helperPlist, 'CFBundleDisplayName', helperName);
}
set(plist, 'SamoBrand', stamp);
resign();
console.log(`[brand] Electron.app → ${NAME} (${BUNDLE_ID})`);
