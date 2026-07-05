# codex-review-gate — cross-model read-only review gate

Turn the everyday "run it by another model first" habit into a reusable gate: at each
high-risk step, a **different model** (codex / GPT-5.5) reviews your plan / diff / SQL /
outbound numbers **in a read-only sandbox**, returns an explicit **GO / NO-GO**, and loops
until it converges. The reviewer never writes, executes, or commits — the gate itself is
side-effect-free.

- **Stack**: pure prompt/orchestration. No key of its own; drives the **Codex CLI** you already
  have installed.
- **Required**: [Codex CLI](https://github.com/openai/codex) (verified on `codex-cli 0.142.5`,
  where `-s/--sandbox` and `-c key=value` work). Claude Code environment.
- **Scope**: reviews artifacts you feed it (plan text, a diff, a SQL query, a list of numbers).
  It does not generate PRDs and does not replace human code-review discipline.

## When to use

- A plan is final and you want an independent pass before you build it.
- Implementation is done and you want a diff reviewed **before commit**.
- SQL is about to hit the cluster and you want a fixed 6-item checklist enforced.
- Conclusion numbers are about to go into an outbound doc and need re-derivation.
- You say "老规矩" and want the whole chain (Fable plans → codex gates → Opus implements →
  codex gates the diff → tests).

**Not for**: producing a PRD (that's `debate`), or the general how-to-request/receive code-review
discipline (those are separate skills). This skill is the **cross-model gate mechanism**.

## The four gate modes

| Mode | Trigger | What it enforces |
|---|---|---|
| `plan` | plan finalized, before building | logic holes, missing failure paths, rollback viability, falsifiable acceptance |
| `diff` | implementation done, before commit | correctness bugs, plan-consistency, regressions, edge handling, test coverage |
| `sql` | before a query hits the cluster | a fixed 6-item checklist (join fanout, caliber mixing, empty-partition silent-0, dead branches, collider bias, magnitude anchoring) |
| `numbers` | before numbers go outbound | re-derive every conclusion number; unit / pp-vs-% / numerator-denominator / cross-reference / Σ closure |

A full-flow mode ("老规矩") chains them end-to-end with the model split fixed: **Fable drafts,
GPT-5.5 reviews, Opus implements** — cross-model coverage of each other's blind spots is the
whole point.

## How to invoke

Install (see repo root README), then just say it in natural language:

```
让 codex review 一下这个方案        # → plan gate
commit 前审一下 diff                # → diff gate
这个 query 上集群前过一遍           # → sql gate
这些数字对外前复算一下             # → numbers gate
老规矩                             # → full flow
```

Under the hood every review runs:

```bash
codex exec - --sandbox read-only \
  -c model=gpt-5.5 \
  -c model_reasoning_effort=xhigh \
  --skip-git-repo-check
```

read-only + background + stdin-fed + auto-retry-once. The reviewer emits a machine-extractable
last line `VERDICT: GO` / `VERDICT: NO-GO`; on NO-GO the skill loops (fix → re-review), escalating
to you after 3 non-converging rounds.

## Sample output

```
[plan gate — round 1]
[B1] Rollback step doesn't cover the half-migrated state (evidence: §4 step 3). Fix: add a
     reverse-migration or a feature-flag cut so a mid-run failure is recoverable.
NITS: acceptance criterion "faster" isn't falsifiable — pin a threshold.
VERDICT: NO-GO

[plan gate — round 2, after fix]
VERDICT: GO
```

## Required scopes / secrets

None. No Lark scopes, no API key managed by this skill. It only shells out to your local
Codex CLI. (Optional: `lark-cli` if you want the "upgrade-failed → DM alert" path.)

## Known limitations

- Requires Codex CLI installed and on PATH; if `--sandbox` is absent on your version, fall back
  to the equivalent config (`-c sandbox_mode=read-only`) — never fall back to a writable sandbox.
- xhigh reviews of long docs / big diffs routinely run >10 min; they run in the background, so
  don't expect an instant verdict.
- It is a **gate**, not a generator — it reviews what you feed it and never authors content.
