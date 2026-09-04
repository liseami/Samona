#!/usr/bin/env node
/**
 * [INPUT]: 依赖 Node ≥ 22；一个带 --remote-debugging-port=9222 跑着的 Samo
 * [OUTPUT]: 弹层验收：壳发 palette.open → 出现 chrome://samo-overlay 的气泡 target（有输入框、有尺寸）→ 弹层发 palette.close → target 消失；
 *           写入 mock 会话后 userMenu.open → 气泡里有 Log out；零页面错误
 * [POS]: samo-chromium 的弹层（WebUI 气泡）验收脚本
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const base = `http://127.0.0.1:${process.env.SAMO_CDP_PORT ?? '9222'}`;
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = () => fetch(`${base}/json`).then((r) => r.json());
async function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
  return { evaluate, errors, close: () => ws.close() };
}
const shellT = (await targets()).find((t) => t.type !== 'page' && t.url.startsWith('chrome://samo/'));
if (!shellT) fail('no shell target');
const shell = await attach(shellT);
// 1) 命令面板
await shell.evaluate("window.samo.invoke({ type: 'palette.open', mode: 'newTab' })");
await sleep(2000);
let ov = (await targets()).find((t) => t.url.startsWith('chrome://samo-overlay'));
if (!ov) fail(`overlay target did not appear: ${(await targets()).map((t) => t.url.slice(0, 40)).join(' | ')}`);
const o = await attach(ov);
const info = await o.evaluate("JSON.stringify({ hasInput: !!document.querySelector('input'), w: Math.round(document.body.getBoundingClientRect().width), h: Math.round(document.body.getBoundingClientRect().height), host: window.samo.host })");
console.log('palette overlay:', ov.url.slice(0, 70), info);
const pi = JSON.parse(info); if (!pi.hasInput || pi.w < 200) fail('palette not rendered in the bubble');
console.log('palette.close →', await o.evaluate("window.samo.invoke({ type: 'palette.close' }).then((r) => JSON.stringify(r))"));
await sleep(1200);
// 气泡关闭后 WebUIBubbleManager 可能缓存 WebContents（target 仍在），以文档可见性判断
const stillOpen = (await targets()).some((t) => t.url.startsWith('chrome://samo-overlay'));
const vis = stillOpen ? await o.evaluate('document.visibilityState').catch(() => 'gone') : 'gone';
console.log('overlay after close: target', stillOpen ? 'cached' : 'gone', '| visibility', vis);
if (stillOpen && vis === 'visible') fail('overlay did not close on palette.close');
// 2) 用户菜单（先写 mock 会话）
await shell.evaluate("window.samo.invoke({ type: 'userMenu.open', left: 8, bottom: 60, session: { id: 'mock', nickname: 'Samo', email: 'samo@samo.app', avatarUrl: null, tier: 'free', credits: 0 } })");
await sleep(2000);
ov = (await targets()).find((t) => t.url.startsWith('chrome://samo-overlay'));
if (!ov) fail('user menu overlay did not appear');
const u = await attach(ov);
const menu = await u.evaluate("JSON.stringify({ hasLogout: document.body.innerText.includes('Log out'), h: Math.round(document.body.getBoundingClientRect().height) })");
console.log('user menu overlay:', menu);
console.log('menu close →', await u.evaluate("window.samo.invoke({ type: 'palette.close' }).then((r) => JSON.stringify(r))"));
await sleep(1000);
const errs = [...shell.errors, ...o.errors, ...u.errors];
shell.close(); o.close(); u.close();
if (!JSON.parse(menu).hasLogout) fail('user menu not rendered');
if (errs.length) fail(`page errors: ${errs[0]}`);
console.log('OK overlays: palette + user menu live in WebUI bubbles');
