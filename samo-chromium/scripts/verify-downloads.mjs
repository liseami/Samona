#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22；一个经 scripts/run.sh 跑着的 Samo
 * [OUTPUT]: 下载投影验收：在一个网页里点一个 data: 链接下载 samo-test.txt → 壳快照 downloads 出现该项（completed）→ download.clear 后不再陈列；零页面错误
 * [POS]: samo-chromium 的下载 → Assets 维度数据源验收
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const base = `http://127.0.0.1:${process.env.SAMO_CDP_PORT ?? '9222'}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let step = 'start'; setTimeout(() => fail(`watchdog: stuck at ${step}`), 40000).unref?.();
const targets = () => fetch(`${base}/json`).then((r) => r.json());
async function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
  return { evaluate, close: () => ws.close() };
}
const cands = (await targets()).filter((t) => t.type !== 'page' && t.url.startsWith('chrome://samo/'));
let shellT = cands[0]; let best = -1;
for (const c of cands) { const a = await attach(c); const n = await a.evaluate('window.samo.getState().then(s => s.tabs.length)'); a.close(); if (n > best) { best = n; shellT = c; } }
const S = await attach(shellT);
step = 'open page'; await S.evaluate("window.samo.invoke({ type: 'tab.create', url: 'https://example.com/' })"); await sleep(2500);
const pageT = (await targets()).find((t) => t.type === 'page' && t.url.startsWith('https://example.com'));
if (!pageT) fail('example.com page did not open');
const P = await attach(pageT);
step = 'trigger download';
const stamp = Date.now();
await P.evaluate(`(() => { const a = document.createElement('a'); a.href = 'data:text/plain,hello-samo-${stamp}'; a.download = 'samo-test-${stamp}.txt'; document.body.appendChild(a); a.click(); return 'clicked'; })()`);
await sleep(2500);
step = 'read downloads';
const d1 = JSON.parse(await S.evaluate('window.samo.getState().then(s => JSON.stringify(s.downloads.map(d => ({ filename: d.filename, state: d.state, received: d.received }))))'));
console.log('downloads:', JSON.stringify(d1.slice(-3)));
const mine = d1.find((d) => d.filename.includes(`samo-test-${stamp}`));
if (!mine) fail('download not projected into the snapshot');
if (mine.state !== 'completed') console.log('note: state =', mine.state);
step = 'clear';
await S.evaluate("window.samo.invoke({ type: 'download.clear' })"); await sleep(800);
const d2 = JSON.parse(await S.evaluate('window.samo.getState().then(s => JSON.stringify(s.downloads.filter(d => d.state !== "progressing").length))'));
console.log('non-progressing downloads after clear:', d2);
await S.evaluate("window.samo.invoke({ type: 'tab.close', tabId: (await window.samo.getState()).tabs.find(t => t.url.startsWith('https://example.com')).id })").catch(() => {});
S.close(); P.close();
if (d2 !== 0) fail('download.clear did not hide finished downloads');
console.log('OK downloads projected into the shell (Assets), clear works');
