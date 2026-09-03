/**
 * [INPUT]: 依赖 node:fs/path/url，依赖已安装的 ego-browser-v2 包（dist/out/ego-browser 里的 skill 工作区）
 * [OUTPUT]: 生成 ../workspace/：learnings/ 与 references/ 从上游复制，agent_helpers.js 由本脚本重写为对 npm 包的 bare import
 * [POS]: samo-agent 的构建脚本；上游 npm 包里的 agent_helpers.js 用的是 ego lite app 内部的相对路径（在 npm 布局下断裂），此处修正，其余原样复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// npm 包的 exports 只开放 ./dist/src/*，故从 run.js 反推包根（dist/src/run.js → 上三级）
const pkgDir = dirname(dirname(dirname(require.resolve('ego-browser-v2/dist/src/run.js'))));
const upstream = join(pkgDir, 'dist', 'out', 'ego-browser');
const workspace = join(here, '..', 'workspace');

rmSync(workspace, { recursive: true, force: true });
mkdirSync(workspace, { recursive: true });
for (const entry of ['learnings', 'references', 'SKILL.md']) {
  const src = join(upstream, entry);
  if (existsSync(src)) cpSync(src, join(workspace, entry), { recursive: true });
}
writeFileSync(
  join(workspace, 'agent_helpers.js'),
  [
    '// 由 scripts/sync-workspace.mjs 生成：把 ego-browser 的全部 helper 以裸名暴露给 heredoc 脚本',
    "export * from 'ego-browser-v2/dist/src/helpers.js';",
    '',
  ].join('\n'),
);
console.log(`[samo-agent] workspace synced from ${upstream}`);
