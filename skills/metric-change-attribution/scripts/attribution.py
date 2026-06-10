"""
metric-change-attribution — pure-pandas, stateless attribution engine.

Period-over-period (WoW/MoM/pre-post) attribution of a metric change across a
dimension hierarchy. Ratio metrics (ep / 解释度 + optional multiplicative
factor decomposition) are the rich path; additive totals use Δ-contribution share.

Import-safe: no side effects at import, no globals. Every function is stateless —
config in, DataFrame/dict out (only load_long_data does I/O). See SKILL.md and
references/ for the methodology. Config schema: references/config-reference.md.
"""
from __future__ import annotations
import math
import pandas as pd

# logical measure names that get numeric coercion (everything else stays str)
_MEASURE_KEYS = {"exposure", "circle", "intersect", "measure", "driver",
                 "numerator", "denominator"}
_EPS = 1e-12


# ----------------------------------------------------------------------------
# config & loading
# ----------------------------------------------------------------------------
def load_config(path_or_dict):
    """Parse YAML/JSON/dict into a validated config dict; raise on missing keys per metric.mode."""
    if isinstance(path_or_dict, dict):
        cfg = path_or_dict
    else:
        text = open(path_or_dict, encoding="utf-8").read()
        try:
            import yaml
            cfg = yaml.safe_load(text)
        except Exception:
            import json
            cfg = json.loads(text)
    _validate_config(cfg)
    return cfg


def _validate_config(cfg):
    for key in ("period", "metric", "hierarchy", "sources"):
        if key not in cfg:
            raise ValueError(f"config missing required key: {key}")
    mode = cfg["metric"].get("mode", "ratio")
    if mode == "ratio":
        for k in ("numerator", "denominator"):
            if not cfg["metric"].get(k):
                raise ValueError(f"ratio metric requires metric.{k}")
    elif mode == "additive":
        if not cfg["metric"].get("measure"):
            raise ValueError("additive metric requires metric.measure")
    else:
        raise ValueError(f"unknown metric.mode: {mode}")
    for lvl in cfg["hierarchy"]:
        if "column" not in lvl:
            raise ValueError("each hierarchy level needs a 'column'")
        lvl.setdefault("source", "dedup")


def load_long_data(source_cfg, coerce_numeric=True):
    """Read a source CSV (or pass-through DataFrame): strip BOM, drop Unnamed cols, keep ids as str. (I/O)"""
    path = source_cfg.get("path")
    if isinstance(path, pd.DataFrame):
        df = path.copy()
    else:
        df = pd.read_csv(path, dtype=str, encoding="utf-8-sig")
    df.columns = [str(c).replace("﻿", "").strip() for c in df.columns]
    df = df.loc[:, [c for c in df.columns if c and not c.startswith("Unnamed")]]
    return df


def apply_column_map(df, source_cfg):
    """Rename real columns to logical names (exposure/circle/intersect/dim_*) and coerce measures to float."""
    df = df.copy()
    cmap = source_cfg.get("column_map", {})  # {logical: real_column_name}
    rename = {real: logical for logical, real in cmap.items() if real in df.columns}
    df = df.rename(columns=rename)
    for logical in cmap:
        if logical in _MEASURE_KEYS and logical in df.columns:
            df[logical] = pd.to_numeric(
                df[logical].astype(str).str.replace(",", "", regex=False),
                errors="coerce")
    return df


def prepare_source(source_cfg, config):
    """Convenience: load_long_data -> apply_column_map -> coerce measures -> filter periods -> dedup."""
    df = load_long_data(source_cfg)
    df = apply_column_map(df, source_cfg)
    # robust numeric coercion of every measure this config references (by post-map name)
    for meas in _measure_cols(config):
        if meas in df.columns and not pd.api.types.is_numeric_dtype(df[meas]):
            df[meas] = pd.to_numeric(
                df[meas].astype(str).str.replace(",", "", regex=False), errors="coerce")
    if config.get("period", {}).get("filter_before_validate", True):
        df = filter_periods(df, config)
    grain = source_cfg.get("grain")
    if grain:
        df = aggregate_duplicates(df, [g for g in grain if g in df.columns],
                                  source_cfg.get("aggregate_duplicates", "error"))
    return df


# ----------------------------------------------------------------------------
# shaping helpers
# ----------------------------------------------------------------------------
def filter_periods(df, config):
    """Keep only the prev and curr period rows BEFORE validation/aggregation."""
    p = config["period"]
    col, prev, curr = p["column"], p["prev"], p["curr"]
    return df[df[col].isin([prev, curr])].copy()


