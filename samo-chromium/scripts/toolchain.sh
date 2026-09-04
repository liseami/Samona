#!/usr/bin/env bash
# [INPUT]: 依赖 ~/chromium/src（源码包展开的树，无 .git、无 DEPS 二进制）、depot_tools 的 cipd、网络可达 GCS
# [OUTPUT]: 补齐源码包缺的工具链：clang（tools/clang/scripts/update.py）、rust（tools/rust/update_rust.py）、gn（cipd gn/gn/mac-arm64 → buildtools/mac/gn）、node（third_party/node/update_node_binaries）、LASTCHANGE
# [POS]: samo-chromium 的源码包路线专用（git 路线由 gclient runhooks 完成同样的事）；幂等
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
cd "$CHROMIUM_SRC"
echo "[toolchain] clang"; python3 tools/clang/scripts/update.py
echo "[toolchain] rust"; python3 tools/rust/update_rust.py
if [ ! -x buildtools/mac/gn ]; then
  echo "[toolchain] gn via cipd"
  tmp=$(mktemp -d); "$DEPOT_TOOLS/cipd" ensure -root "$tmp" -ensure-file <(echo 'gn/gn/mac-arm64 latest')
  mkdir -p buildtools/mac && cp "$tmp/gn" buildtools/mac/gn && rm -rf "$tmp"
fi
if [ -x third_party/node/update_node_binaries ]; then echo "[toolchain] node"; third_party/node/update_node_binaries; fi
[ -f build/util/LASTCHANGE ] || { echo "[toolchain] LASTCHANGE"; python3 build/util/lastchange.py -o build/util/LASTCHANGE; }
echo "[toolchain] done"
