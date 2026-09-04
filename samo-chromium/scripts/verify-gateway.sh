#!/usr/bin/env bash
# [INPUT]: 依赖跑着的 Samo（scripts/run.sh：带 --remote-debugging-port 与 --samo-service）、仓库根的 `bun run samo-browser`、Node ≥ 22
# [OUTPUT]: agent 网关验收：samo-browser 经 fork 里服务进程的网关（指针在 profile/samo/agent-gateway.json）建任务空间、开标签、读标题与 h1；再经 CDP 查壳的快照——出现 agent 身份、标签归属该空间
# [POS]: samo-chromium 的 agent 网关（CDP 后端）验收脚本
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
cd "$(dirname "$0")/../.."
export SAMO_GATEWAY_FILE="${SAMO_GATEWAY_FILE:-$HOME/Library/Application Support/SamoChromium/Default/samo/agent-gateway.json}"
[ -f "$SAMO_GATEWAY_FILE" ] || { echo "FAIL no gateway pointer at $SAMO_GATEWAY_FILE"; exit 1; }
out=$(bun run samo-browser <<'JS' 2>&1 | grep -v "^    at "
const space = await taskSpaces.useOrCreate('gateway-verify')
await browser.openOrReuseTab('https://example.com/', { wait: true })
await page.waitForTimeout(600)
console.log('AGENT title=' + (await page.title()) + ' h1=' + (await page.evaluate(() => document.querySelector('h1')?.textContent)) + ' space=' + space.id)
JS
)
echo "$out" | grep "^AGENT" || { echo "$out" | tail -5; echo "FAIL agent could not drive the fork"; exit 1; }
N=${SAMO_NODE:-$HOME/chromium/src/third_party/node/mac_arm64/node-darwin-arm64/bin/node}
"$N" -e '
const base="http://127.0.0.1:"+(process.env.SAMO_CDP_PORT??"9222"); const ts=await fetch(base+"/json").then(r=>r.json()); const cands=ts.filter(t=>t.type!=="page"&&t.url.startsWith("chrome://samo/"));
let best=null,bn=-1; for(const t of cands){const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r); const n=await new Promise(res=>{ws.onmessage=ev=>{const m=JSON.parse(ev.data); if(m.id===1) res(m.result?.result?.value??-1)}; ws.send(JSON.stringify({id:1,method:"Runtime.evaluate",params:{expression:"window.samo.getState().then(s=>s.tabs.length)",awaitPromise:true,returnByValue:true}}))}); ws.close(); if(n>bn){bn=n;best=t}}
const ws=new WebSocket(best.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
const v=await new Promise(res=>{ws.onmessage=ev=>{const m=JSON.parse(ev.data); if(m.id===1) res(m.result?.result?.value)}; ws.send(JSON.stringify({id:1,method:"Runtime.evaluate",params:{expression:"window.samo.getState().then(s=>JSON.stringify({identities:s.identities.map(i=>i.name+\"/\"+i.ownership), agentTabs:s.tabs.filter(t=>t.identityId!==1).map(t=>t.url.slice(0,30)), userActive:s.activeTabIdByIdentity[\"1\"]}))",awaitPromise:true,returnByValue:true}}))}); ws.close();
console.log("SHELL", v); const j=JSON.parse(v); if(!j.identities.some(i=>i.startsWith("gateway-verify"))||j.agentTabs.length<1){console.error("FAIL shell does not show the agent task space"); process.exit(1)}'
echo "OK gateway: agent drives the fork through the service; shell shows the task space"
