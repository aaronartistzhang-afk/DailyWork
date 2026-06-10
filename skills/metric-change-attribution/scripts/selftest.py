#!/usr/bin/env python3
"""
Self-test for the attribution engine.

  python scripts/selftest.py

A. Synthetic invariants — tiny checked-in fixtures with known answers (always run).
B. Golden regression — runs the engine on the bundled synthetic sample dataset
   (examples/data/, fabricated numbers) and asserts it reproduces the frozen
   expected outputs in tests/fixtures/golden_reach/.

Exits non-zero if any assertion fails.
"""
import csv
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import attribution as A

_FAILS = []


def check(name, cond, detail=""):
    tag = "PASS" if cond else "FAIL"
    if not cond:
        _FAILS.append(name)
    print(f"  [{tag}] {name}{('  — ' + detail) if detail else ''}")


def approx(a, b, tol=1e-3):
    return a is not None and b is not None and abs(a - b) <= tol


# ---------------------------------------------------------------------------
# A. synthetic invariants
# ---------------------------------------------------------------------------
def mini_config():
    fx = os.path.join(ROOT, "tests/fixtures/synthetic")
    return {
        "period": {"column": "p_date", "prev": "P1", "curr": "P2", "filter_before_validate": True},
        "metric": {"mode": "ratio", "name": "rate", "numerator": "exposure", "denominator": "circle",
                   "factor_decomposition": [{"name": "density", "num": "exposure", "den": "intersect"},
                                            {"name": "overlap", "num": "intersect", "den": "circle"}]},
        "total_selector": {"column": "channel", "equals": "all"},
        "attribution": {"partition_column": "channel", "exclude_members": ["all"]},
        "hierarchy": [{"level": "channel", "column": "channel", "source": "dedup"},
                      {"level": "region", "column": "region", "source": "dedup"},
                      {"level": "activity", "column": "activity_id", "label_column": "act_name", "source": "pool"}],
        "turnover": {"driver": "exposure", "zero_eps": 0.02, "source": "pool"},
        "noise": {"min_denominator_share": 0.0, "min_abs_explanation": 0.0, "suppress_rate_near_zero": 1e-9},
        "sources": {
            "dedup": {"path": f"{fx}/dedup_mini.csv", "grain": ["p_date", "channel", "region"],
                      "role": "denominator_truth", "aggregate_duplicates": "error",
                      "column_map": {"exposure": "exp", "circle": "cir", "intersect": "inter"}},
            "pool": {"path": f"{fx}/pool_mini.csv", "grain": ["p_date", "channel", "activity_id", "region"],
                     "role": "direction_only", "aggregate_duplicates": "sum",
                     "column_map": {"channel": "position", "exposure": "act_exp", "circle": "act_cir",
                                    "intersect": "act_inter"}}},
    }


