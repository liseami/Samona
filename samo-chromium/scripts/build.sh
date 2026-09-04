#!/usr/bin/env bash
# [INPUT]: 依赖 fetch.sh 完成后的 ~/chromium/src、../args.gn、depot_tools 的 gn/autoninja；磁盘 ≥ 120GB 空闲
# [OUTPUT]: ~/chromium/src/out/Samo/Chromium.app（component 构建；首次 4–8 小时，之后增量分钟级）
# [POS]: samo-chromium 的第二步：构建。先 apply-patches.sh 再来；参数变了重跑 gn gen
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
ARGS="$(cd "$(dirname "$0")/.." && pwd)/args.gn"
free_gb=$(df -g "$HOME" | awk 'NR==2{print $4}')
[ "$free_gb" -ge 120 ] || { echo "[build] need ≥120GB free, have ${free_gb}GB"; exit 1; }
cd "$CHROMIUM_SRC"
mkdir -p "$SAMO_OUT"
grep -v '^#' "$ARGS" > "$SAMO_OUT/args.gn"
gn gen "$SAMO_OUT"
echo "[build] autoninja chrome ($(date))"
nice -n 10 autoninja -C "$SAMO_OUT" chrome
echo "[build] done ($(date)) → $CHROMIUM_SRC/$SAMO_OUT/Chromium.app"
