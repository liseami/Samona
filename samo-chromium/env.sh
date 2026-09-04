# [INPUT]: 无；约定 depot_tools 在 ~/depot_tools、Chromium 检出在 ~/chromium（两者都在仓库之外——几十 GB，不进 git）
# [OUTPUT]: 导出 PATH / CHROMIUM_SRC / SAMO_OUT，供 scripts/*.sh 与手工 gn/autoninja 使用（source samo-chromium/env.sh）
# [POS]: samo-chromium 的环境约定，唯一定义位置的地方
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
export DEPOT_TOOLS="${DEPOT_TOOLS:-$HOME/depot_tools}"
export CHROMIUM_ROOT="${CHROMIUM_ROOT:-$HOME/chromium}"
export CHROMIUM_SRC="$CHROMIUM_ROOT/src"
export SAMO_OUT="${SAMO_OUT:-out/Samo}"
export PATH="$DEPOT_TOOLS:$PATH"
export DEPOT_TOOLS_UPDATE=0