def test_synthetic():
    print("A. Synthetic invariants")
    cfg = mini_config()
    ded = A.prepare_source(cfg["sources"]["dedup"], cfg)
    pool = A.prepare_source(cfg["sources"]["pool"], cfg)

    ov = A.compute_overall_metric(ded, cfg)
    check("overall rate 0.10 -> 0.0733", approx(ov["rate_prev"], 0.10) and approx(ov["rate_cur"], 0.0733, 1e-3),
          f"{ov['rate_prev']:.4f} -> {ov['rate_cur']:.4f}")
    check("overall factors sum to 1.0", ov.get("factors", {}).get("shares") and
          approx(sum(ov["factors"]["shares"].values()), 1.0))

    lvl0 = A.aggregate_to_level(ded, cfg, 0)
    ep = A.compute_ep(lvl0, cfg).set_index("member")
    check("解释度 sums to 1.0 (channel)", approx(ep["解释度"].sum(), 1.0), f"{ep['解释度'].sum():.6f}")
    check("channel A 解释度 ≈ 100% (sole driver)", approx(ep.loc["A", "解释度"], 1.0, 2e-3),
          f"A={ep.loc['A','解释度']*100:.2f}% B={ep.loc['B','解释度']*100:.2f}%")
    check("channel B 解释度 ≈ 0%", approx(ep.loc["B", "解释度"], 0.0, 2e-3))

    res = A.run_attribution(cfg, ded, pool)
    path = [(n["dim"], n["member"]) for n in res["drilled_path"]]
    check("drill path channel=A then region=R1", path == [("channel", "A"), ("region", "R1")], str(path))

    leaf = res["tree"]
    while leaf.get("child"):
        leaf = leaf["child"]
    check("leaf uses driver_contribution", leaf.get("attribution") == "driver_contribution")
    contrib = {r["member"]: r.get("contribution") for r in leaf["members"]}
    check("leaf act1 contribution ≈ 100%", approx(contrib.get("act1"), 1.0, 5e-3), f"act1={contrib.get('act1')}")
    check("DRIFT IMMUNITY: actdrift contribution ≈ 0 (huge circle, ~0 exposure)",
          approx(contrib.get("actdrift"), 0.0, 5e-3), f"actdrift={contrib.get('actdrift')}")
    tn = {t["member"]: t["turnover"] for t in leaf["turnover"]}
    check("turnover act1 = shrinking", tn.get("act1") == "shrinking", str(tn))

    # log decomposition — clean & unstable
    clean = A.log_factor_decomposition(0.10, 0.05, {"a": 0.5, "b": 0.2}, {"a": 0.25, "b": 0.2})
    check("log-decomp clean: a≈100%, sums to 1.0",
          clean["status"] == "ok" and approx(clean["shares"]["a"], 1.0) and approx(sum(clean["shares"].values()), 1.0))
    unstable = A.log_factor_decomposition(0.10, 0.10001, {"a": 0.5}, {"a": 0.5})
    check("log-decomp unstable at WoW≈0", unstable["status"] == "unstable" and unstable["shares"] is None)

    # additive — sums to 1.0 and degenerate
    add_cfg = {"metric": {"mode": "additive", "measure": "rev"}, "period": {}}
    add_df = pd.DataFrame({"member": ["x", "y"], "rev_prev": [100.0, 50.0], "rev_cur": [130.0, 40.0]})
    add = A.compute_additive_contribution(add_df, add_cfg)
    check("additive contributions sum to 1.0", approx(add["contribution"].sum(), 1.0), f"{add['contribution'].sum()}")
    degen_df = pd.DataFrame({"member": ["x", "y"], "rev_prev": [100.0, 50.0], "rev_cur": [120.0, 30.0]})
    degen = A.compute_additive_contribution(degen_df, add_cfg)
    check("additive degenerate when Δtotal≈0", degen.attrs.get("status") == "degenerate")

    # aggregate_duplicates
    dup = pd.DataFrame({"g": ["k", "k", "j"], "v": [1.0, 2.0, 5.0]})
    agg = A.aggregate_duplicates(dup, ["g"], "sum").set_index("g")
    check("aggregate_duplicates sums dup grain", approx(agg.loc["k", "v"], 3.0))

    check("validate_dual_source flags pool overcount", res["dual_source"]["pool_overcount_factor"] > 1.0,
          f"factor={res['dual_source']['pool_overcount_factor']:.2f}")

    # additive end-to-end (single level, no turnover, comma-formatted measure)
    adf = pd.DataFrame({"month": ["M1"] * 3 + ["M2"] * 3, "seg": ["E", "S", "G"] * 2,
                        "rev": ["1,000", "400", "200", "700", "460", "200"]})
    acfg = {"period": {"column": "month", "prev": "M1", "curr": "M2", "filter_before_validate": True},
            "metric": {"mode": "additive", "name": "Revenue", "measure": "revenue"},
            "attribution": {"partition_column": "seg"},
            "hierarchy": [{"level": "seg", "column": "seg", "source": "dedup"}],
            "noise": {"min_denominator_share": 0.0, "min_abs_explanation": 0.0},
            "sources": {"dedup": {"path": adf, "grain": ["month", "seg"], "role": "denominator_truth",
                                  "aggregate_duplicates": "error", "column_map": {"revenue": "rev"}}}}
    ares = A.run_attribution(acfg, A.prepare_source(acfg["sources"]["dedup"], acfg))
    check("additive end-to-end: total 1600→1360 (−15%)",
          approx(ares["overall"]["prev"], 1600) and approx(ares["overall"]["cur"], 1360),
          f"{ares['overall']['prev']:.0f}->{ares['overall']['cur']:.0f}")
    amap = {m["member"]: m["contribution"] for m in ares["tree"]["members"]}
    check("additive: Ent contribution ≈ +125% (sole drag), sums to 100%",
          approx(amap["E"], 1.25, 1e-3) and approx(sum(amap.values()), 1.0),
          f"E={amap['E']*100:.0f}%")


# ---------------------------------------------------------------------------
# B. Golden regression (engine on synthetic sample vs frozen expected outputs)
# ---------------------------------------------------------------------------
def reach_config():
    cfg = A.load_config(os.path.join(ROOT, "examples/reach-rate.config.yaml"))
    base = os.path.join(ROOT, "examples")
    for s in cfg["sources"].values():
        if not os.path.isabs(s["path"]):
            s["path"] = os.path.normpath(os.path.join(base, s["path"]))
    return cfg


