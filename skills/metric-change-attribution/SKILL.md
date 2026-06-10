---
name: metric-change-attribution
description: >-
  Use when a metric moved between two periods (week-over-week, month-over-month,
  pre/post, A-vs-B) and you need to attribute WHY — which dimension members,
  segments, or factors drove it, ranked and drilled to root cause. Covers
  ratio/rate metrics (reach rate, CTR, conversion, retention, win rate, ARPU)
  and additive totals (revenue, events, DAU). Triggers: "why did X change",
  "what drove the drop/spike", "归因", "解释度", "拆解 WoW/MoM 变化",
  "which segment caused the change", "attribute the change".
metadata:
  domain: data-analysis
  input: long-format CSV or pandas DataFrame
---

# Period-over-Period Metric-Change Attribution

A metric moved between two periods. This skill attributes *why*: it ranks the
dimension members that drove the change (解释度/ep), optionally splits a ratio
into multiplicative factors (structure × quality), drills the top contributor
level by level to the root, and classifies old/new turnover at the leaf — while
guarding against the dual-source denominator trap.

Metric-agnostic and config-driven: the same engine works for **ratio** metrics
(numerator/denominator) and **additive** totals (a single measure). You declare
the metric, dimensions, and sources in a small YAML config; you do **not** edit code.

## When to use
- Two comparable periods of the same metric, sliceable by ≥1 categorical dimension.
- You want "which segment/factor/item is responsible", ranked and drilled.
- NOT for: forecasting, single-series anomaly-point detection, or causal inference
  beyond decomposition of an observed change.

## The 6-step method
1. **Declare a config** — period (prev/curr), metric (ratio or additive), the
   dimension hierarchy, sources + column maps. Copy `templates/analysis.config.yaml`.
2. **Validate + dual-source check** — long-format sanity; confirm the deduplicated
   source is the denominator truth and any leaf "pool" source is direction-only.
3. **Score the top dimension** — ratio: ep / 解释度 (sums to 100%); additive: Δ-share.
4. **(ratio, optional) factor split** — log-decompose the rate into structure × quality.
5. **Rank, noise-filter, drill Top-1** — skip near-zero-magnitude noise; recurse
   into the top contributor to the next level.
6. **Leaf turnover** — at the leaf, classify each member expired / shrinking /
   stable / ramping / new; a pool-backed leaf attributes by the driver's Δ-share.

## Quickstart
```bash
# run the worked example (bundled synthetic reach-rate sample):
python scripts/run_analysis.py --config examples/reach-rate.config.yaml
# your own analysis:
cp templates/analysis.config.yaml my.yaml   # fill it in
python scripts/run_analysis.py --config my.yaml --json out.json
# verify the engine (synthetic invariants + frozen golden regression):
python scripts/selftest.py
```
Or import the stateless engine directly: `from scripts import attribution as A`
(see signatures in `scripts/attribution.py`).

## Choosing the metric mode
- **ratio** — the metric is `numerator / denominator` (a rate). Rich path: ep/解释度
  + optional structure×quality factor split. Use for reach rate, CTR, conversion,
  retention, win rate, ARPU-as-rate.
- **additive** — the metric is a single total (revenue, events, DAU). Lighter path:
  each member's share of the absolute Δ.

## Reading the output
`run_attribution` returns `{overall, tree, dual_source, drilled_path, warnings}`.
- `overall` — the headline (大盘) metric from `total_selector`, separate from the
  decomposed partition.
- each tree node — `members` ranked by |解释度|/|contribution| (with `is_noise`),
  the picked `top1`, and a `child` (the drill). 解释度 sums to ±100% per level.
- leaf node — `turnover` labels per member.
- a **positive** 解释度 means the member pushed the aggregate in the direction it
  moved (a drag if the metric fell); **negative** means it pushed the other way
  (reverse support). `metric.direction` drives the drag/support wording.

## Critical correctness rules
- **Dedup source is the only valid denominator.** A finer "pool" source double-counts
  across overlapping segments (national/cross-segment drift) — never sum it as a
  denominator. A pool-backed leaf is attributed by the driver's Δ-share, not pool-ratio ep.
- **Log factor decomposition fails at extreme/degenerate WoW** (rate≈unchanged or a
  factor ≤ 0) → it returns `status='unstable'`; fall back to a magnitude narrative.
- **Drop near-zero-magnitude rows before trusting 解释度** — a tiny-volume row can show
  a huge 解释度 and isn't a real driver. Tune via `noise.*`.

## References
- [methodology-math.md](references/methodology-math.md) — ep, log structure×quality, additive Δ derivations + failure modes.
- [data-format-guide.md](references/data-format-guide.md) — long-format schema, the two-grain dual-source rule, validation.
- [config-reference.md](references/config-reference.md) — every config field.
- [worked-example-reach-rate.md](references/worked-example-reach-rate.md) — the 触达率 case mapped end-to-end on the bundled synthetic sample.
- [pitfalls.md](references/pitfalls.md) — drift double-count, log instability, noise rows, pp-vs-relative, leaf pool-ep.

## Reference implementation (optional, out of scope here)
In a typical deployment this attribution feeds a separate rendering/orchestration
layer that turns the ep/解释度 output into a spreadsheet or report (period-string
replacement, formula tabs, conditional-format heat-maps, a narrative summary). That
rendering + orchestration layer is intentionally **not** part of this skill — this
skill is the portable, data-source-agnostic methodology + engine. See
`worked-example-reach-rate.md` for how the two relate.
