# Blind A/B — naturalness of a forced-reward fix (some agent project) — contamination-proof

> Sanitized example. Real project + product names generalized, enum labels anonymized, counts kept
> (they carry the pedagogy). Read this as the template for: the four-column blind eval (esp. the
> forced/awkward count), the "tie + do-no-harm not degraded ⇒ ship" rule, and using a do-no-harm
> group (reward presence held) as a hard gate.

User asked whether the reward fix degrades naturalness by forcing the reward in. Measured it (blind judge, positive-control-gated, winner-level outputs). It does — **as first drafted** — and a two-part rewrite clears it.

## The finding
| | jargon NEW (enum-concept labels, bolt-on) | natural NEW2 (consumer phrasing + surface-once) |
|---|---|---|
| Blind quality vs OLD (no-reward) | OLD won **5–1** | **3–3 tie** |
| NEW forced/awkward reward flag | **5/6** | **1/6** |
| Reward presence in shipped winner | 100% | **100% (6/6)** |
| Positive control | pass | pass |

**Reward presence held at 6/6 in NEW2** — naturalness was recovered WITHOUT dropping the reward (the failure mode we explicitly guarded against).

## Root of the naturalness cost (two causes, both fixable)
The blind judge flagged the **exact enum-concept labels** as jargon: the operational label for a physical prize (vs "a real prize"), the literal internal term for a credit (vs "bonus credits to spend"), an opaque product-name token (personified as "your <product token> is one task away"), a generic system term tacked onto a competition hook as a dangling clause. And they were **repeated in title AND content** → promotional/spammy. The one that always worked, **"cash prize"**, is natural consumer language that rides the leaderboard stake.

## The two requirements (now proven necessary)
1. **Consumer-facing label, NOT the operational enum-concept.** Use a natural-phrasing column distinct from the internal concept. This is precisely why **native/copywriter sign-off on labels is a P0** — the machine "concept" is jargon.
   | primitive | enum-concept (jargon, failed) | consumer phrasing (passed) |
   |---|---|---|
   | physical-reward | `<internal-physical-label>` | **a real prize** |
   | credit | `<internal-credit-label>` | **bonus credits to spend** |
   | event | `<internal-event-label>` | **an exclusive event** |
   | custom-gift | `<internal-gift-label>` | **a special gift** (surface once) |
   | money | cash prize | **a cash prize** (already natural) |
   | branded-item | `<product-token>` | **a <product-token>** — keep the product name but don't personify/repeat |
2. **Surface once, integrated, don't force.** One mention (title OR content, never both); woven into the message's flow, not a dangling clause on a competition hook; if it won't read naturally for an angle, soft-generic ("a reward") or skip it for that candidate. Belongs in the generator/components change.

## Plan impact
- The gate-decouple lever is confirmed, but its execution **must pair with (1) + (2)** or it trades silent-drop for forced-jargon (the 5/6 result).
- Keep **do-no-harm quality + native naturalness** as hard gates — they correctly flagged the jargon draft and would block it. NEW2 (tie, 1/6 forced) is the bar to clear.
- Residual: 1/6 still forced + 3/6 OLD-wins on general punchiness (reward line slightly busier) — copy-tuning targets, not systemic. Real per-locale naturalness still needs native review (en here is the easy case; other locales higher risk).

## Caveats
Prompt-level sim, en, N=6, single blind judge (positive-control passed). Direction is strong and consistent; absolute rates need the live pipeline + native review.

## Net verdict
1. **Methodology: sound** (positive control passed, winner-level blind eval, four-column schema incl. forced/awkward count).
2. **Claim proven at this fidelity**: the forced-reward degradation is real (5/6 forced, OLD wins 5–1) and the two-part rewrite clears it (1/6 forced, 3–3 tie).
3. **Net signal**: NEW2 reaches ship condition — **tie on blind quality AND the do-no-harm group (reward presence) held at 6/6**. The first-draft jargon NEW does not (it degrades naturalness). do-no-harm is the hard gate: reward presence must not drop, and it didn't.
Ship 判据: NEW2 ships (tie + do-no-harm reward-presence 6/6 not degraded); the first-draft jargon NEW does not.