GOLDEN = os.path.join(ROOT, "tests/fixtures/golden_reach")


def _golden_dashboard():
    d = {}
    with open(os.path.join(GOLDEN, "golden_dashboard.csv")) as f:
        for row in csv.DictReader(f):
            d[row["metric"]] = {k: float(row[k]) for k in ("prev", "cur", "wow")}
    return d


def _golden_push_expl():
    with open(os.path.join(GOLDEN, "golden_channel_expl.csv"), encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["member"] == "push":
                return float(row["解释度"])
    return None


def test_golden():
    print("\nB. Golden regression (engine on the synthetic sample vs frozen expected outputs)")
    if not os.path.exists(os.path.join(GOLDEN, "golden_dashboard.csv")):
        print("  [SKIP] golden_reach fixtures not found")
        return
    cfg = reach_config()
    ded = A.prepare_source(cfg["sources"]["dedup"], cfg)
    pool = A.prepare_source(cfg["sources"]["pool"], cfg)

    gd = _golden_dashboard()
    ov = A.compute_overall_metric(ded, cfg)
    check("大盘 rate == golden_dashboard (20.00%→16.75%)",
          approx(ov["rate_prev"], gd["rate"]["prev"], 1e-3) and approx(ov["rate_cur"], gd["rate"]["cur"], 1e-3),
          f"{ov['rate_prev']*100:.2f}% -> {ov['rate_cur']*100:.2f}%")
    fac = ov.get("factors", {})
    check("factor split stable, density-dominant (≈98.6%), shares sum to 1.0",
          fac.get("status") == "ok" and fac.get("shares") is not None
          and approx(fac["shares"]["曝光密度(质量)"], 0.986, 5e-3)
          and approx(sum(fac["shares"].values()), 1.0),
          f"status={fac.get('status')} shares={ {k: round(v, 4) for k, v in (fac.get('shares') or {}).items()} }")

    lvl0 = A.aggregate_to_level(ded, cfg, 0)
    ep = A.compute_ep(lvl0, cfg).set_index("member")
    check("解释度 sums to 1.0 (6 channels)", approx(ep["解释度"].sum(), 1.0), f"{ep['解释度'].sum():.6f}")
    g_push = _golden_push_expl()
    check("push 解释度 == golden (76.15%)", approx(ep.loc["push", "解释度"], g_push, 2e-3),
          f"engine={ep.loc['push', '解释度']*100:.2f}% golden={g_push*100:.2f}%")

    # noise: tiny-volume rate≈0 channel is flagged and is NOT the Top-1 pick
    ranked = A.rank_and_filter(A.compute_ep(lvl0, cfg), cfg).set_index("member")
    check("noise: tiny_noise flagged is_noise, not Top-1",
          bool(ranked.loc["tiny_noise", "is_noise"]) and ranked.index[0] != "tiny_noise",
          f"top1={ranked.index[0]} tiny_noise.is_noise={bool(ranked.loc['tiny_noise', 'is_noise'])}")

    res = A.run_attribution(cfg, ded, pool)
    path = [(n["dim"], n["member"]) for n in res["drilled_path"]]
    check("drill path push → R1",
          path == [("dim_value1", "push"), ("operation_region_code", "R1")], str(path))
    id_expl = res["drilled_path"][1]["解释度"]
    check("R1 region 解释度 ≈ 75.6%", approx(id_expl, 0.756, 5e-3), f"{id_expl*100:.2f}%")

    leaf = res["tree"]
    while leaf.get("child"):
        leaf = leaf["child"]
    check("leaf uses driver_contribution", leaf.get("attribution") == "driver_contribution")
    tn = {t["member"]: t["turnover"] for t in leaf["turnover"]}
    check("turnover: Spring Battle = expired", tn.get("100001") == "expired", f"got {tn.get('100001')}")
    check("turnover: Creator Showcase = shrinking", tn.get("100003") == "shrinking", f"got {tn.get('100003')}")
    check("turnover: Summer Bonus = new (old→new handover)", tn.get("100004") == "new", f"got {tn.get('100004')}")
    check("dual_source pool_overcount ≈ 3.6 (push×R1)",
          approx(res["dual_source"]["pool_overcount_factor"], 3.6, 0.3),
          f"{res['dual_source']['pool_overcount_factor']:.2f}")


if __name__ == "__main__":
    test_synthetic()
    test_golden()
    print()
    if _FAILS:
        print(f"FAILED ({len(_FAILS)}): {_FAILS}")
        sys.exit(1)
    print("ALL PASSED")
