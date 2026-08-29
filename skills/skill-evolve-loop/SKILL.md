---
name: skill-evolve-loop
description: "Use when sedimenting a lesson from a real run into an existing skill, or when a skill was just edited and needs a post-change regression before it ships. Post-edit regression / skill evolution: locate the smallest section to change, propose the diff first, then run five classes of behavior tests (routing / regression / discipline / content / gate-under-pressure) via parallel subagents, and backfill only what failed. 触发词：沉淀到 skill 里边 / 把这轮教训写进 skill / skill 更新了跑一轮验证 / 改后回归 / 五类行为测试。English: “fold this lesson into the skill”, “post-change regression”, “did my skill edit break anything”. Not for writing a brand-new skill from scratch, and not for blind-repro acceptance of a packaged skill (that's a blind, isolated reproducer's job)."
metadata:
---

# skill-evolve-loop — sediment a lesson into a living skill, then prove you didn't break it

Editing a skill that already ships is not the same as writing one: you can break behavior that used to work, and another session may be mid-edit on the same file. This loop covers the *edit path*: fold one lesson in, run a five-class regression, backfill only what failed.

## When this triggers

- The human says: "沉淀到 skill 里边" / "把这轮教训写进 skill" / "skill 更新了跑一轮验证" / "fold this lesson into the skill".
- Or: a deliverable just finalized and a lesson is worth keeping — propose the sedimentation round yourself; don't wait to be asked.

## The five-class behavior test

After a skill edit, spin up N parallel subagents — one class each — produce a pass table, then backfill only the failed classes. The **five class names come from a real user's verification design**; the one-line criterion under each is this skill's operationalization:

| Class | Operational check | Example |
|---|---|---|
| **Routing** | New trigger words hit; old scenarios don't stop routing here | A "sediment this lesson" request routes to the edited skill; an unrelated request doesn't |
| **Regression** | Old behavior unchanged — same prompt against the pre-edit version gives the same result | A prompt that used to produce a 3-step flow still produces 3 steps |
| **Discipline** | The skill's hard constraints (gates, taboos) are still obeyed after the edit | A send-gate the skill mandates still blocks an unstamped send |
| **Content** | The newly-added content is itself correct — quotes match their sources, commands actually run | Every quotation `grep -F`-matches its cited source; every shell snippet runs |
| **Gate-under-pressure** | Under adversarial pressure the gate still holds, not just on the happy path | A crafted bypass attempt is still refused |

## The flow (five steps)

1. **Locate the smallest section to change** — one rule, one taboo row, one trigger line. Don't rewrite the skill.
2. **Propose the diff** — show it and wait for confirmation. A shared skill is inherited by every future session; edits are propose-first.
3. **Run the five classes** as isolated parallel subagents.
4. **Produce the pass table** — one row per class, pass/fail, with evidence.
5. **Backfill only the failed classes**; re-run until the table is clean.

## Guardrails (from real usage)

- **Say how the verification runs and where output goes, *before* running.** If a test sends anything externally (e.g. a chat message), it goes to the **test group only** — the production channel is never touched by a verification run.
- **The abstraction dial has two failure modes**: too concrete ("hard-coding one run's table names as if they were the method") and too abstract ("stripping out how to actually fetch the data and compute the numbers"). The resolution: **method is fixed; table/field names are looked up fresh at run time; always include the data-fetch command and the calculation code.**
- **Re-read the latest version before writing.** Another session may have edited the same skill since you last read it — write on a stale read and you overwrite their edit.

## What NOT to sediment

- **One run's specifics** — this run's table names and join keys are data, not method. Sediment the method; look up specifics fresh.
- **A project convention** — a group ID or a house metric definition belongs in that project's own config, not a cross-project skill.
- **A mechanical constraint that should be code** — if a regex, validator, or hook can enforce it, automate it; documentation is for judgment calls.
- **A one-off you won't hit again** — a note is enough; editing a shared skill is a cost every future session pays on load.

If the lesson survives all four, it's a real skill edit — proceed.

## Worked example (one evolve pass)

Lesson: a gate skill let an unstamped message through because it matched a substring of the whole command line instead of the parsed subcommand.

1. Locate: exactly one paragraph (the "unit of judgment" note). 2. Propose the one-paragraph diff, get a yes. 3. Run five subagents. 4. Table: routing PASS · regression PASS · discipline PASS · **content FAIL** (the added regex doesn't compile on BSD grep) · gate-under-pressure PASS. 5. Fix the regex, re-run *content only* → PASS. Ship.

The point: without the table, the regex bug ships silently — the gate still *behaves* right on the happy path. Regression and content are the classes that catch "the edit looked fine but broke/added something wrong."

## Boundary

- **Not blind-repro**: this loop is the **author** testing their own edit (you know the answers; you check compliance). Verifying that a *packaged* skill reproduces in a clean environment for someone with no context is a blind, isolated reproducer's job — a different discipline with a different output (a defect list).
- **Not skill creation**: writing a new skill from scratch has its own workflow; this loop starts from a skill that already ships.