def aggregate_duplicates(df, grain, mode):
    """Collapse duplicate-grain rows by summing numeric cols (mode='sum') or raise (mode='error')."""
    if not grain:
        return df
    dup = df.duplicated(grain, keep=False)
    if not dup.any():
        return df
    if mode == "error":
        raise ValueError(f"{int(dup.sum())} duplicate-grain rows for {grain}")
    num_cols = [c for c in df.columns if c not in grain and pd.api.types.is_numeric_dtype(df[c])]
    str_cols = [c for c in df.columns if c not in grain and c not in num_cols]
    agg = {c: "sum" for c in num_cols}
    agg.update({c: "first" for c in str_cols})
    return df.groupby(grain, as_index=False, sort=False).agg(agg)


def _measure_cols(config):
    m = config["metric"]
    cols = []
    if m.get("mode", "ratio") == "ratio":
        cols += [m["numerator"], m["denominator"]]
        for f in (m.get("factor_decomposition") or []):
            cols += [f["num"], f["den"]]
    else:
        cols += [m["measure"]]
    drv = config.get("turnover", {}).get("driver")
    if drv:
        cols.append(drv)
    seen, out = set(), []
    for c in cols:
        if c and c not in seen:
            seen.add(c); out.append(c)
    return out


def resolve_source(config, level):
    """Return 'dedup' or 'pool' (default 'dedup') for a hierarchy level."""
    return config["hierarchy"][level].get("source", "dedup")


def _apply_filter(df, group_filter):
    if not group_filter:
        return df
    mask = pd.Series(True, index=df.index)
    for col, val in group_filter.items():
        if col in df.columns:
            mask &= (df[col] == val)
    return df[mask]


def aggregate_to_level(df, config, level, group_filter=None):
    """Collapse a source to one row per member at hierarchy[level], pivoted into _prev/_cur measures."""
    p = config["period"]
    col, prev, curr = p["column"], p["prev"], p["curr"]
    member_col = config["hierarchy"][level]["column"]
    sub = _apply_filter(df, group_filter)

    # partition include/exclude applies at level 0 only
    if level == 0:
        att = config.get("attribution", {})
        inc, exc = att.get("include_members"), att.get("exclude_members")
        if inc:
            sub = sub[sub[member_col].isin(inc)]
        if exc:
            sub = sub[~sub[member_col].isin(exc)]

    measures = [m for m in _measure_cols(config) if m in sub.columns]
    g = sub.groupby([member_col, col], as_index=False)[measures].sum()
    out = None
    label_col = config["hierarchy"][level].get("label_column")
    for tag, period in (("prev", prev), ("cur", curr)):
        part = g[g[col] == period][[member_col] + measures].copy()
        part = part.rename(columns={m: f"{m}_{tag}" for m in measures})
        out = part if out is None else out.merge(part, on=member_col, how="outer")
    out = out.fillna(0.0)
    out = out.rename(columns={member_col: "member"})
    if label_col and label_col in sub.columns:
        lab = sub.groupby(member_col)[label_col].first()
        out["label"] = out["member"].map(lab).fillna(out["member"])
    return out


# ----------------------------------------------------------------------------
# overall (headline / 大盘) metric — separate from the attribution partition
# ----------------------------------------------------------------------------
def compute_overall_metric(dedup_df, config):
    """Headline metric prev/cur/wow from total_selector rows (+ factor decomposition if configured)."""
    p = config["period"]
    col, prev, curr = p["column"], p["prev"], p["curr"]
    sel = config.get("total_selector")
    sub = dedup_df
    if sel:
        sub = sub[sub[sel["column"]] == sel["equals"]]
    m = config["metric"]
    res = {"name": m.get("name"), "mode": m.get("mode", "ratio")}
    if m.get("mode", "ratio") == "additive":
        meas = m["measure"]
        a = sub[sub[col] == prev][meas].sum()
        b = sub[sub[col] == curr][meas].sum()
        res.update(prev=a, cur=b, wow=_safe_div(b - a, abs(a)))
        return res
    num, den = m["numerator"], m["denominator"]
    np_, nc = sub[sub[col] == prev][num].sum(), sub[sub[col] == curr][num].sum()
    dp_, dc = sub[sub[col] == prev][den].sum(), sub[sub[col] == curr][den].sum()
    rp, rc = _safe_div(np_, dp_), _safe_div(nc, dc)
    res.update(numerator={"prev": np_, "cur": nc, "wow": _safe_div(nc - np_, np_)},
               denominator={"prev": dp_, "cur": dc, "wow": _safe_div(dc - dp_, dp_)},
               rate_prev=rp, rate_cur=rc, wow=_safe_div(rc - rp, rp))
    factors = m.get("factor_decomposition")
    if factors:
        fp, fc = {}, {}
        for f in factors:
            fp[f["name"]] = _safe_div(sub[sub[col] == prev][f["num"]].sum(),
                                      sub[sub[col] == prev][f["den"]].sum())
            fc[f["name"]] = _safe_div(sub[sub[col] == curr][f["num"]].sum(),
                                      sub[sub[col] == curr][f["den"]].sum())
        res["factors"] = log_factor_decomposition(rp, rc, fp, fc)
    return res


