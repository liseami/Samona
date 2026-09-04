#!/usr/bin/env bash
# [INPUT]: 依赖 ../patches/*.patch（git format-patch 格式，按文件名顺序）、~/chromium/src
# [OUTPUT]: 把 Samo 的补丁打到当前 Chromium 检出上（git am --3way）；已打过的跳过
# [POS]: samo-chromium 的补丁层——Brave 式纪律：补丁尽量少、尽量小，功能放独立文件（samo/ 目录）而不是改上游
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
PATCHES="$(cd "$(dirname "$0")/.." && pwd)/patches"
cd "$CHROMIUM_SRC"
shopt -s nullglob
for p in "$PATCHES"/*.patch; do
  subject=$(grep -m1 '^Subject:' "$p" | sed 's/^Subject: \(\[PATCH[^]]*\] \)\?//')
  if git log --oneline -200 | grep -qF "$subject"; then echo "[patch] skip $(basename "$p")"; continue; fi
  echo "[patch] apply $(basename "$p")"; git am --3way "$p"
done
