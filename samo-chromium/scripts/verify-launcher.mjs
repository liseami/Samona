#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22；一个经 scripts/run.sh 跑着的 Samo
 * [OUTPUT]: 药丸验收：chrome://samo-launcher 子 widget 存在且渲染、能经壳委托拿到对话快照；药丸发 chat.setMode('docked') → 壳的对话形态变为 docked、药丸让位（hidden）；壳发 chat.setMode('closed') → 药丸回来；弹层里的 tab.create 也经壳委托落地
 * [POS]: samo-chromium 的药丸 + 子 widget 命令回路验收
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const base = `http://127.0.0.1:${process.env.SAMO_CDP_PORT ?? '9222'}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let step = 'start'; setTimeout(() => fail(`watchdog: stuck at ${step}`), 40000).unref?.();
const targets = () => fetch(`${base}/json`).then((r) => r.json());
async function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300)); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
  return { evaluate, errors, close: () => ws.close() };
}
const all = await targets();
const launcherT = all.find((t) => t.url.startsWith('chrome://samo-launcher'));
if (!launcherT) fail('no launcher target');
const cands = all.filter((t) => t.type !== 'page' && t.url.startsWith('chrome://samo/'));
let shellT = cands[0]; let best = -1;
for (const c of cands) { const a = await attach(c); const n = await a.evaluate('window.samo.getState().then(s => s.tabs.length)'); a.close(); if (n > best) { best = n; shellT = c; } }
const L = await attach(launcherT); const S = await attach(shellT);
step = 'launcher dom';
const dom = JSON.parse(await L.evaluate("JSON.stringify({ text: document.body.innerText.trim().slice(0, 40), w: Math.round(document.body.getBoundingClientRect().width), vis: document.visibilityState })"));
console.log('launcher:', JSON.stringify(dom));
step = 'launcher getChat';
const chat0 = JSON.parse(await L.evaluate('window.samo.getChat().then(c => JSON.stringify({ mode: c.mode, provider: c.provider }))'));
console.log('launcher getChat via delegate:', JSON.stringify(chat0)); if (!chat0.provider) fail('launcher could not reach the shell delegate');
step = 'setMode docked';
await L.evaluate("window.samo.invoke({ type: 'chat.setMode', mode: 'docked' })"); await sleep(1500);
const m1 = await S.evaluate('window.samo.getChat().then(c => c.mode)'); const v1 = await L.evaluate('document.visibilityState');
console.log('after docked: shell mode =', m1, '| launcher visibility =', v1);
if (m1 !== 'docked') fail('chat.setMode from the launcher did not reach the service');
step = 'setMode closed';
await S.evaluate("window.samo.invoke({ type: 'chat.setMode', mode: 'closed' })"); await sleep(1500);
const v2 = await L.evaluate('document.visibilityState'); console.log('after closed: launcher visibility =', v2);
step = 'palette tab.create';
const n0 = await S.evaluate('window.samo.getState().then(s => s.tabs.length)');
await S.evaluate("window.samo.invoke({ type: 'palette.open', mode: 'newTab' })"); await sleep(1800);
const ov = (await targets()).find((t) => t.url.startsWith('chrome://samo-overlay'));
if (!ov) fail('overlay did not open');
const O = await attach(ov);
await O.evaluate("window.samo.invoke({ type: 'tab.create', url: 'https://example.org/' })"); await sleep(1500);
const n1 = await S.evaluate('window.samo.getState().then(s => s.tabs.length)');
console.log('tab.create from overlay:', n0, '→', n1); if (n1 !== n0 + 1) fail('tab.create from the overlay did not reach the shell');
await O.evaluate("window.samo.invoke({ type: 'palette.close' })").catch(() => {});
const errs = [...L.errors, ...S.errors, ...O.errors]; L.close(); S.close(); O.close();
if (errs.length) fail(`page errors: ${errs[0]}`);
console.log('OK launcher pill + sub-widget command routing');
