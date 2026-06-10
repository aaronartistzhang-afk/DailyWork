#!/usr/bin/env python3
"""
CLI wrapper for the attribution engine.

  python scripts/run_analysis.py --config examples/reach-rate.config.yaml
  python scripts/run_analysis.py --config my.yaml --json out.json

Loads the config, prepares each source (load -> column_map -> period filter ->
dedup), runs the attribution, and prints a markdown narrative (+ optional JSON).
Source paths in the config are resolved relative to the config file's directory.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import attribution as A


def _resolve_paths(config, base_dir):
    for src in config.get("sources", {}).values():
        p = src.get("path")
        if isinstance(p, str) and not os.path.isabs(p):
            src["path"] = os.path.normpath(os.path.join(base_dir, p))


def _pct(x):
    return "n/a" if x is None or (isinstance(x, float) and x != x) else f"{x*100:.2f}%"


def narrative(result, config):
    m = config["metric"]
    higher_better = m.get("direction", "higher_is_better") == "higher_is_better"
    ov = result["overall"]
    lines = [f"# {m.get('name','metric')} — {config['period']['prev']} → {config['period']['curr']}", ""]

    if ov.get("mode") == "additive":
        lines.append(f"**Overall**: {ov['prev']:,.0f} → {ov['cur']:,.0f}  (WoW {_pct(ov['wow'])})")
    else:
        lines.append(f"**Overall (大盘)**: {_pct(ov['rate_prev'])} → {_pct(ov['rate_cur'])}  "
                     f"(WoW {_pct(ov['wow'])})")
        if ov.get("factors") and ov["factors"].get("shares"):
            fl = ", ".join(f"{k} {v*100:.0f}%" for k, v in ov["factors"]["shares"].items())
            lines.append(f"  - factor split: {fl}")
    lines.append("")

    # drilled Top-1 path
    if result.get("drilled_path"):
        lines.append("**Top-1 drill path:**")
        for n in result["drilled_path"]:
            role = ""
            if n.get("解释度") is not None:
                contributes_down = (n["解释度"] > 0)
                drag = (contributes_down == (not higher_better)) if False else None
                role = f" — 解释度 {_pct(n['解释度'])}"
            lines.append(f"  - {n['dim']} = **{n['member']}**{(' ('+str(n.get('label'))[:40]+')') if n.get('label') and n.get('label')!=n['member'] else ''}{role}")
        lines.append("")

    # per-level members
    node, lvl = result["tree"], 0
    while node is not None:
        head = f"### Level {lvl}: {node['dim']} ({node.get('attribution')})"
        lines.append(head)
        for r in node.get("members", [])[:8]:
            label = str(r.get("label", r.get("member")))[:46]
            score = r.get("解释度", r.get("contribution"))
            tag = "  ⟂noise" if r.get("is_noise") else ""
            rate = f" rate {_pct(r.get('rate_prev'))}→{_pct(r.get('rate_cur'))}" if "rate_cur" in r and "rate_prev" in r else ""
            lines.append(f"  - {label}: {_pct(score)}{rate}{tag}")
        if node.get("turnover"):
            lines.append("  turnover:")
            tn = {t["member"]: t for t in node["turnover"]}
            for r in node.get("members", [])[:6]:
                t = tn.get(r["member"], {})
                lines.append(f"    - {str(r.get('label', r['member']))[:40]}: {t.get('turnover','?')}"
                             f" ({t.get('driver_prev',0):,.0f}→{t.get('driver_cur',0):,.0f})")
        lines.append("")
        node = node.get("child")
        lvl += 1

    if result.get("warnings"):
        lines.append("**Warnings:**")
        lines += [f"  - {w}" for w in result["warnings"]]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--json", help="also write the full result tree as JSON to this path")
    args = ap.parse_args()

    config = A.load_config(args.config)
    _resolve_paths(config, os.path.dirname(os.path.abspath(args.config)))

    dedup = A.prepare_source(config["sources"]["dedup"], config)
    pool = None
    if "pool" in config["sources"]:
        pool = A.prepare_source(config["sources"]["pool"], config)

    result = A.run_attribution(config, dedup, pool)
    print(narrative(result, config))
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=float)
        print(f"\n[json written to {args.json}]")


if __name__ == "__main__":
    main()
