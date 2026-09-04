#!/usr/bin/env bash
# [INPUT]: 依赖 ~/chromium/src（源码包展开的树，无 .git、无 DEPS 二进制）、depot_tools 的 cipd、网络可达 GCS
# [OUTPUT]: 补齐源码包缺的工具链：clang（tools/clang/scripts/update.py）、rust（tools/rust/update_rust.py）、gn（cipd → buildtools/mac/gn）、ninja（cipd，按 DEPS 版本；源码包里的是 Linux 二进制）、node 与 ANGLE Metal 着色器缓存（deps-fetch.py 按 DEPS 从 GCS/cipd 取）、LASTCHANGE；之后 depot_tools/ensure_bootstrap
# [POS]: samo-chromium 的源码包路线专用（git 路线由 gclient runhooks 完成同样的事）；幂等
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
cd "$CHROMIUM_SRC"
echo "[toolchain] clang"; python3 tools/clang/scripts/update.py
echo "[toolchain] clang objdump package (llvm-otool/llvm-nm for the mac linker driver)"; python3 tools/clang/scripts/update.py --package=objdump
echo "[toolchain] rust"; python3 tools/rust/update_rust.py
if [ ! -x buildtools/mac/gn ]; then
  echo "[toolchain] gn via cipd"
  tmp=$(mktemp -d); "$DEPOT_TOOLS/cipd" ensure -root "$tmp" -ensure-file <(echo 'gn/gn/mac-arm64 latest')
  mkdir -p buildtools/mac && cp "$tmp/gn" buildtools/mac/gn && rm -rf "$tmp"
fi
# 源码包里的 third_party/ninja/ninja 是 Linux x86-64 二进制；按 DEPS 钉住的版本从 cipd 换成 mac-arm64
if ! third_party/ninja/ninja --version >/dev/null 2>&1; then
  echo "[toolchain] ninja via cipd"
  pkg="$(grep -o "'ninja_package': *'[^']*'" DEPS | sed "s/.*: *'\(.*\)'/\1/")mac-arm64"
  ver="$(grep -o "'ninja_version': *'[^']*'" DEPS | sed "s/.*: *'\(.*\)'/\1/")"
  tmp=$(mktemp -d); "$DEPOT_TOOLS/cipd" ensure -root "$tmp" -ensure-file <(echo "$pkg $ver")
  cp "$tmp/ninja" third_party/ninja/ninja && chmod +x third_party/ninja/ninja && rm -rf "$tmp"
fi
echo "[toolchain] DEPS binaries (node mac_arm64, angle-metal shader cache) via deps-fetch.py"
CHROMIUM_SRC="$CHROMIUM_SRC" DEPOT_TOOLS="$DEPOT_TOOLS" python3 "$(dirname "$0")/deps-fetch.py" src/third_party/node/mac_arm64 src/ui/gl/resources/angle-metal
# devtools-frontend 自带的 DEPS：esbuild（源码包里是 Linux 二进制）
DEPS_FILE="$CHROMIUM_SRC/third_party/devtools-frontend/src/DEPS" DEPS_ROOT="$CHROMIUM_SRC/third_party/devtools-frontend/src" CHROMIUM_SRC="$CHROMIUM_SRC" DEPOT_TOOLS="$DEPOT_TOOLS" python3 "$(dirname "$0")/deps-fetch.py" third_party/esbuild
[ -f build/util/LASTCHANGE ] || { echo "[toolchain] LASTCHANGE"; python3 build/util/lastchange.py -o build/util/LASTCHANGE; }
# 源码包的 node_modules 在 Linux 上装的：补 darwin-arm64 的原生绑定；gperf 也是 Linux 二进制
CHROMIUM_SRC="$CHROMIUM_SRC" DEPOT_TOOLS="$DEPOT_TOOLS" python3 "$(dirname "$0")/deps-fetch.py" src/third_party/gperf/cipd
export PATH="$CHROMIUM_SRC/third_party/node/mac_arm64/node-darwin-arm64/bin:$PATH"
rv=$(node -p "require('$CHROMIUM_SRC/third_party/devtools-frontend/src/node_modules/rollup/package.json').version")
bash "$(dirname "$0")/npm-platform-pkg.sh" "$CHROMIUM_SRC/third_party/devtools-frontend/src/node_modules" "@rollup/rollup-darwin-arm64@$rv"
"$DEPOT_TOOLS/ensure_bootstrap" >/dev/null 2>&1 || true  # depot_tools 的 python/ninja 包装需要一次 bootstrap
echo "[toolchain] done"
