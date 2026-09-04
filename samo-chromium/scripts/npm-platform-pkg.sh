#!/usr/bin/env bash
# [INPUT]: 依赖 mac 版 node/npm（third_party/node/mac_arm64）、npm registry；参数：<node_modules 目录> <包名>@<版本>
# [OUTPUT]: 把某个平台专属的 npm 包（如 @rollup/rollup-darwin-arm64）放进已有的 node_modules——用 npm pack 取包再展开，不动 package.json / lockfile
# [POS]: samo-chromium 源码包路线的补丁工具：源码包的 node_modules 是在 Linux 上装的，只带 linux-x64 的原生绑定
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
set -euo pipefail
dir="$1"; spec="$2"; name="${spec%@*}"
[ -d "$dir/$name" ] && { echo "[npm] have $name"; exit 0; }
tmp=$(mktemp -d); cd "$tmp"
npm pack "$spec" --silent >/dev/null 2>&1
tar -xzf ./*.tgz
mkdir -p "$dir/$(dirname "$name")" && mv package "$dir/$name"
cd / && rm -rf "$tmp"
echo "[npm] installed $spec → $dir/$name"
