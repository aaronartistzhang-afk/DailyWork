#!/bin/bash
# fleet_estimate.sh — quote-gate estimator for large agent orchestrations (agent-fleet-guard)
# ===========================================================================
# 纯算术，无副作用、无网络、不落盘。给「要不要先向用户报价」一个确定性判据，
# 并把「粗估」与「×校正系数后」两个数一起打给用户看（两数均非上限）。
#
# 判定：
#   粗估   = agents × per
#   校正   = 粗估 × factor      （对每代理粗估做保守放大；实测欠估约 3 倍且是下限）
#   QUOTE_REQUIRED（退出码 10）当：agents ≥ 阈值代理数（代理数不校正）
#                                 或 校正 ≥ 阈值 token（token 比的是校正值，保守）
#   两阈值都是 ≥ 含边界（恰 20 代理 / 恰 100 万校正 都算需报价）。
#   否则 OK（退出码 0）。
#
# 飞行中止损（护栏③）：--spent S 时，锚点是「已批准数」——
#   优先 --approved A（用户点头/砍价后的那个数）；未给则用校正值 Y。
#   S 超过锚点 → over_budget=true，提示按护栏③停下重新报价。
#
# 用法：
#   fleet_estimate.sh --agents N --per K [--factor 3] \
#       [--threshold-agents 20] [--threshold-tokens 1000000] \
#       [--approved A] [--spent S] [--json]
# 退出码：0 无需报价 / 10 需报价 / 2 入参错误。
# ===========================================================================

AGENTS=""; PER=""; FACTOR="3"; TA="20"; TT="1000000"; APPROVED=""; SPENT=""; JSON=0

die() { printf 'fleet_estimate: %s\n' "$1" >&2; exit 2; }
# 非负整数校验（纯数字，允许 0；拒负数/小数/非数）
is_uint() { case "$1" in ''|*[!0-9]*) return 1 ;; 0) return 0 ;; 0*) return 1 ;; *) return 0 ;; esac; }  # 拒前导零（08 会被当八进制，fail-open）
# 正的数字（含小数，用于 factor）
is_pos_num() { printf '%s' "$1" | awk '{exit !($0+0 > 0 && $0 ~ /^[0-9]+(\.[0-9]+)?$/)}'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --agents) shift; AGENTS="${1:-}" ;;
    --per) shift; PER="${1:-}" ;;
    --factor) shift; FACTOR="${1:-}" ;;
    --threshold-agents) shift; TA="${1:-}" ;;
    --threshold-tokens) shift; TT="${1:-}" ;;
    --approved) shift; APPROVED="${1:-}" ;;
    --spent) shift; SPENT="${1:-}" ;;
    --json) JSON=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) die "未知参数 $1" ;;
  esac
  shift
done

is_uint "$AGENTS" || die "--agents 需非负整数（收到 '${AGENTS}'）"
is_uint "$PER"    || die "--per 需非负整数（收到 '${PER}'）"
is_uint "$TA"     || die "--threshold-agents 需非负整数"
is_uint "$TT"     || die "--threshold-tokens 需非负整数"
is_pos_num "$FACTOR" || die "--factor 需正数（收到 '${FACTOR}'）"
# 校正不能让估计更乐观
awk -v f="$FACTOR" 'BEGIN{exit !(f+0 >= 1)}' || die "--factor 不能 < 1（校正只放大不缩小，收到 ${FACTOR}）"
[ -n "$APPROVED" ] && { is_uint "$APPROVED" || die "--approved 需非负整数"; }
[ -n "$SPENT" ]    && { is_uint "$SPENT" || die "--spent 需非负整数"; }

ROUGH=$((AGENTS * PER))
# 校正值 = 粗估 × factor（factor 可为小数，用 awk 取整）
CORR=$(awk -v r="$ROUGH" -v f="$FACTOR" 'BEGIN{printf "%d", r*f}')

# 判定
REQ=0; REASON="none"
if [ "$AGENTS" -ge "$TA" ]; then REQ=1; REASON="agents"; fi
if [ "$CORR" -ge "$TT" ]; then REQ=1; [ "$REASON" = "agents" ] && REASON="agents+tokens" || REASON="tokens"; fi

# 飞行止损（锚已批准数 A，未给则校正值 Y）
ANCHOR="$CORR"; ANCHOR_SRC="校正值Y"
[ -n "$APPROVED" ] && { ANCHOR="$APPROVED"; ANCHOR_SRC="已批准数"; }
OVER="false"; RATIO=""
if [ -n "$SPENT" ]; then
  # 比例 = spent / 锚点；锚点为 0 时不算比例（除零守卫）
  if [ "$ANCHOR" -gt 0 ] 2>/dev/null; then
    RATIO=$(awk -v s="$SPENT" -v a="$ANCHOR" 'BEGIN{printf "%.2f", s/a}')
  else
    RATIO="n/a"
  fi
  [ "$SPENT" -gt "$ANCHOR" ] 2>/dev/null && OVER="true"
fi

if [ "$JSON" -eq 1 ]; then
  printf '{"agents":%s,"per":%s,"factor":%s,"rough":%s,"corrected":%s,' "$AGENTS" "$PER" "$FACTOR" "$ROUGH" "$CORR"
  printf '"threshold_agents":%s,"threshold_tokens":%s,"quote_required":%s,"reason":"%s"' "$TA" "$TT" "$([ $REQ -eq 1 ] && echo true || echo false)" "$REASON"
  if [ -n "$SPENT" ]; then
    printf ',"spent":%s,"anchor":%s,"anchor_src":"%s","spent_over_anchor_ratio":"%s","over_budget":%s' "$SPENT" "$ANCHOR" "$ANCHOR_SRC" "${RATIO}" "$OVER"
  fi
  printf '}\n'
else
  echo "== 大编排规模估算 =="
  echo "  代理数    : ${AGENTS}（阈值 ${TA}）"
  echo "  粗估      : ${ROUGH} token（= ${AGENTS} × ${PER}）"
  echo "  ×${FACTOR} 校正 : ${CORR} token"
  echo "  —— 粗估与校正**均非上限**（真实案例：报 90 万、实耗 270 万 ≈3 倍且是下限）"
  if [ "$REQ" -eq 1 ]; then
    echo "  判定      : ⚠️ 需先报价（触发：${REASON}）"
    echo ""
    echo "  报价模板（发给用户）："
    echo "  「计划 ${AGENTS} 个代理，粗估 ${ROUGH} token、×${FACTOR} 校正后约 ${CORR} token（均非上限），产出是 <Z>——批准吗？」"
  else
    echo "  判定      : OK 无需报价（未跨阈值，可直接发）"
  fi
  if [ -n "$SPENT" ]; then
    echo ""
    echo "  飞行分账  : 已花 ${SPENT} / 锚点 ${ANCHOR}（${ANCHOR_SRC}）= ${RATIO}"
    if [ "$OVER" = "true" ]; then
      echo "  ⛔ 已超过已批准/校正预算 —— 按护栏③立即停下、重新报价，不等用户问。"
    fi
  fi
fi

[ "$REQ" -eq 1 ] && exit 10 || exit 0
