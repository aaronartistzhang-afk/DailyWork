# Methodology — the math

All formulas are metric-agnostic. The worked example maps reach rate onto them
(see `worked-example-reach-rate.md`).

## 1. Contribution / 解释度 (ratio metrics)

A metric is `rate = N / D` (numerator / denominator), aggregated over a set of
partition rows (e.g. channels). For a single row *i*, define the **explanation
point**:

```
ep_i = (ΣN_cur − N_i,cur + N_i,prev) / (ΣD_cur − D_i,cur + D_i,prev)  −  rate_cur_total
```

where `ΣN_cur, ΣD_cur` are summed over the partition and `rate_cur_total = ΣN_cur/ΣD_cur`.

**Counterfactual meaning:** the first term is the aggregate rate you'd get *if row i
had stayed at its previous-period numerator and denominator* while every other row
moved to current. Subtracting the actual current aggregate isolates row i's effect.

The **explanation degree** normalizes ep so the partition explains 100% of the move:

```
解释度_i = ep_i / Σ_j ep_j        Σ_i 解释度_i = 1   (100%)
```

- A **positive** 解释度 means the row pushed the aggregate in the direction it
  actually moved (a *drag* if the metric fell, a *driver* if it rose). **Negative**
  = it pushed the opposite way (*reverse support*).
- This is a **current-period rollback** attribution (leave-one-at-prev), not Shapley
  / causal attribution — it answers "how much of the realized move is attributable
  to this row", not "what caused it".
- **Failure mode:** `Σep ≈ 0` (the partition's effects cancel) → 解释度 is unstable
  (engine sets `status='unstable'`, 解释度 = NaN). Report magnitudes instead.

## 2. Log structure × quality decomposition (ratio that factors)

If the rate factors into a product of sub-ratios, `rate = f1 × f2 × … × fk`
(e.g. `reach = (exposure/intersect) × (intersect/circle) = density × overlap`),
then because `ln(rate) = Σ ln(f)`:

```
ln(rate_cur / rate_prev) = Σ_k ln(f_k,cur / f_k,prev)

factor_k_share = ln(f_k,cur / f_k,prev) / ln(rate_cur / rate_prev)
Σ_k factor_k_share = 1   (100%)
```

Each share is the fraction of the **percentage** change attributable to that factor
(structure vs quality, etc.).

- **Failure mode:** `|ln(rate_cur/rate_prev)| < 1e-3` (rate barely moved → near-zero
  denominator) or any factor ≤ 0 → `status='unstable'`, shares = None. Fall back to
  describing raw factor magnitudes.

## 3. Additive Δ-contribution (total metrics)

For a single measure `m` (revenue, events, DAU), each row's share of the absolute
change:

```
contribution_i = (m_i,cur − m_i,prev) / (Σm_cur − Σm_prev)
Σ_i contribution_i = 1   (100%)
```

New/expiring rows contribute naturally (their delta is the full prev or cur value).
Reverse-moving rows get negative shares.

- **Failure mode:** `|Σm_cur − Σm_prev| ≈ 0` (offsetting moves, flat total) →
  `status='degenerate'`; report raw deltas, not shares.

## 4. Hierarchical drill-down

1. Score the top dimension level over its members (ep/解释度 for ratio, Δ-share for
   additive).
2. `rank_and_filter`: flag near-zero-magnitude / tiny-|解释度| / rate≈0 noise rows;
   sort by |score| desc.
3. Pick the first **non-noise** member as Top-1.
4. Recurse into Top-1, fixing it in the `group_filter`, scoring the next level.
5. At the **leaf**, classify turnover instead of recursing.

## 5. Old/new turnover (leaf)

Comparing a **driver** measure prev vs cur (default = the numerator/measure):

| label | condition |
|---|---|
| expired | prev > 0 and cur ≤ ε·prev |
| new | cur > 0 and prev ≤ ε·cur |
| shrinking | both > 0 and cur < 0.5·prev |
| ramping | both > 0 and cur > 1.5·prev |
| stable | otherwise |

A pool-backed leaf is additionally **attributed by the driver's Δ-share** (§3 on the
driver column), because the pool denominator is untrustworthy (§ dual-source).

## 6. Dual-source denominator rule

Two grains can exist: a **dedup** source (aggregated, each unit counted once) and a
finer **pool** source (e.g. per activity), where the same unit appears under many
leaf rows. Summing the pool's denominator double-counts and inflates it (the
`pool_overcount_factor` = pool-denominator-sum / dedup-denominator; it is typically
≫ 1). Therefore:

- **The dedup source is the only valid denominator** for any aggregate/segment rate.
- The pool source is **direction-only**: use it to see *which leaf items moved the
  numerator/driver* and for turnover — never as a rate denominator.
- A huge-denominator, near-zero-numerator leaf row (cross-segment "national drift")
  is real overlap, not a bug; the driver-Δ attribution gives it ≈ 0 weight, as it
  should.
