---
name: change-triage
description: "Use when the user has to decide which of several candidate changes are worth doing, or when this session is about to propose two or more optional changes and needs the user to pick scope, cost, or priority. Decision triage / cost-benefit / backlog prioritization: force every candidate into a fixed table whose first column is the concrete harm of NOT doing it. 触发词：「不修会怎样」「做的必要性是什么」「值不值得做」「列举 backlog 每项必要性/风险」「这几个决策点我无法决策」“先别送了，你先说明一下你今天都在改什么”“这些候选改动哪个先做”。English triggers: “is this worth doing”, “what breaks if we don't”, “necessity of this change”, “triage my backlog”, “help me decide scope/priority”. 不适用：审对不对（use a review gate）、单个明显必修的 bug（直接修）、纯排序没问代价（“哪个先做”无候选上下文）。"
metadata:
---

# change-triage — a "is it worth doing?" decision table

Turn "here's what we *could* do" into "do this now / this goes to backlog / skip this" — **and the human makes the call.**

**Core rule: a recommendation without its cost is not acceptable.** Every row must answer *"what happens if we don't?"*, and the answer has to be **the concrete harm happening now**, not "there might be a risk."

This is the table form of one principle: **when you propose a change, you must state the cost of not doing it.** This skill gives that principle a fixed shape so it can't be skipped.

## When to use

- The human asks whether something is worth it: *what breaks if we don't fix it / what's the necessity / I can't decide between these.*
- The human wants each backlog item's necessity and risk laid out.
- **The only condition for entering this on my own initiative**: I am about to propose **≥2 optional changes**, **and** I need the human to decide **scope / cost / priority**.

**Not for:**
- **Judging correctness** → that's a review-gate job. A gate judges *"is it right?"*; this table answers *"is it worth it?"* — two different questions.
- **A single obviously-must-fix bug** → just fix it, don't pop a seven-column table.
- **Pure ordering with no cost question** (a bare "which first?" when there's no candidate list in context) → ask what the candidates are first; don't invent a table.

> ⚠️ **Don't pop the table for every issue you spot.** A seven-column table for one obvious fix reads as noise, not help.

---

## The fixed table (seven columns, none may be dropped)

| Item | Concrete harm now (with evidence) | What fixing it buys | Cost (blast radius + review rounds) | Improves quality? | Evidence strength of this call | Recommended tier (do now / backlog / skip) |
|---|---|---|---|---|---|---|
| <one line> | <what already happened, with path/date/count> | <specific benefit> | <how many files + expected review rounds> | yes / no | measured / read the code / inferred / unverified | do now / backlog / skip |

**Column-by-column rubric**

1. **Concrete harm now** — must be **already happening** or **certain to happen next time**, with evidence (file path, date, recurrence count). If you can't produce evidence, write "no known harm" in that cell — don't pad it with adjectives.
2. **What fixing it buys** — a specific benefit, not "more robust."
3. **Cost** — two numbers: **how many files** (blast radius) + **expected review rounds**.
4. **Improves quality?** — just "yes/no." This is the column the human uses as a sieve: a vague "somewhat helpful" breaks the sieve. Expect the human to knock out half the list with this one column.
5. **Evidence strength** — how hard is this call: measured / read the code / inferred / unverified.
6. **Recommended tier (do now / backlog / skip)** — **all three tiers get their upside and downside written out; none may be dropped:**

   | Tier | Upside | Downside |
   |---|---|---|
   | **Do now** | Stops the bleeding immediately; context is still warm, cheapest to change | Eats this round's blast radius and review budget, crowds out other work |
   | **Backlog** | No new risk this round; wait until evidence piles up | Harm keeps accruing; re-picking it up after context goes cold costs more, and backlogs sink |
   | **Skip** | Zero cost, introduces no new defect | Harm stays forever; next time it bites, nobody remembers why "skip" was the call |

   The table above is **three questions every tier must answer**, not answers to copy — fill each tier with the specifics of *this* item's evidence. A table that only points an arrow at the recommendation, or only opens "do now / skip" and drops the backlog tier, does not qualify.

**One closing line of recommendation**: one sentence on which to do first and why it's that one. **It's only a suggestion — the human makes the call.**

---

## Before a batch commit / outbound send

When you're told to stop, answer "what did I change" first, then "why" — one item per line:

> "Hold on — before you send, tell me what you changed today and why each change was necessary."

The order is **list first, reasons second.** Leading with reasons and no list leaves the human not knowing what you touched. Use absolute paths in the list, not "that file."

---

## Guardrails (from real usage)

- **Never give a recommendation alone** — always with its cost of not doing it.
- **Tag each item's "improves quality?"** — this is the human's fastest filter; keep it a hard yes/no.
- **Before a batch commit, say what you changed first** — list, then reasons.

---

## Related

- A **cross-model review gate** judges *"is it right?"* — this triage answers *"is it worth it?"* first; the gate's turn comes after the human has picked from the table.
