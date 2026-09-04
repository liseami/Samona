#!/usr/bin/env bash
# [INPUT]: 依赖 git、网络可达 chromium.googlesource.com 与 commondatastorage.googleapis.com；../env.sh
# [OUTPUT]: ~/depot_tools 与 ~/chromium/src（无历史的浅检出，之后 git fetch --unshallow 可补全以便 rebase）+ gclient runhooks 拉齐工具链
# [POS]: samo-chromium 的第一步：拿到可构建的 Chromium 源码。幂等：已有检出则只 sync
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
# 全局 git 走 socks 代理（Clash）时，Chromium 的浅克隆会在服务端打包的几分钟静默期被代理掐断、反复重试；
# 这里对本次拉取禁用 git 代理直连 googlesource（直连可达，实测 0.5MB/s；代理更快但会断）。想改回代理：SAMO_FETCH_PROXY=1
if [ "${SAMO_FETCH_PROXY:-0}" != "1" ]; then
  export GIT_CONFIG_COUNT=3
  export GIT_CONFIG_KEY_0=http.proxy GIT_CONFIG_VALUE_0=
  export GIT_CONFIG_KEY_1=https.proxy GIT_CONFIG_VALUE_1=
  export GIT_CONFIG_KEY_2=http.lowSpeedLimit GIT_CONFIG_VALUE_2=0
fi
if [ ! -x "$DEPOT_TOOLS/fetch" ]; then
  git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS"
fi
mkdir -p "$CHROMIUM_ROOT"
cd "$CHROMIUM_ROOT"
# fetch 只在空目录里能跑：它写下 .gclient 后就交给 gclient sync；失败重来时 .gclient 已在，直接 sync
if [ ! -f .gclient ]; then
  echo "[fetch] fetch --nohooks --no-history chromium  ($(date))"
  fetch --nohooks --no-history chromium
else
  echo "[fetch] .gclient present, gclient sync --nohooks --no-history ($(date))"
  gclient sync --nohooks --no-history -D
fi
echo "[fetch] runhooks ($(date))"
gclient runhooks
echo "[fetch] done ($(date))"
