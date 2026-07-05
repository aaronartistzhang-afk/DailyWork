# audience-brief — audience-tiered message packager

Take a finding / change / status / plan you already have in the current conversation and package
it into **one paste-ready Feishu/Lark message** aimed at a specific audience: **RD (研发)**,
**运营 (ops)**, **老板 (boss)**, or a **local team**. Pure orchestration — it doesn't fetch data,
write files, or send. It drafts, stops at a preview, and lets you send it yourself.

- **Stack**: pure prompt. Calls the `humanizer` skill for the ops/boss tiers.
- **Required**: nothing to install beyond the skill (and `humanizer` for ops/boss polish).
- **Scope**: "current-context content → audience-shaped message". No analysis, no send.

## The problem it kills

Every outbound message used to need a second-round correction: RD wants English, ops wants plain
Chinese, boss wants it short, evidence needs version numbers and paths. "用英语" alone showed up
as a follow-up correction ~6 times. This skill freezes those tier rules so the first draft is
already right.

## The four tiers

| Tier | Language | Length | Evidence | humanizer |
|---|---|---|---|---|
| **RD** | English | 2–4 sentences | version + trace_id + file path/name (all required) | no |
| **运营 ops** | plain Chinese | — | concrete numbers; keep real field names | yes |
| **老板 boss** | — | ≤ 5 lines | conclusion-first, decision/impact only | yes |
| **local team** | English or local lang | — | RD's factual style, keep field/region keys, less jargon | — |

## When to use

- Triggers: "整理一段话我发给研发", "给运营的人话版", "发老板", "package this as an RD message",
  "发飞书群", "share 给运营", "我发研发用", "给 local team 的版本".
- You already have the content in this session and just want it shaped for an audience.

**Not for**: content you still need to analyze/audit first (go do that first); actually sending
(this stops at a preview); meeting-minute summaries (that's `meeting-notes`).

## How to invoke

Install (see repo root README), then say it in natural language:

```
整理一段话我发给研发                  # → RD tier (English, version+path+trace_id)
给运营来个人话版                      # → ops tier (plain Chinese, numbers, humanized)
这个发老板                            # → boss tier (≤5 lines, humanized)
给 local team 的版本                  # → local-team tier
```

Variants it supports on the same message: 5-line version, single-paragraph version, and a
bilingual single-send (中英各一段).

## Sample output (RD tier)

```
Found a reward-surfacing drop on promotable campaigns — reward text is present at the generator
but gets shed downstream. Repro'd at prompt level; suspect the length-cap field-DROP + judge
selection. Files: skills/blind-ab-verify/examples/blind-packet-reward-surfacing.md; generator
version pinned in that packet. Suggest we validate the full pipeline via an eng-gated RPC run
before we treat the generator fix as sufficient.
```

Output is paste-clean — no markdown residue (no `**`, no `#`, no code fences), because those turn
into literal characters when pasted into Feishu.

## Required scopes / secrets

None. It doesn't call Lark or any API — it only drafts text and (for ops/boss) invokes the local
`humanizer` skill.

## Known limitations

- It **stops at a preview** by design and never sends — the send is yours (or a separate send
  skill). This is a deliberate hard gate.
- RD tier is not humanized (that would soften technical precision); ops/boss tiers are.
- "humanizer has limits" — it makes text read like a human wrote it, not so casual it drops field
  names. Declared eval field names are quoted verbatim, not paraphrased.
