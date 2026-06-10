# Pitfalls

## 1. Pool double-count / national drift (the big one)
Summing a finer "pool" source's denominator double-counts units that appear under
many leaf rows → the denominator inflates and any rate built on it is wrong. In the
worked-example data the pool circle for push×R1 sums to ~3.6× the dedup circle.

- **Rule:** the dedup source is the only valid denominator. The pool is
  direction-only — "which leaf items moved the numerator/driver" + turnover.
- A huge-circle, ~0-exposure leaf row (a cross-segment "[ALL]" / national-drift
  activity) is real overlap, not a bug. Attributing the leaf by the **driver's
  Δ-share** gives it ≈ 0 weight automatically. Computing pool-ratio ep instead would
  hand it a spurious top rank — exactly the trap that produces a wrong call when the
  pool is mistakenly used as a denominator.

## 2. Log decomposition blows up at extreme/degenerate WoW
`factor_share = ln(f_c/f_p) / ln(rate_c/rate_p)` is unstable when the rate barely
moved (`|ln| < 1e-3`) or any factor ≤ 0. The engine returns `status='unstable'`,
`shares=None`. Don't print garbage shares — describe the raw factor magnitudes
instead.

## 3. High 解释度 on a tiny-volume row = noise
A row with near-zero denominator can post a huge 解释度 yet move nothing real
(e.g. a rate-≈0 channel posting a |解释度| far above its real impact). Filter before trusting the ranking:
`noise.min_denominator_share`, `noise.min_abs_explanation`,
`noise.suppress_rate_near_zero` (ratio mode). Top-1 selection skips flagged noise.

## 4. Σep ≈ 0 (ratio) / Σdelta ≈ 0 (additive)
When the partition's effects cancel, 解释度 / contribution is undefined (division by
~0). The engine flags `status='unstable'` / `'degenerate'`. Report magnitudes, and
look one level up — a flat aggregate often hides large offsetting moves
("internal churn").

## 5. Percentage-point vs relative
A move "20.00% → 16.75%" is **−3.25 pp** but **−16.26% relative (WoW)**. 解释度 and the
WoW figures here are **relative**. Be explicit in narratives; mixing the two is the
most common reporting error.

## 6. total_selector ≠ attribution partition
The headline (大盘) metric and the decomposed rows are often different row sets
(a roll-up like `all_resource` vs the detail members). Set `total_selector` for the
headline and `attribution.exclude_members` for the partition; don't compute the
headline by summing the partition if a dedup roll-up row exists.

## 7. Long numeric IDs and messy exports
Exports carry UTF-8 BOMs, `Unnamed:` columns, comma-formatted numbers, and 18–19
digit ids. `load_long_data` handles BOM/Unnamed/ids-as-string; `apply_column_map`
strips commas and coerces measures. If you build DataFrames yourself, keep ids as
strings and measures numeric.

## 8. Duplicate grain
Real exports sometimes repeat a grain key (same period×dims twice). Use
`aggregate_duplicates: sum`; `error` will (intentionally) reject the run so you
notice. Grain is specified in logical (post-map) names.
