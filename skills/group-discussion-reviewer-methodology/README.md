# Group Discussion Reviewer — methodology

A no-dependency, **no-key** skill: apply a disciplined product **group-discussion review** to
a PRD directly in conversation. The agent performs the review by following
[`methodology.md`](methodology.md) — there is no code to run.

This is the lightweight sibling of the runnable
[`group-discussion-reviewer`](../group-discussion-reviewer/) engine skill.

| | methodology (this skill) | engine skill |
|---|---|---|
| Needs an API key | **No** | Yes (OpenAI-compatible) |
| Runs code | No — agent reasons inline | Yes — Node pipeline |
| P0 gate | your judgment (hold the bar) | deterministic gatekeeper |
| Best for | quick framework review, no key | high-fidelity, repeatable review |

- **Stack**: none — pure prompt/methodology.
- **Required**: nothing.
- **Scope**: reviews already-extracted PRD **text/markdown**; it does not fetch Lark/Feishu
  URLs or expand embedded sheets.

## Install

### Claude Code

Copy this folder to `~/.claude/skills/group-discussion-reviewer-methodology/`. It activates on
prompts like "评审这个 PRD / 模拟组会评审 / find the P0 blockers / use the group-discussion
review framework". The agent reads `methodology.md` and produces the review.

### Manual (any agent)

Paste the contents of `methodology.md` into your agent as context, then ask it to review your
PRD following that methodology and output the standard sections.

## Output

```
## 组内准入            是 / 否        — concrete enough to discuss?
## 模拟评审结果          通过 / 有条件通过 / 不通过
## P0 Blockers          — true approval blockers only; "无 P0" if none
## P1 Questions
## P2 Questions
## P1/P2 Improvement Suggestions
```

The two axes are independent: a PRD can be admitted (是) and still be 不通过.

See [`methodology.md`](methodology.md) for the full 8-phase process, the P0 gate rules, the
calibration priors, and the reviewer lenses.
