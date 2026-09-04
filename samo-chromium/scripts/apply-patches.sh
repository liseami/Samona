#!/usr/bin/env bash
# [INPUT]: 依赖 ../patches/*.patch（统一 diff，a/ b/ 前缀，按文件名顺序）、~/chromium/src
# [OUTPUT]: 把 Samo 的补丁打到 Chromium 树上；git 树用 git apply --3way，源码包树用 patch -p1；已打过的跳过（--dry-run 反向可应用即视为已打）
# [POS]: samo-chromium 的补丁层——Brave 纪律：补丁尽量少、尽量小，功能放独立目录 src/samo
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
PATCHES="$(cd "$(dirname "$0")/.." && pwd)/patches"
cd "$CHROMIUM_SRC"
shopt -s nullglob
for p in "$PATCHES"/*.patch; do
  n=$(basename "$p")
  if patch -p1 -R --dry-run -s -f < "$p" >/dev/null 2>&1; then echo "[patch] already applied $n"; continue; fi
  if [ -d .git ]; then git apply --3way "$p" && echo "[patch] applied $n (git)"; else patch -p1 -N -s < "$p" && echo "[patch] applied $n"; fi
done
