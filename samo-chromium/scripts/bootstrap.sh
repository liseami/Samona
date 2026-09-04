#!/usr/bin/env bash
# [INPUT]: 依赖同目录 fetch.sh / link-samo.sh / apply-patches.sh / build.sh；../env.sh
# [OUTPUT]: 无人值守地把四步串起来：拉源码 → 挂 src/samo → 打补丁 → 构建；日志分别在 ~/chromium/{fetch,build}.log
# [POS]: samo-chromium 的一键入口（首次要数小时：拉取 1–2 小时 + 构建 4–8 小时）；单步失败即停
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
source "$here/../env.sh"
mkdir -p "$CHROMIUM_ROOT"
if [ "${SAMO_SKIP_FETCH:-0}" != "1" ]; then bash "$here/fetch.sh" 2>&1 | tee -a "$CHROMIUM_ROOT/fetch.log"; fi
bash "$here/link-samo.sh"
bash "$here/apply-patches.sh"
bash "$here/build.sh" 2>&1 | tee -a "$CHROMIUM_ROOT/build.log"