# ----------------------------------------------------------------------------
# ratio attribution (ep / 解释度)
# ----------------------------------------------------------------------------
def compute_ep(level_df, config, group_filter=None):
    """ep=(ΣN_cur−n_cur+n_prev)/(ΣD_cur−d_cur+d_prev)−rate_cur ; 解释度=ep/Σep (sums to 100%)."""
    m = config["metric"]
    num, den = m["numerator"], m["denominator"]
    df = level_df.copy()
    n_prev, n_cur = df[f"{num}_prev"], df[f"{num}_cur"]
    d_prev, d_cur = df[f"{den}_prev"], df[f"{den}_cur"]
    SN, SD = n_cur.sum(), d_cur.sum()
    rate_cur_total = _safe_div(SN, SD)
    df["rate_prev"] = [_safe_div(a, b) for a, b in zip(n_prev, d_prev)]
    df["rate_cur"] = [_safe_div(a, b) for a, b in zip(n_cur, d_cur)]
    df["wow"] = [_safe_div(c - p, p) for p, c in zip(df["rate_prev"], df["rate_cur"])]
    df["ep"] = [_safe_div(SN - nc + np_, SD - dc + dp_) - rate_cur_total
                for np_, nc, dp_, dc in zip(n_prev, n_cur, d_prev, d_cur)]
    sum_ep = df["ep"].sum()
    df.attrs["sum_ep"] = sum_ep
    df.attrs["status"] = "unstable" if abs(sum_ep) < _EPS else "ok"
    df["解释度"] = df["ep"] / sum_ep if abs(sum_ep) >= _EPS else float("nan")
    df["magnitude"] = d_cur
    return df


def log_factor_decomposition(rate_prev, rate_curr, factors_prev, factors_curr):
    """Per-factor share = ln(f_c/f_p)/ln(r_c/r_p); shares sum to 100%. status='unstable' at extreme/degenerate WoW."""
    out = {"shares": {}, "status": "ok"}
    if rate_prev <= 0 or rate_curr <= 0:
        out["status"] = "unstable"; out["shares"] = None; return out
    ln_rate = math.log(rate_curr / rate_prev)
    if abs(ln_rate) < 1e-3:
        out["status"] = "unstable"; out["shares"] = None; return out
    shares = {}
    for name, fp in factors_prev.items():
        fc = factors_curr.get(name)
        if fp is None or fc is None or fp <= 0 or fc <= 0:
            out["status"] = "unstable"; out["shares"] = None; return out
        shares[name] = math.log(fc / fp) / ln_rate
    out["shares"] = shares
    return out


# ----------------------------------------------------------------------------
# additive attribution (Δ-contribution share)
# ----------------------------------------------------------------------------
def compute_additive_contribution(level_df, config, group_filter=None, measure=None):
    """contribution=(m_cur−m_prev)/(total_cur−total_prev); shares sum to 100%. status='degenerate' if Δtotal≈0.

    measure overrides config.metric.measure — used at a direction_only (pool) leaf to attribute
    by the turnover DRIVER (e.g. exposure) instead of a ratio, since the pool denominator is untrustworthy.
    """
    meas = measure or config["metric"]["measure"]
    df = level_df.copy()
    mp, mc = df[f"{meas}_prev"], df[f"{meas}_cur"]
    df["delta"] = mc - mp
    tot = df["delta"].sum()
    if abs(tot) < _EPS:
        df.attrs["status"] = "degenerate"
        df["contribution"] = float("nan")
    else:
        df.attrs["status"] = "ok"
        df["contribution"] = df["delta"] / tot
    df["解释度"] = df["contribution"]
    # magnitude = max(|prev|,|cur|): an expired row (prev big, cur 0) is NOT tiny.
    df["magnitude"] = [max(abs(a), abs(b)) for a, b in zip(mp, mc)]
    df["value_prev"], df["value_cur"] = mp, mc
    # NOTE: no "rate_cur" column → rank_and_filter's rate-near-zero guard is ratio-only.
    return df


