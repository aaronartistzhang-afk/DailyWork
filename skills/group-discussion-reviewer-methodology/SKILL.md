---
name: group-discussion-reviewer-methodology
description: 用一套严格的"产品组会评审"方法论，在对话里直接评审一份 PRD —— 无需 API key、无需运行任何代码。产出双轴结论（组内准入 / 模拟评审结果）+ P0/P1/P2 问题，并对 P0 严格把关（只有真正阻断审批/安全上线/可衡量/方向/交付的问题才算 P0）。当用户要"评审 PRD / 模拟组会评审 / 上会模拟 / 找 P0 阻断项 / 组内准入判断"但没有可用的 LLM key、或更想要一个可照做的思维框架时使用。English triggers: "review this PRD", "simulate a group/product review", "find P0 blockers", "is this PRD ready", "use the group-discussion review framework".
---

# Group Discussion Reviewer — methodology (no key, inline)

Apply a disciplined product **group-discussion review** to a PRD **directly in the
conversation**. No API key, no Node, no code execution — you (the agent) perform the review
by following the written methodology.

> This is the lightweight sibling of the **`group-discussion-reviewer`** engine skill. The
> engine runs the same pipeline deterministically (and gates P0s with code) but needs an
> OpenAI-compatible key. Prefer the engine when a key is available and fidelity matters; use
> this methodology skill when there's no key, or for a quick framework-driven review.
>
> **Honest limitation**: without the engine's deterministic P0 gatekeeper, the strictness of
> P0 downgrading depends on your judgment. Hold the P0 bar hard.

## How to use

1. Get the PRD body as text/markdown (this skill does not fetch URLs or expand sheets).
2. Read **`methodology.md`** in this folder and execute its 8 phases in order.
3. Produce exactly the output contract: `## 组内准入`, `## 模拟评审结果`, `## P0 Blockers`,
   `## P1 Questions`, `## P2 Questions`, `## P1/P2 Improvement Suggestions`.
4. Respect the mode the user asks for (standard / deep / challenge; default challenge) and
   the language (default Chinese).

## The core discipline (summary — full detail in methodology.md)

- **Two independent axes**: 组内准入 (is it concrete enough to discuss?) vs 模拟评审结果
  (would it pass?). A PRD can be admitted and still 不通过.
- **P0 only for four failures**: wrong direction/population, unmeasurable success (for a
  formal decision), unsafe launch, or non-viable delivery — each with a concrete product
  bridge. Everything else (stats audit, SLA/QPS/monitoring, tracking schema, release
  checklist, compliance checklist, naming/icons, missing sections) defaults to **P1/P2**.
- A clean PRD has **0 P0**. Don't inflate P0 to fill a quota.
- Blind review: PRD body only; ignore comments/annotations/post-meeting context. Ask
  questions, don't answer them — except every P0 must include a concrete revision.

Always read `methodology.md` before reviewing; it carries the full P0 gate rules, the
calibration priors, and the reviewer lenses.
