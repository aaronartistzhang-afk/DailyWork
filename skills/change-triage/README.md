# change-triage — a "is it worth doing?" decision table

Turn "here's what we *could* do" into **do now / backlog / skip** — and make the human decide. Every candidate change gets forced into a fixed seven-column table whose **first column is the concrete harm of *not* doing it.** Decision triage, cost-benefit, backlog prioritization — in one repeatable shape.

- **Stack**: pure prompt. No install, no dependencies, no API key.
- **Required**: nothing.
- **Scope**: "a pile of possible changes → a decision the human can sign off on." It doesn't make the change; it frames the choice.

## The problem it kills

AI assistants love to hand you a list of "suggested improvements" with no cost attached — so you can't actually decide. And they'll pop a seven-column table for one obvious one-line fix, which is just noise. This skill enforces the opposite discipline: **a recommendation without its cost is not acceptable**, and the table only comes out when there are genuinely ≥2 optional changes worth weighing.

The harm column has to be evidence — a path, a date, a recurrence count — not "this might be risky." If there's no evidence, the cell says "no known harm," and that item usually gets cut.

## The seven columns

| Column | What it forces |
|---|---|
| Concrete harm now | Already-happening damage, with evidence |
| What fixing it buys | Specific benefit, not "more robust" |
| Cost | Two numbers: files touched + review rounds |
| Improves quality? | Hard yes/no — the human's fastest filter |
| Evidence strength | measured / read the code / inferred / unverified |
| Recommended tier | do now / backlog / skip — **each with its own upside AND downside** |

The "recommended tier" column isn't an arrow at your favorite — every tier (do now / backlog / skip) gets its upside and downside spelled out, so the human picks with the trade-offs in front of them.

## When to use

- "Is this worth doing?" / "what breaks if we don't fix it?" / "what's the necessity?"
- "Here's my backlog — necessity and risk for each?"
- "I can't decide between these — give me the pros and cons of each."
- Before a batch commit, when asked: *"hold on, tell me what you changed and why each was necessary."*

Triggers (bilingual): "不修会怎样" · "值不值得做" · "这几个决策点我无法决策" · "is this worth doing" · "what breaks if we don't" · "triage my backlog" · "help me decide scope/priority".

**Not for:** judging correctness (that's a review gate), a single must-fix bug (just fix it), or bare ordering with no candidate list in context.
