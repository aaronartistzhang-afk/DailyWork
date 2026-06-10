# Config reference

A config is YAML (also accepted as a dict / JSON). Copy
`templates/analysis.config.yaml`; see `examples/reach-rate.config.yaml` for a filled
ratio case. All measure references use **logical names** mapped per source.

## period
| field | req | meaning |
|---|---|---|
| `column` | ✓ | the period column |
| `prev` | ✓ | baseline period value (exact match) |
| `curr` | ✓ | comparison period value |
| `filter_before_validate` | – | keep only these two periods before validation (default true) |

## metric
| field | req | meaning |
|---|---|---|
| `mode` | ✓ | `ratio` or `additive` |
| `name` | – | display label |
| `numerator` / `denominator` | ratio | logical measure names |
| `measure` | additive | the single total |
| `direction` | – | `higher_is_better` (default) or `lower_is_better` — narrative drag/support wording |
| `factor_decomposition` | – | ratio only; list of `{name, num, den}`; the product must equal the metric |

## total_selector
Optional. `{column, equals}` — rows for the **headline (大盘) metric**, when it is a
roll-up row distinct from the decomposed partition (e.g. `all_resource`). Omit to
take the headline from the partition itself.

## attribution
| field | meaning |
|---|---|
| `partition_column` | the level-0 dimension (usually = `hierarchy[0].column`) |
| `include_members` | allow-list (null = all) |
| `exclude_members` | drop roll-up/pseudo rows from the partition |

Applied at **level 0 only**.

## hierarchy (ordered list)
Each level: `{level, column, source, label_column?}`.
- `column` — the dimension key at this level.
- `source` — `dedup` (default) or `pool`. A `direction_only`-role source makes the
  level attribute by the driver's Δ-share.
- `label_column` — human-readable name (leaf).

## turnover
`{driver, zero_eps, source}` — `driver` is the measure compared prev↔cur to label
expired/shrinking/stable/ramping/new; `zero_eps` (default 0.02) is the on/off
threshold; `source` picks which source to read at the leaf.

## noise
| field | meaning |
|---|---|
| `min_denominator_share` | drop rows below this share of total magnitude before ranking |
| `min_abs_explanation` | drop rows with `|解释度|` below this |
| `suppress_rate_near_zero` | rate≈0 rows can't be Top-1 (ratio mode only) |

## sources
`dedup` (required) and optional `pool`. Each:
| field | meaning |
|---|---|
| `path` | CSV path (or pass a DataFrame in code) |
| `grain` | uniqueness keys, **logical (post-map) names** |
| `role` | `denominator_truth` (dedup) or `direction_only` (pool) |
| `aggregate_duplicates` | `error` or `sum` for duplicate grain |
| `column_map` | `{logical_name: "real column"}` for dims + measures |
