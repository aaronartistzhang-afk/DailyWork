# metric-change-attribution

> A metric moved between two periods → **why?** Rank which segments drove it, drill to root cause.

---

## What it does

Given two comparable periods of the same metric, sliceable by ≥1 categorical dimension, the skill attributes the change:

1. **Scores the top dimension** — for a **ratio** metric (reach rate, CTR, conversion, retention, win rate, ARPU): explainability `ep / 解释度` (sums to 100%); for an **additive** total (revenue, events, DAU): each member's share of the absolute Δ.
2. **(ratio) Splits the rate into factors** — log-decomposes into structure × quality (e.g. 曝光密度 × 重合率), with an instability guard at degenerate WoW.
3. **Ranks, noise-filters, and drills the Top-1** — skips near-zero-volume noise rows, then recurses into the top contributor level by level to the root.
4. **Classifies leaf turnover** — labels each leaf member expired / shrinking / stable / ramping / new.
5. **Guards the dual-source denominator trap** — a finer "pool" source double-counts across overlapping segments; it is used direction-only, never as a denominator.

Metric-agnostic and **config-driven** — you declare the metric, dimensions, and sources in a small YAML file; you do **not** edit code.

---

## When to use

- Week-over-week / month-over-month / pre-post / A-vs-B movement you need to explain.
- "Which segment / factor / item is responsible", ranked and drilled to root.
- Ratio/rate metrics **or** additive totals.
- **Not** for: forecasting, single-series anomaly-point detection, or causal inference beyond decomposition of an observed change.

Triggers: *"why did X change"*, *"what drove the drop/spike"*, *归因*, *解释度*, *拆解 WoW/MoM 变化*, *"which segment caused the change"*.

---

## How to invoke

Once installed (Claude Code auto-loads it by trigger; other AIs: paste `SKILL.md`), just ask in natural language:

```
为什么这周触达率掉了？帮我归因 —— 数据在 data.csv
```

Or run the engine directly:

```bash
# run the bundled synthetic worked example
python3 scripts/run_analysis.py --config examples/reach-rate.config.yaml

# your own analysis: copy the template, fill it in, run
cp templates/analysis.config.yaml my.yaml
python3 scripts/run_analysis.py --config my.yaml --json out.json
```

You provide a **long-format CSV** (one row per period × dimension-members, with measure columns) and a YAML config declaring the period, metric mode, dimension hierarchy, and source column maps. See [`templates/analysis.config.yaml`](templates/analysis.config.yaml) and [`references/config-reference.md`](references/config-reference.md).

---

## Sample output

```
# 触达率 — P1 → P2

**Overall (大盘)**: 20.00% → 16.75%  (WoW -16.26%)
  - factor split: 曝光密度(质量) 99%, 重合率(结构) 1%

**Top-1 drill path:**
  - dim_value1 = push                — 解释度 76.15%
  - operation_region_code = R1       — 解释度 75.64%

### Level 2: activity_id (driver_contribution)
  - Spring Battle 5.10-5.16: 76.43%   (expired 120→0)
  - Summer Bonus 6.04-6.10: -70.06%   (new 0→110, partially offsetting)
  - Creator Showcase 5.15-6.01: 57.32% (shrinking 140→50)

**Warnings:**
  - pool denominator sums to 3.60x the dedup denominator; pool is direction-only, never a denominator.
```

(All numbers above come from the bundled **synthetic** sample — fabricated data, no real values. See [`references/worked-example-reach-rate.md`](references/worked-example-reach-rate.md).)

---

## Files

- [`SKILL.md`](SKILL.md) — the methodology + how to drive the engine (this is what installs into your AI)
- [`scripts/attribution.py`](scripts/attribution.py) — stateless pure-pandas engine
- [`scripts/run_analysis.py`](scripts/run_analysis.py) — CLI: config → narrative + JSON
- [`scripts/selftest.py`](scripts/selftest.py) — synthetic invariants + golden regression
- [`templates/analysis.config.yaml`](templates/analysis.config.yaml) — copy-and-fill config
- [`examples/`](examples/) — runnable synthetic reach-rate example (config + `data/`)
- [`references/`](references/) — methodology math, data-format guide, full config reference, worked example, pitfalls

---

## Dependencies

Pure Python — **no Lark / `lark-cli` / bot required** (unlike the other skills in this repo).

```bash
pip install pandas pyyaml
```

- Python 3
- `pandas`
- `PyYAML` (YAML config parsing)

Verify after install:

```bash
cd ~/.claude/skills/metric-change-attribution   # or wherever it installed
python3 scripts/selftest.py                      # → ALL PASSED
```

---

## Known limitations

- **Decomposition, not causation** — attributes an *observed* change across a partition; it does not infer cause or forecast.
- **Log factor split is unstable at degenerate WoW** (rate ≈ unchanged, or a factor ≤ 0) → returns `status='unstable'`; fall back to a magnitude narrative.
- **Tiny-volume rows can post a huge 解释度** — always noise-filter before trusting the ranking (`noise.*` config); Top-1 selection already skips flagged noise.
- **Dual-source denominator** — only the deduplicated source is a valid denominator; a finer pool source double-counts. The pool leaf is attributed by the driver's Δ-share, not pool-ratio ep. See [`references/pitfalls.md`](references/pitfalls.md).

---

## Install

See **[top-level README → 🚀 Install](../../README.md#-install)** for the one-message AI install and per-AI manual install. This skill only needs `pip install pandas pyyaml` — no Lark setup.
