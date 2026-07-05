# Blind A/B — reward-surfacing rule (some agent project) — contamination-proof. RESULTS + honest verdict

> Sanitized example. Real project name generalized, counts fuzzed, run/trace ids removed.
> Read this as a template for: the results table, a PASSED positive control, and the
> textbook honest fallback ("the main lift is UNPROVEN at prompt level, escalate to live-RPC").

## Run 元信息
- Run ID: `<run-id-redacted>`
- N 与输入构成: ~10 en inputs (≈6 promotable-drop / ≈2 governance-suppressed / ≈2 none) × {OLD, NEW} isolated arms + independent blind quality judge
- 分臂版本 pin: OLD = generator baseline; NEW = generator + explicit reward-surfacing step (versions pinned per arm in the real run)
- 跨臂 constant 的变量: region-localization skill held constant
- 阳性对照: **PASSED**（judge picked the obviously-good option → calibrated）
- 阴性对照: role=NONE campaigns（本不该 surface 奖励）
- 打分: deterministic scoring via a reward-validation checker (no LLM grading)

## 结果表
| metric | OLD | NEW | read |
|---|---|---|---|
| **Surface-compliance** (promotable_drop, role=PRIMARY) — P(≥1 surfaces) | **1.00** | **1.00** | — |
| same — P(both candidates surface) | **1.00** | **1.00** | — |
| **Negative control** (role=NONE: must NOT surface a reward) — candidates surfacing a reward | **~7/8** | **~1/8** | ✅ NEW win |
| **Governance scrub** — disallowed-reward framing | 0 / 0 | 0 / 0 | clean |
| **Blind quality** (NEW vs OLD, independent judge) — "better" count | **6** | 4 | ⚠️ NEW slightly worse |
| forced/awkward reward mentions | 2 | 3 | ⚠️ |

## The decisive finding: the prompt-level A/B CANNOT measure the main lift
**Both arms surface the promotable reward 100% of the time.** The OLD isolated generator — given only the reward field in the input and no reward step — *already* writes the reward on its own. So **at this fidelity there is no drop for NEW to fix.**

This means the production drop is **NOT** caused by the generator prompt lacking a reward instruction. It is a **full-pipeline phenomenon** — some combination of: the loaded downstream skills shedding the reward, a length-cap field-DROP deleting reward-bearing text, and the judge/orchestrator candidate selection shipping the rewardless candidate. An isolated generator strips all three, so it can't reproduce the bug. This is exactly the "fidelity ladder" caveat — and it bit: **prompt-level is the wrong instrument for the main lever; only the live-RPC full pipeline (eng-gated) can validate the lift.**

## What the A/B DID validate (real, at this fidelity)
1. **NEW suppresses reward-hallucination** — on no-reward / suppressed campaigns, OLD *invents* a reward in ~7/8 candidates; NEW in ~1/8. The "if NONE/suppressed → mention no reward" rule works and is governance-relevant (OLD fabricates rewards that don't exist).
2. **Governance clean** both arms (0 disallowed framing) — surfacing pressure did not produce a governance regression.
3. **⚠️ Naturalness cost**: NEW lost the blind quality comparison 6–4 with +1 forced/awkward reward mention. Because OLD already surfaces (no benefit gap here), NEW's explicit step only added forcing → net slightly worse. The reward step should be retuned to "surface naturally only if it improves the message, never force it."

## Fidelity ceiling
Prompt-level only — NOT the live multi-agent pipeline. Anything that depends on downstream pipeline behavior (multi-skill field shedding, length-cap field-DROP, judge/orchestrator selection) is UNPROVEN here and needs the deployed service as an eng-gated custom_rpc_server experiment. N is a small deterministic spot check (not a rate); en only.

## Caveats（引用本 packet 时必须一并携带）
1. prompt-level, not the live pipeline; downstream tools did not execute.
2. main-lift row is untestable at this fidelity (both arms 100% → no drop to fix in isolation).
3. synthetic + en only; other locales are higher risk and need native review.
4. small-N deterministic spot check, not a rate/percentage.

## Net verdict
1. **Methodology: sound** (isolation held, positive control passed, deterministic scrub + blind judge).
2. **Main-lift claim: UNPROVEN at prompt level** — and now known to be unprovable here, because OLD doesn't drop in isolation. Escalate the lift measurement to the **live-pipeline RPC** (request eng's custom_rpc_server target, or mine post-release traces with the frozen detector).
3. **Net signal**: the suppression-control is a clear win; the forced-surfacing is a yellow flag to retune. Do **not** read "both arms 100%" as "the fix is unnecessary" — it means the bug lives downstream of the generator prompt, which reframes the fix: the reward step alone is insufficient; the judge hard-fail enforcement + the field-DROP fix carry more of the load than the plan credited.
Ship 判据: NEW's suppression win + no governance regression → the suppression rule ships; the forced-surfacing needs retune before the surfacing step ships.
