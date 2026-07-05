# Blind A/B — region-aware emoji (generator + judge, some agent project) — contamination-proof

> Sanitized example. Real project name generalized, region codes anonymized (region-A..region-E),
> version numbers fuzzed, ids removed. Read this as the template for: the 分臂三铁律 + version pin +
> cross-arm constant + manipulation check (mechanism proof) + explicitly-marked confounded rows +
> "Caveats must travel with any citation" + superseding the contaminated single-agent rounds.

**What shipped:** generator (new minor), components skill (new patch), scoring skill (new patch). Change: emoji presence/count/placement now defer to the active region localization policy; default placement END (end-emoji helps CTR, start-emoji hurts); omission allowed where region policy is optional/discouraged.

**Method (contamination-proof, per methodology review):** each arm runs in a **separate, blind** execution (no variant label, no hypothesis, no expected-result in the prompt); **skill versions pinned per arm** (OLD = generator-baseline + components/scoring-baseline; NEW = generator-new + components/scoring-new); region localization skill held **constant** across arms; objective metrics scored by a **deterministic Unicode checker** (no LLM grading); a **manipulation check** confirms the injected region policy actually drives behavior. Prior A/B rounds used a contaminated single-agent-does-both method and are **superseded** by this report.

**Fidelity ceiling (honest):** prompt-level only — NOT the live multi-agent pipeline (orchestrator loop + skill-load + scoring/causal-check tools do not execute here). True end-to-end still needs the deployed service as an eng-gated custom_rpc_server experiment target.

---

## Part 1 — Generator A/B (deterministic emoji-placement check)

Same campaign input per region, region skill constant, only generator+components version differs.

| Region | OLD (baseline) | NEW (new) | Result |
|---|---|---|---|
| region-A | START `🎯 Today's LIVE challenge…` | **END** `…is open 🔥` | clean START→END flip |
| region-B | START `🏆 The leaderboard race begins` | **END** `…begins 🔥` | clean START→END flip |
| region-C | START `🏆 …` | NONE (omitted) | NEW omitted (region-C=optional → policy-valid, not an END demo) |
| region-D | NONE | NONE | confounded (region skill, held constant, is "discouraged" → both arms omit) |
| region-E | NONE | NONE | confounded (same) |

**Manipulation check (proves the mechanism, not a fluke):**
- inject "emoji REQUIRED, placement START" → NEW generator produces START emoji
- inject "emoji discouraged" → NEW generator omits emoji

The injected region policy genuinely drives placement/presence under the new generator (overrode the END default to START when told, omitted when told discouraged). The result is region-policy resolution, not a model default.

**Read:** the clean, uncontaminated proof of the placement flip is **region-A + region-B** (emoji present in both arms, so only placement differs → START vs END is caused by the change). **region-D/region-E are confounded** — the constant region skill is "discouraged" and even the OLD-components arm honored it; these rows neither prove nor disprove the change.

---

## Part 2 — Judge A/B (scoring baseline vs new; judge prompt constant; no region policy injected)

| Candidate | OLD scoring (baseline) | NEW scoring (new) |
|---|---|---|
| no-emoji (region-D) | soft_penalty — "omission violation, required min 1 emoji not met" | acceptable — omission NOT a violation |
| START-emoji | soft_penalty, placement-blind | soft_penalty + scoring-skill start_placement_penalty |
| END-emoji | acceptable (presence met) | acceptable, rewards END placement |

**Clean isolated proof (no-emoji, OLD vs NEW):** same candidate, same judge, only scoring version differs → OLD penalizes the no-emoji copy as an omission violation; NEW does not. The scoring change works as intended. NEW also adds a self-contained placement rule (START−, END+) absent in OLD.

---

## Follow-up gap surfaced (for eng)
NEW scoring repeatedly reported it **could not determine the region emoji policy because the judge does not load the region localization skill.** Consequence: it handles placement correctly and stops auto-penalizing omission, but it **cannot enforce region presence/max/avoid** — it defaults to "no presence penalty" (correct for discouraged/optional regions, but would fail to flag a missing emoji in a `required` region). **Fix:** route the region emoji policy to the judge, mirroring the generator's step.

## Caveats (must carry with any citation of this report)
1. Prompt-level, not the live multi-agent pipeline; scoring/causal tools didn't execute — full end-to-end needs the eng-gated custom_rpc_server run.
2. region-D/region-E generator rows are confounded by the constant region skill; the clean placement proof is region-A/region-B + the manipulation check.
3. Omission behavior validated on synthetic input + the manipulation check (no real region-D/region-E traces exist); real-input coverage was region-A/region-B only.
4. Small-N deterministic spot check, not a rate/percentage.
5. Supersedes the earlier contaminated single-agent A/B rounds.

## Net verdict
The change does what it intends at the prompt level: **generator flips emoji START→END and omits per region policy (region-A/region-B clean + manipulation check); judge scoring stops treating omission as a violation and adds placement scoring.** One concrete follow-up: the judge needs the region emoji policy routed to it to enforce region presence rules. Live full-pipeline confirmation remains eng-gated.
