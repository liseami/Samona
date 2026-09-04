#!/usr/bin/env bash
# [INPUT]: 依赖 git、curl、网络；../env.sh（CHROMIUM_ROOT、CHROMIUM_VERSION）
# [OUTPUT]: ~/chromium/src——真正的 git 检出（模式 git：GitHub 官方镜像浅克隆到版本 tag → 远端切回 googlesource → gclient sync 拉 DEPS 依赖并 runhooks）
#           或 官方源码包展开（模式 tarball：chromium-<ver>.tar.xz，含全部 third_party，之后由 toolchain.sh 补工具链）
# [POS]: samo-chromium 的第一步。为什么两条路：googlesource 对 chromium/src 的浅克隆要在服务端打包几分钟静默，经隧道（用户的 Clash TUN）必被掐断；
#        GitHub 镜像的浅包是缓存好的，源码包是普通 HTTPS 可续传。SAMO_FETCH_MODE=git|tarball（默认 git，失败退到 tarball）
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
source "$(dirname "$0")/../env.sh"
mode="${SAMO_FETCH_MODE:-git}"
V="$CHROMIUM_VERSION"
mkdir -p "$CHROMIUM_ROOT"
cd "$CHROMIUM_ROOT"
if [ ! -x "$DEPOT_TOOLS/gclient" ]; then
  git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS"
fi
# 本次拉取不经 git 的 socks 代理（隧道会掐断长连接；系统级 TUN 仍在，但 git 自身不再多套一层）
export GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=http.proxy GIT_CONFIG_VALUE_0= GIT_CONFIG_KEY_1=https.proxy GIT_CONFIG_VALUE_1=

fetch_git() {
  if [ ! -d src/.git ]; then
    echo "[fetch] git: shallow clone github.com/chromium/chromium @ $V ($(date))"
    git clone --depth=1 --branch "$V" https://github.com/chromium/chromium.git src
    git -C src remote set-url origin https://chromium.googlesource.com/chromium/src.git
  fi
  [ -f .gclient ] || cat > .gclient <<'G'
solutions = [
  { "name": "src", "url": "https://chromium.googlesource.com/chromium/src.git", "custom_deps": {}, "custom_vars": {} },
]
G
  echo "[fetch] gclient sync (DEPS 依赖，浅) ($(date))"
  gclient sync --nohooks --no-history -D --revision "src@$V"
  echo "[fetch] runhooks ($(date))"
  gclient runhooks
}

fetch_tarball() {
  local tar="tarball/chromium-$V.tar.xz"
  mkdir -p tarball
  echo "[fetch] tarball: chromium-$V.tar.xz ($(date))"
  curl -L -C - --retry 20 --retry-delay 5 --retry-all-errors -sS -o "$tar" "https://commondatastorage.googleapis.com/chromium-browser-official/chromium-$V.tar.xz"
  if [ ! -d src ]; then
    echo "[fetch] extracting ($(date))"
    mkdir -p src && tar -xJf "$tar" -C src --strip-components=1
  fi
  bash "$(dirname "$0")/toolchain.sh"
}

case "$mode" in
  git) fetch_git || { echo "[fetch] git mode failed, falling back to tarball"; rm -rf src _bad_scm; fetch_tarball; } ;;
  tarball) fetch_tarball ;;
  *) echo "unknown SAMO_FETCH_MODE=$mode"; exit 1 ;;
esac
echo "[fetch] done ($(date))"
