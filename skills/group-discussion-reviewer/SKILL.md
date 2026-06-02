---
name: group-discussion-reviewer
description: 模拟产品组会评审一份 PRD —— 多评审员流水线 + 严格的 P0 门禁，产出双轴结论（组内准入 / 模拟评审结果）和 P0/P1/P2 问题清单。当用户要"评审 PRD / 模拟评审 / 组会评审 / 上会模拟 / 看看这个 PRD 能不能过 / 找 P0 阻断项 / 组内准入判断"，或给出一段 PRD 正文/markdown 想要严格的产品评审反馈时使用。高保真版：运行打包好的评审引擎（需要一个 OpenAI 兼容的 API key）。Triggers also include English: "review this PRD", "simulate a group/product review", "is this PRD ready to ship", "find P0 blockers", "group-discussion review".
---

# Group Discussion Reviewer (engine)

Simulate a sharp product **group-discussion review** of a PRD. This is the high-fidelity,
runnable engine: an 8-phase pipeline (Fact Ledger → Scenario Signals → Reviewer Roles →
independent reviewers → Judge → P0 Gatekeeper + calibration → Final Composer) that ends in
a **two-axis verdict** and a prioritized question list.

> **Scope**: this engine reviews **already-extracted PRD text / markdown**. It does **not**
> fetch Lark/Feishu (or any) URLs and does **not** expand embedded sheets. Export or paste
> the PRD body first, then feed it in.

## When to use

- The user wants a PRD stress-tested the way a real product group review would.
- They ask whether a PRD can pass, what the P0 blockers are, or whether it's concrete
  enough to even enter group discussion (组内准入).
- They want disciplined severity (P0 reserved for true approval blockers; everything else
  P1/P2), not a generic checklist.

If there is no API key available, or the user just wants the review *framework* applied
in-conversation, use the sibling skill **`group-discussion-reviewer-methodology`** instead.

## Setup (one-time)

Requires Node ≥ 20 (no npm dependencies) and an OpenAI-compatible API key.

```bash
cd skills/group-discussion-reviewer
cp .env.example .env   # then fill in OPENAI_API_KEY
npm test               # optional: 183 offline tests should pass
```

Environment:

| Var | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | — (required) | The API key. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Set to your own OpenAI-compatible gateway. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Any chat/completions model id. |
| `OPENAI_AUTH_STYLE` | `bearer` if no base url, else `query` | `bearer` = `Authorization` header; `query` = key as `?ak=` (for gateways that take the key in the URL). |

## How to run

```bash
# review a PRD file (challenge mode, Chinese, full depth)
node bin/review-prd.mjs --file path/to/prd.md

# pipe from stdin; only the P0 section, in English
cat prd.md | node bin/review-prd.mjs --mode standard --depth p0 --lang en

# full JSON (review + usage + cost). add --artifacts to include internal pipeline detail
node bin/review-prd.mjs --file prd.md --json
```

Options: `--mode standard|deep|challenge` (default `challenge`), `--depth full|p0`,
`--lang zh|en`, `--type auto|workflow|experiment|data|gtm|placement|ai|growth|incentive|monitoring`,
`--json`, `--artifacts`, `--help`. By default the CLI prints **only** the final review;
internal artifacts (fact ledger, judge decision, gate decisions) are shown only with
`--json --artifacts`.

## What you get

A markdown review with a stable structure:

- `## 组内准入` — **group admission**: is the PRD concrete enough to enter group discussion
  (是/否)? Independent of whether it passes.
- `## 模拟评审结果` — **simulated review result**: 通过 / 有条件通过 / 不通过.
- `## P0 Blockers` — only true approval blockers (wrong target, unmeasurable success,
  unsafe launch, non-viable delivery). A clean PRD has **0 P0**.
- `## P1 Questions` / `## P2 Questions` / `## P1/P2 Improvement Suggestions` (full depth).

A PRD can be admitted (组内准入：是) and still be 不通过 — the two axes are separate.

## How it works (for agents reasoning about output)

`bin/review-prd.mjs` → `src/openaiReview.mjs` → `src/multiReviewerPipeline.mjs`. The Judge
merges independent reviewer findings; a deterministic **P0 Gatekeeper**
(`src/p0Gatekeeper.mjs`) + calibration (`src/productReviewCalibration.mjs`) downgrades any
P0 that can't prove a concrete product approval bridge, so verdicts stay disciplined. See
the `group-discussion-reviewer-methodology` skill for the full written methodology.
