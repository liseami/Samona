#!/usr/bin/env bash
# [INPUT]: 依赖 git、网络可达 chromium.googlesource.com 与 commondatastorage.googleapis.com；../env.sh
# [OUTPUT]: ~/depot_tools 与 ~/chromium/src（无历史的浅检出，之后 git fetch --unshallow 可补全以便 rebase）+ gclient runhooks 拉齐工具链
# [POS]: samo-chromium 的第一步：拿到可构建的 Chromium 源码。幂等：已有检出则只 sync
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
if [ ! -x "$DEPOT_TOOLS/fetch" ]; then
  git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS"
fi
mkdir -p "$CHROMIUM_ROOT"
cd "$CHROMIUM_ROOT"
if [ ! -d src/.git ]; then
  echo "[fetch] fetch --nohooks --no-history chromium  ($(date))"
  fetch --nohooks --no-history chromium
else
  echo "[fetch] existing checkout, gclient sync ($(date))"
  gclient sync --nohooks --no-history
fi
echo "[fetch] runhooks ($(date))"
gclient runhooks
echo "[fetch] done ($(date))"
