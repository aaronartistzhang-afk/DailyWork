# Worked example — 触达率 (reach rate) WoW attribution

The canonical ratio case the engine was distilled from. Config:
`examples/reach-rate.config.yaml`; synthetic sample data: `examples/data/`
(frozen expected outputs: `tests/fixtures/golden_reach/`). All numbers below are
fabricated — the dataset reproduces the analytical *shape*, not any real values.

## Metric mapping
```
触达率 (reach rate) = 资源曝光UV / 活动圈人UV   (exposure / circle)
  = (曝光/交集) × (交集/圈人)
  = 曝光密度 (exposure density, "quality")  ×  重合率 (overlap, "structure")
```
| logical | dedup column | pool column |
|---|---|---|
| exposure (numerator) | 资源曝光UV | 资源曝光uv |
| circle (denominator) | 活动圈人UV | 活动圈人uv |
| intersect (factor) | 资源和活动圈人交集uv | 资源和活动圈人交集uv |

Hierarchy: **channel → region → activity_id** (channel & region from the
by-region dedup source; activity from the by-activity pool source).
Headline (大盘) metric: `total_selector = dim_value1 == all_resource`.
Partition: the 6 detail channels (exclude `all_resource/all_banner/all_message`).

## Worked-example result (reproduced by `selftest.py` and `run_analysis.py`)
- **大盘**: 触达率 20.00% → 16.75% (WoW −16.26%); factor split ≈ 曝光密度 98.6% / 重合率 1.4%.
- **Top-1 channel**: push, 解释度 **+76.15%** (a drag — rate fell 15.00%→10.67%).
  Other movers: banner_live +21.62%, banner_other +6.92%; notice −7.29% (reverse
  support — its rate rose 12.50%→14.63%).
- **Top-1 region under push**: R1, 解释度 **+75.64%** (rate 15.00%→8.57%); then
  R2 +20.21%, R3 +9.73%; R4 −5.58% (reverse support — it recovered, 16.67%→19.09%).
- **Leaf (push×R1, driver = exposure Δ-share + turnover)**: Spring Battle 5.10-5.16
  (`100001`, top contributor +76.43%) and Quest Ladder 5.12-5.18 (`100002`) expired;
  Creator Showcase 5.15-6.01 (`100003`) shrinking (+57.32%); the Summer Bonus 6.04-6.10
  batch (`100004`) new (−70.06% share, partially offsetting); Login Rewards (`100005`) stable.
  → an old→new activity-batch handover gap, not a circle-pool dilution.
- `pool_overcount_factor` ≈ 3.6 for push×R1 (pool circle 7,560 vs dedup 2,100) —
  confirming the dedup source is the only valid denominator.

## How this relates to a downstream reporting pipeline (reference only)
A typical deployment computes this ep/解释度 and structure×quality here, then a
**separate** rendering/orchestration layer turns it into a spreadsheet or report
(period-string replacement, formula tabs, conditional-format heat-maps, a narrative
summary). That rendering layer is intentionally **out of scope** for this skill —
this skill is the portable **methodology + engine** only.

Two design choices worth noting:
1. A pool/activity leaf is attributed by the **driver (exposure) Δ-share**, not by a
   pool-circle ratio. The pool denominator double-counts across overlapping segments,
   so a pool-ratio ep would hand a huge-circle / near-zero-exposure "national drift"
   row a spurious top rank; the driver-Δ-share approach is drift-immune and needs no
   hand-curation (see `pitfalls.md`).
2. The headline "大盘" and the channel-partition base are different row sets
   (`all_resource` vs the 6-channel sum) — captured by `total_selector` ≠ the
   `attribution` partition.
