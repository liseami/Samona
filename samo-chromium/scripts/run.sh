#!/usr/bin/env bash
# [INPUT]: 依赖 build.sh 的产物；../env.sh
# [OUTPUT]: 以独立 user-data-dir 启动我们构建的浏览器（品牌补丁后产物叫 Samo.app，按通配找），开 CDP 端口 9222（samo-browser / agent 网关直接接 CDP）
# [POS]: samo-chromium 的运行入口
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
APP=$(ls -d "$CHROMIUM_SRC/$SAMO_OUT"/*.app | head -1); BIN="$APP/Contents/MacOS/$(basename "$APP" .app)"
exec "$BIN" \
  --user-data-dir="$HOME/Library/Application Support/SamoChromium" \
  --remote-debugging-port=9222 "$@"
