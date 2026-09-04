#!/usr/bin/env bash
# [INPUT]: 依赖 build.sh 的产物；../env.sh
# [OUTPUT]: 以独立 user-data-dir 启动我们构建的浏览器（Samo.app），带上 Samo 服务进程（--samo-service 指向 packages/samo-service/dist/index.js，--samo-node 用树里的 mac node），开 CDP 端口 9222（samo-browser / agent 网关直接接 CDP）
# [POS]: samo-chromium 的运行入口
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
APP=$(ls -d "$CHROMIUM_SRC/$SAMO_OUT"/*.app | grep -v Helper | head -1); BIN="$APP/Contents/MacOS/$(basename "$APP" .app)"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$BIN" \
  --samo-service="$REPO/packages/samo-service/dist/index.js" \
  --samo-node="$CHROMIUM_SRC/third_party/node/mac_arm64/node-darwin-arm64/bin/node" \
  --user-data-dir="$HOME/Library/Application Support/SamoChromium" \
  --remote-debugging-port=9222 "$@"
