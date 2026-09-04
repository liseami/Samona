#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22（全局 fetch/WebSocket）；一个带 --remote-debugging-port=9222 跑着的 Samo Chromium（scripts/run.sh）
 * [OUTPUT]: 非视觉验收：经 CDP 开 chrome://samo，检查 document.title、window.samo 桥存在、getState() 能回快照、页面无 JS 错误；退出码 0/1
 * [POS]: samo-chromium 的里程碑 2 验收脚本（壳在 fork 里跑起来）；里程碑 3 起改为检查壳是否铺满整窗
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const port = process.env.SAMO_CDP_PORT ?? '9222';
const base = `http://127.0.0.1:${port}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };

const target = await fetch(`${base}/json/new?chrome://samo/`, { method: 'PUT' }).then((r) => r.json()).catch((e) => fail(`CDP unreachable: ${e.message}`));
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errors.push(`${d.text} ${d.exception?.description ?? ''} @${d.url ?? ''}:${d.lineNumber}`.slice(0, 600)); }
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400)}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send('Runtime.enable'); await send('Log.enable');
await new Promise((r) => setTimeout(r, 1500));
const title = await evaluate('document.title');
const hasBridge = await evaluate("typeof window.samo === 'object' && typeof window.samo.getState === 'function'");
const state = hasBridge ? await evaluate('window.samo.getState().then(s => JSON.stringify(Object.keys(s)))') : null;
const rail = await evaluate("[...document.querySelectorAll('nav button')].map(b => b.textContent.trim()).filter(Boolean)");
const rootHtml = await evaluate("document.getElementById('root')?.innerHTML.slice(0, 300) ?? '(no #root)'");
const scripts = await evaluate("[...document.scripts].map(s => s.src.slice(0, 80))");
console.log(JSON.stringify({ url: target.url, title, hasBridge, stateKeys: state, rail, rootHtml, scripts, errors }, null, 1));
ws.close();
if (!hasBridge) fail('window.samo bridge missing');
if (!state) fail('getState() did not resolve');
if (errors.length) fail(`${errors.length} page error(s)`);
console.log('OK chrome://samo shell is alive in the fork');
