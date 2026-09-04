#!/usr/bin/env bash
# [INPUT]: 依赖 ../branding/app.icns（由 samo-app/build/icon.png 生成，见 CLAUDE.md）、~/chromium/src
# [OUTPUT]: 把二进制品牌资源拷进树（app.icns → chrome/app/theme/chromium/mac/app.icns）；文本类品牌改动在 patches/0009
# [POS]: samo-chromium 的品牌层——补丁文件装不下二进制，所以 icns 走拷贝；apply-patches.sh 末尾调用，幂等
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
B="$(cd "$(dirname "$0")/.." && pwd)/branding"
dst="$CHROMIUM_SRC/chrome/app/theme/chromium/mac/app.icns"
[ -f "$dst.orig" ] || cp "$dst" "$dst.orig"
cmp -s "$B/app.icns" "$dst" || { cp "$B/app.icns" "$dst"; echo "[branding] app.icns → Samo"; }
