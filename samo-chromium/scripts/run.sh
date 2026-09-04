#!/usr/bin/env bash
# [INPUT]: 依赖 build.sh 的产物；../env.sh
# [OUTPUT]: 以独立 user-data-dir 启动我们构建的 Chromium，开 CDP 端口 9222（samo-browser / agent 网关直接接 CDP）
# [POS]: samo-chromium 的运行入口
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
exec "$CHROMIUM_SRC/$SAMO_OUT/Chromium.app/Contents/MacOS/Chromium" \
  --user-data-dir="$HOME/Library/Application Support/SamoChromium" \
  --remote-debugging-port=9222 "$@"
