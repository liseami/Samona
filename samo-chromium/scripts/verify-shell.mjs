#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22（全局 fetch/WebSocket）；一个带 --remote-debugging-port=9222 跑着的 Samo Chromium
 * [OUTPUT]: 里程碑 3 验收：找到 Views 里承载的壳（browser_ui 类型的 chrome://samo target），检查 rail、真实标签快照（来自 TabStripModel）、网页洞已上报；再经 CDP 新开一个浏览器标签，确认快照推送到壳；发 tab.activate 确认命令落地；页面零错误
 * [POS]: samo-chromium 的里程碑 3 验收脚本（壳铺满整窗 + Chrome 标签接入侧栏）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const port = process.env.SAMO_CDP_PORT ?? '9222';
const base = `http://127.0.0.1:${port}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await fetch(`${base}/json`).then((r) => r.json()).catch((e) => fail(`CDP unreachable: ${e.message}`));
// pick the hosted shell: the chrome://samo target whose state actually carries tabs (others are spare/tab instances)
const candidates = targets.filter((t) => t.type !== 'page' && t.url.startsWith('chrome://samo/'));
if (!candidates.length) fail(`no Views-hosted chrome://samo target; targets: ${targets.map((t) => `${t.type} ${t.url.slice(0, 40)}`).join(' | ')}`);
let shell = candidates[0]; let best = -1;
for (const c of candidates) {
  const w = new WebSocket(c.webSocketDebuggerUrl); await new Promise((res, rej) => { w.onopen = res; w.onerror = rej; });
  const n = await new Promise((res) => { w.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id === 1) res(m.result?.result?.value ?? -1); }; w.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'window.samo.getState().then(s => s.tabs.length)', awaitPromise: true, returnByValue: true } })); });
  w.close(); if (n > best) { best = n; shell = c; }
}
const ws = new WebSocket(shell.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errors.push(`${d.text} ${d.exception?.description ?? ''}`.slice(0, 400)); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send('Runtime.enable');
const state = async () => JSON.parse(await evaluate('window.samo.getState().then(s => JSON.stringify({ tabs: s.tabs.map(t => ({ id: t.id, url: t.url.slice(0, 40), title: t.title.slice(0, 20) })), active: s.activeTabIdByIdentity["1"] }))'));
const dom = async () => evaluate("JSON.stringify({ rail: [...document.querySelectorAll('nav button')].map(b => b.textContent.trim()).filter(Boolean), sidebarRows: [...document.querySelectorAll('[data-panel=sidebar] button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 8), hasHole: !!document.querySelector('div[aria-hidden=\"true\"].h-full.w-full') })").then(JSON.parse);
const s1 = await state(); const d1 = await dom();
console.log('shell target:', shell.type, shell.url); console.log('state:', JSON.stringify(s1)); console.log('dom:', JSON.stringify(d1));
// 新开一个浏览器标签（走 Chrome 自己的标签模型），壳应收到推送
await fetch(`${base}/json/new?https://example.org/`, { method: 'PUT' });
await sleep(2000);
const s2 = await state();
console.log('after new tab:', JSON.stringify(s2));
if (s2.tabs.length !== s1.tabs.length + 1) fail(`tab count did not grow: ${s1.tabs.length} → ${s2.tabs.length}`);
// 命令落地：激活第一个标签
await evaluate(`window.samo.invoke({ type: 'tab.activate', tabId: '${s2.tabs[0].id}' })`);
await sleep(800);
const s3 = await state();
console.log('after tab.activate:', JSON.stringify({ active: s3.active }));
if (s3.active !== s2.tabs[0].id) fail(`tab.activate not applied: active=${s3.active} expected=${s2.tabs[0].id}`);
ws.close();
if (!d1.hasHole && s1.tabs.length > 0) fail('ContentHole missing although tabs exist');
if (errors.length) fail(`${errors.length} page error(s): ${errors[0]}`);
console.log('OK milestone 3: shell hosted in the window, real tabs from TabStripModel, commands round-trip');
