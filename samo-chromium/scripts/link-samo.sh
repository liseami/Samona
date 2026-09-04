#!/usr/bin/env bash
# [INPUT]: 依赖 ../env.sh、../src/samo（仓库内的 Samo 源码目录）、~/chromium/src
# [OUTPUT]: ~/chromium/src/samo → 仓库 samo-chromium/src/samo 的符号链接（源码在仓库里受版本控制，Chromium 树只是挂载点）
# [POS]: samo-chromium 的接入脚本，fetch 之后、build 之前跑一次
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
SRC_DIR="$(cd "$(dirname "$0")/../src/samo" && pwd)"
[ -d "$CHROMIUM_SRC" ] || { echo "[link] no checkout at $CHROMIUM_SRC (run fetch.sh)"; exit 1; }
ln -sfn "$SRC_DIR" "$CHROMIUM_SRC/samo"
echo "[link] $CHROMIUM_SRC/samo → $SRC_DIR"
