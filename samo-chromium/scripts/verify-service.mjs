#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22；一个经 scripts/run.sh（带 --samo-service）跑着的 Samo
 * [OUTPUT]: 服务进程验收：getChat 来自服务（有 provider 字段与线程）、getState.apps 有扫描结果、module.activate 改变 layout.module、chat.newThread 后线程数 +1；零页面错误
 * [POS]: samo-chromium 的 Samo 服务进程（对话 / 应用 / 工作区）验收脚本
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const base = `http://127.0.0.1:${process.env.SAMO_CDP_PORT ?? '9222'}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let step = 'start'; setTimeout(() => fail(`watchdog: stuck at ${step}`), 25000).unref?.();
const targets = await fetch(`${base}/json`).then((r) => r.json()).catch((e) => fail(`CDP unreachable: ${e.message}`));
const candidates = targets.filter((t) => t.type !== 'page' && t.url.startsWith('chrome://samo/'));
if (!candidates.length) fail('no shell target');
async function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300)); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
  return { evaluate, errors, close: () => ws.close() };
}
let shell = null; let best = -1;
for (const c of candidates) { const a = await attach(c); const n = await a.evaluate('window.samo.getState().then(s => s.tabs.length)'); a.close(); if (n > best) { best = n; shell = c; } }
const s = await attach(shell);
step = 'getChat'; const chat1 = JSON.parse(await s.evaluate('window.samo.getChat().then(c => JSON.stringify({ provider: c.provider, needsKey: c.needsKey, threads: c.threads.length, mode: c.mode }))'));
step = 'getState'; const st1 = JSON.parse(await s.evaluate('window.samo.getState().then(x => JSON.stringify({ apps: x.apps.length, appNames: x.apps.slice(0, 3).map(a => a.name), workspaces: x.workspaces.length, module: x.layout.module }))'));
console.log('chat:', JSON.stringify(chat1)); console.log('state:', JSON.stringify(st1));
if (!chat1.provider || chat1.provider === 'stub') fail('chat snapshot did not come from the service');
step = 'module.activate'; await s.evaluate("window.samo.invoke({ type: 'module.activate', module: 'apps' })"); await sleep(600);
const mod = await s.evaluate('window.samo.getState().then(x => x.layout.module)');
console.log('module after activate:', mod); if (mod !== 'apps') fail('module.activate not reflected');
step = 'chat.newThread'; await s.evaluate("window.samo.invoke({ type: 'chat.newThread' })"); await sleep(1200);
const chat2 = JSON.parse(await s.evaluate('window.samo.getChat().then(c => JSON.stringify({ threads: c.threads.length }))'));
console.log('threads after newThread:', chat2.threads); if (chat2.threads !== chat1.threads + 1) fail('chat.newThread did not reach the service');
await s.evaluate("window.samo.invoke({ type: 'module.activate', module: 'browser' })");
const errs = s.errors; s.close();
if (errs.length) fail(`page errors: ${errs[0]}`);
console.log(`OK service: chat provider=${chat1.provider}, apps=${st1.apps}, commands round-trip`);