# ----------------------------------------------------------------------------
# ranking, turnover, dual-source gate
# ----------------------------------------------------------------------------
def rank_and_filter(scored, config):
    """Flag noise (tiny magnitude / |解释度| / rate≈0), sort by |score| desc. Returns df with is_noise col."""
    n = config.get("noise", {})
    df = scored.copy()
    total_mag = df["magnitude"].sum()
    min_share = n.get("min_denominator_share", 0.0)
    min_abs = n.get("min_abs_explanation", 0.0)
    rate_eps = n.get("suppress_rate_near_zero", 0.0)
    score = df["解释度"].abs()
    is_noise = pd.Series(False, index=df.index)
    if total_mag > 0 and min_share > 0:
        is_noise |= (df["magnitude"] < min_share * total_mag)
    if min_abs > 0:
        is_noise |= (score < min_abs)
    if rate_eps > 0 and "rate_cur" in df.columns:
        is_noise |= (df["rate_cur"].abs() < rate_eps)
    df["is_noise"] = is_noise
    return df.reindex(score.sort_values(ascending=False).index)


def classify_turnover(pool_level_df, config, group_filter=None):
    """Label leaf members expired/shrinking/stable/ramping/new via the driver measure + zero_eps."""
    t = config.get("turnover", {})
    drv, eps = t.get("driver"), t.get("zero_eps", 0.02)
    df = pool_level_df.copy()
    pcol, ccol = f"{drv}_prev", f"{drv}_cur"

    def label(p, c):
        if p > 0 and c <= eps * p:
            return "expired"
        if c > 0 and p <= eps * c:
            return "new"
        if p > 0 and c < 0.5 * p:
            return "shrinking"
        if p > 0 and c > 1.5 * p:
            return "ramping"
        return "stable"

    df["turnover"] = [label(p, c) for p, c in zip(df[pcol], df[ccol])]
    df["driver_prev"], df["driver_cur"] = df[pcol], df[ccol]
    df["driver_delta"] = df[ccol] - df[pcol]
    keep = ["member"] + (["label"] if "label" in df.columns else []) + \
           ["turnover", "driver_prev", "driver_cur", "driver_delta"]
    return df[keep]


def validate_dual_source(dedup_df, pool_df, config, group_filter=None):
    """Confirm pool is direction-only: pool denominator summed vs dedup denominator (double-count factor)."""
    out = {"ok": True, "warnings": [], "denominator_source": "dedup"}
    if pool_df is None:
        out["pool_overcount_factor"] = None
        return out
    den = config["metric"].get("denominator")
    if not den:
        out["pool_overcount_factor"] = None
        return out
    p = config["period"]; col, curr = p["column"], p["curr"]
    ded = _apply_filter(dedup_df, group_filter)
    pol = _apply_filter(pool_df, group_filter)
    sel = config.get("total_selector")
    if group_filter is None and sel is not None:
        ded = ded[ded[sel["column"]] == sel["equals"]]
    dedup_den = ded[ded[col] == curr][den].sum() if den in ded.columns else float("nan")
    pool_den = pol[pol[col] == curr][den].sum() if den in pol.columns else float("nan")
    factor = _safe_div(pool_den, dedup_den)
    out["pool_overcount_factor"] = factor
    if factor and factor > 1.05:
        out["warnings"].append(
            f"pool denominator sums to {factor:.2f}x the dedup denominator "
            f"({pool_den:,.0f} vs {dedup_den:,.0f}); pool is direction-only, never a denominator.")
    return out


