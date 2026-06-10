# Data format guide

## Long format
One row per **(period × dimension-tuple)**. Columns:

| Column kind | Required | Notes |
|---|---|---|
| period | ✓ | named by `period.column`; must contain BOTH `period.prev` and `period.curr` |
| dimension(s) | ✓ (≥1) | the hierarchy columns (channel, region, activity, cohort, SKU…) |
| numerator | ratio mode | per-row scalar (e.g. exposures, conversions) |
| denominator | ratio mode | per-row scalar (e.g. users, sessions, impressions) |
| measure | additive mode | the single total being attributed (revenue, events) |
| factor measures | optional | extra columns so a ratio splits into A×B (e.g. an intersection count) |
| driver | optional | for leaf turnover; defaults to the numerator/measure |

Measures are referenced by **logical names** in the config (`exposure`, `circle`,
`intersect`, `measure`, `driver`); each source maps them to its real column names
via `column_map`. This lets one config span sources that name the same quantity
differently.

## Two grains — the dual-source model
You may supply one or two sources:

| source | grain | role | use |
|---|---|---|---|
| `dedup` | aggregated, de-duplicated (each unit counted once, e.g. per region by user country) | `denominator_truth` | the only valid denominator for any aggregate/segment rate; levels routed here |
| `pool` | finer leaf grain (e.g. per activity), units overlap across rows | `direction_only` | "which leaf items moved the numerator/driver" + turnover; a pool leaf is attributed by the driver's Δ-share, never by a pool-ratio |

Why: summing a pool denominator double-counts shared units → the
`pool_overcount_factor` (pool-sum / dedup) is ≫ 1. A huge-denominator,
near-zero-numerator leaf row is real cross-segment "drift", not a bug.

**Per-level routing:** each `hierarchy[i]` declares `source: dedup|pool`. Typically
the upper levels are `dedup` and only the leaf is `pool`. If a level's source is
`direction_only`, the engine attributes that level by the turnover `driver`'s Δ-share.

Single-source analyses omit `sources.pool` and set every level to `dedup`.

## Validation rules (enforced by the engine)
- `validate_long_format` flags: missing period column, either period absent, or a
  mapped measure that isn't numeric (coerce in `apply_column_map`).
- `load_long_data` strips a UTF-8 BOM, drops `Unnamed:*` columns, and reads ids as
  strings (so long numeric ids aren't mangled). `apply_column_map` strips thousands
  separators and coerces measures to float.
- `aggregate_duplicates: sum|error` — real exports sometimes carry duplicate grain
  keys; `sum` collapses them, `error` rejects. `grain` is given in **logical
  (post-map) names**.
- `period.filter_before_validate: true` keeps only the two periods before dedup/validation.

## Grain examples
```
# dedup (region grain, no activity_id):
p_date, channel, region, exposure, circle, intersect

# pool (activity grain, different column names):
p_date, position(→channel), activity_id, region, act_exposure(→exposure), act_circle(→circle), act_name
```
