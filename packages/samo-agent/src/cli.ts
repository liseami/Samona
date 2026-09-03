#!/usr/bin/env node
/**
 * [INPUT]: 依赖 ./host 的 connectHost/GatewayUnavailable，依赖 ego-browser-v2 的 dist/src/run.js（runMain）与本包 build 生成的 workspace/
 * [OUTPUT]: 可执行入口 samo-browser：stdin 读入 JS，连上 Samo，注入 globalThis.ego，交给 ego-browser 运行时执行
 * [POS]: samo-agent 的命令行外壳，等价于 ego lite 自带的 `ego-browser nodejs` 二进制；不实现任何 helper，全部复用 ego-browser-v2
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectHost, GatewayUnavailable } from './host.js';

type RunMain = (options?: { argv?: string[] }) => Promise<number>;

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv[0] === 'nodejs') argv.shift(); // 兼容 ego 的 `ego-browser nodejs <<'EOF'` 写法

  // ---- 定位 ego-browser-v2 的运行时；skill 工作区（learnings / agent_helpers.js）用本包 build 时生成的 workspace/ ----
  const runUrl = import.meta.resolve('ego-browser-v2/dist/src/run.js');
  const here = dirname(fileURLToPath(import.meta.url));
  process.env.EGO_BROWSER_AGENT_WORKSPACE ??= join(here, '..', 'workspace');
  process.env.EGO_BROWSER_NAME ??= 'samo';

  if (argv[0] === '-h' || argv[0] === '--help' || argv[0] === '--doctor') {
    const { runMain } = (await import(runUrl)) as { runMain: RunMain };
    return runMain({ argv });
  }

  const host = await connectHost();
  (globalThis as { ego?: unknown }).ego = host;
  try {
    const { runMain } = (await import(runUrl)) as { runMain: RunMain };
    return await runMain({ argv });
  } finally {
    host.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    if (err instanceof GatewayUnavailable) console.error(err.message);
    else console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exitCode = 1;
  });