# ----------------------------------------------------------------------------
# drill-down orchestration
# ----------------------------------------------------------------------------
def drill_down(config, dedup_df, pool_df=None, level=0, group_filter=None):
    """Recursive Top-1 attribution: score level -> rank+filter -> Top-1 -> recurse; leaf gets turnover."""
    group_filter = group_filter or {}
    hierarchy = config["hierarchy"]
    is_leaf = (level == len(hierarchy) - 1)
    src = resolve_source(config, level)
    df = dedup_df if src == "dedup" else pool_df
    if df is None:
        raise ValueError(f"hierarchy level {level} needs source '{src}' but it was not provided")

    level_df = aggregate_to_level(df, config, level, group_filter)
    src_role = config.get("sources", {}).get(src, {}).get("role")
    leaf_via_driver = (src_role == "direction_only" and config.get("turnover", {}).get("driver"))
    if leaf_via_driver:
        # pool denominator is untrustworthy → attribute by the driver (e.g. exposure) Δ-share
        scored = compute_additive_contribution(
            level_df, config, group_filter, measure=config["turnover"]["driver"])
        node_attr = "driver_contribution"
    elif config["metric"].get("mode", "ratio") == "ratio":
        scored = compute_ep(level_df, config, group_filter)
        node_attr = "ratio_ep"
    else:
        scored = compute_additive_contribution(level_df, config, group_filter)
        node_attr = "additive"
    ranked = rank_and_filter(scored, config)

    node = {
        "dim": hierarchy[level]["column"],
        "level": hierarchy[level].get("level", hierarchy[level]["column"]),
        "source": src,
        "attribution": node_attr,
        "status": scored.attrs.get("status", "ok"),
        "members": _members_view(ranked),
    }

    if is_leaf:
        drv = config.get("turnover", {}).get("driver")
        if drv and f"{drv}_prev" in level_df.columns:
            node["turnover"] = classify_turnover(level_df, config, group_filter).to_dict("records")
        else:
            node["turnover"] = []
        return node

    non_noise = ranked[~ranked["is_noise"]]
    pick = non_noise if len(non_noise) else ranked
    if not len(pick):
        return node
    top = pick.iloc[0]
    node["top1"] = {"member": top["member"],
                    "label": top.get("label", top["member"]),
                    "解释度": float(top["解释度"]) if pd.notna(top["解释度"]) else None}
    child_filter = dict(group_filter)
    child_filter[hierarchy[level]["column"]] = top["member"]
    node["child"] = drill_down(config, dedup_df, pool_df, level + 1, child_filter)
    return node


def run_attribution(config, dedup_df, pool_df=None):
    """End-to-end: validate -> dual-source -> overall metric -> drill_down -> leaf turnover. Returns a dict tree."""
    warnings = []
    warnings += [f"dedup: {w}" for w in validate_long_format(dedup_df, config, "dedup")]
    if pool_df is not None:
        warnings += [f"pool: {w}" for w in validate_long_format(pool_df, config, "pool")]
    overall = compute_overall_metric(dedup_df, config)
    tree = drill_down(config, dedup_df, pool_df, 0, {})
    # dual-source check at the drilled leaf group (channel x region)
    leaf_filter = _leaf_group_filter(tree, config)
    dual = validate_dual_source(dedup_df, pool_df, config, leaf_filter)
    warnings += dual.get("warnings", [])
    return {"overall": overall, "tree": tree, "dual_source": dual,
            "drilled_path": _path_of(tree), "warnings": warnings}


# ----------------------------------------------------------------------------
# validation & small utilities
# ----------------------------------------------------------------------------
def validate_long_format(df, config, source_role):
    """Return a list of problems (missing mapped cols / both periods present / numeric measures). Empty = OK."""
    problems = []
    p = config["period"]; col = p["column"]
    if col not in df.columns:
        return [f"missing period column '{col}'"]
    present = set(df[col].unique())
    for which in ("prev", "curr"):
        if p[which] not in present:
            problems.append(f"period {which}='{p[which]}' not found")
    for meas in _measure_cols(config):
        if meas in df.columns and not pd.api.types.is_numeric_dtype(df[meas]):
            problems.append(f"measure '{meas}' is not numeric (coerce in apply_column_map)")
    return problems


def _members_view(ranked, top_n=12):
    cols = [c for c in ("member", "label", "rate_prev", "rate_cur", "wow",
                        "ep", "解释度", "contribution", "is_noise") if c in ranked.columns]
    return ranked[cols].head(top_n).to_dict("records")


def _leaf_group_filter(tree, config):
    gf, node, level = {}, tree, 0
    while node.get("child") is not None and "top1" in node:
        gf[config["hierarchy"][level]["column"]] = node["top1"]["member"]
        node = node["child"]; level += 1
    return gf


def _path_of(tree):
    path, node = [], tree
    while node is not None:
        if "top1" in node:
            path.append({"dim": node["dim"], "member": node["top1"]["member"],
                         "label": node["top1"].get("label"), "解释度": node["top1"].get("解释度")})
        node = node.get("child")
    return path


def _safe_div(a, b):
    try:
        if b is None or abs(b) < _EPS:
            return float("nan")
        return a / b
    except Exception:
        return float("nan")
