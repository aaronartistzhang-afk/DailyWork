# lark-peer-feedback-drafting — evidence-based peer-feedback drafting (with privacy guardrails)

Help a person who **already holds a formal evaluation/feedback responsibility** — inside a
sanctioned HR process — turn their **own visible** Lark/Feishu collaboration records into a
**fact-based feedback first draft**, backed by a re-checkable **evidence ledger**. Retrieval is
tiered to control quota and minimize data. **A human sets the rating, finalizes the wording, and
submits** — the skill only drafts and stops at preview.

> **Unofficial.** Not affiliated with, endorsed by, or supported by Lark, Feishu, or ByteDance.

- **Stack**: Lark CLI · sub-agents · pure prompt (no code to run beyond `lark-cli` calls).
- **Required**: `lark-cli` installed and authenticated as **your own user** (`--as user`). A
  subject person, an evaluation period, and a whitelist of group chats.
- **Scope**: the **draft + evidence ledger** only. The skill never scores automatically, never
  submits, and never reads anything your own identity cannot already see.

## What it does

1. **Authorization gate first.** Five explicit confirmations (formal responsibility, policy
   compliance, scope specified, not-for-prohibited-uses, own-identity-only) + a read-back. Any
   "no" → it refuses.
2. **Tiered retrieval** (`scoped` default / `expanded` / `custom-allowlist`) — each prints a
   budget estimate and a "what you'll miss" note before running. **No "auto-scan all groups".**
3. **Evidence mining** via `lark-cli`, bounded to the period, using **only your own identity**.
4. **Structured evidence ledger** with re-checkable locators, quote-vs-paraphrase flags, and
   verified/unverified status.
5. **Spot-check / verification** — sampled rows become "verified"; the rest stay flagged and are
   never cited as if verified.
6. **Fact-based draft** — "how they work" + values dimensions + a short message, run through a
   humanizer + idiomatic-language pass.
7. **Preview & STOP** — you set the rating, edit the wording, and submit yourself.
8. **Lifecycle cleanup** — temp files force-deleted on completion/failure/cancel/timeout; derived
   data stays local and short-lived, with a one-click delete.

## When to use

- You are a **designated evaluator / peer reviewer** for a colleague inside a real HR cycle, and
  you want a first-cut draft grounded in first-hand collaboration facts instead of vibes.
- You want the facts in a **re-checkable ledger** so your write-up is defensible and honest.
- You want to **control quota / token cost** with an explicit retrieval budget.

## When NOT to use

- **Covert investigation, surveillance, or monitoring** of a colleague. → Not this tool.
- **Disciplinary evidence-gathering** or building a case against someone. → Not this tool.
- **"Digging up dirt"** or fishing for negatives. → Not this tool.
- Evaluating **sensitive/protected attributes** (health, religion, sexual orientation, union
  activity, pregnancy, etc.). → Not this tool.
- Reading chats you are **not a member of**, or using a **bot/admin/someone else's identity**.
  → Impossible by design; the skill refuses.
- **Auto-scanning all groups** or "just grab everything". → Refused; use the tiered flow.
- When your company's **privacy/HR/legal policy does not permit** this use. Confirming that is
  **your responsibility** before you run it.

## Dependencies

- **`lark-cli`** installed and authenticated. See the repo root README + `shared/lark-cli-setup.md`.
- Runs **`--as user`** (your own identity) for every call. You can only read what you can already
  see; the skill never uses a bot or admin identity to reach further.
- Optional: the `humanizer` skill (for the idiomatic polish pass). Optional: sub-agent support
  (e.g. Claude Code `Agent`) for parallel per-group mining.

## Minimal Lark scopes

Only what **your own user token** already needs to read the messages you can already see:

- `im:message` (or the read-only equivalent your `lark-cli` login uses) — to read the 1:1 work
  chat and whitelisted group messages within the period.
- `im:chat` / chat-membership read — to resolve which groups you and the subject share and to
  page group members.
- `contact:user.base:readonly` (or equivalent) — to resolve the subject's `open_id` by
  email + department (prevents same-name collisions).

No bot scopes, no admin scopes, no write scopes. If a call needs more than your own user can see,
that is out of scope — the skill stops rather than escalating identity.

## How to invoke

Install (see repo root README), then:

```
帮我给同事写一版 peer feedback 初稿，基于我们的协作记录        # → runs the gate first
draft evidence-based peer feedback for <colleague>, period <start>~<end>, groups: <list>
```

The skill will **always** run the authorization gate first, make you pick a retrieval tier (with
a budget), build the ledger, draft, and **stop at preview** for you to finalize and submit.

## Sample flow (all-synthetic)

```
[gate] Confirm all five: formal responsibility / policy / scope / not-prohibited / own-identity.
       ...user confirms + read-back accepted.
[tier] scoped (default): 1:1 work chat with "Jordan" + groups you listed: ["#project-atlas-sync"].
       Budget ≈ 6 API calls · ~180 messages · ~12k tokens.
       Will miss: any group not listed; all third-party DMs (never read).
       Proceed? (or pick expanded / custom-allowlist)
...mines evidence, builds ledger (10 rows: 6 verified, 4 unverified-flagged)...
[draft] "How they work": clear async updates, unblocks reviewers fast (2 verified facts).
        "To improve": estimates slip on cross-team items (1 verified fact).
        Values dims: Collaboration (evidence) + Candor (evidence).
        Short message: 3 sentences, desensitized, humanizer-polished.
[stop]  Here's the draft + your private ledger. Set the rating, edit wording, submit yourself.
```

A complete synthetic worked example (fictional people, group, messages, ledger, and draft) lives
in `fixtures/`.

## Required scopes / secrets

None beyond your own `lark-cli` user login (see "Minimal Lark scopes" above). No API key managed
by this skill, no bot, no admin.

## Known limitations

- **Retrieval is best-effort and can under-count.** `lark-cli` global sender-search is incomplete
  (misses whole groups, can falsely report `has_more=false`); the `--at-chatter-ids` filter can
  falsely match `@all` broadcasts. The skill backstops per-group and filters `@all` via each
  message's `mentions[].id`, but treat coverage as a floor, not a census. See
  `references/evidence-mining.md`.
- **Absence of evidence is not negative evidence.** Shallow collaboration is written short and
  honestly, not padded.
- **The skill drafts; it does not decide.** Rating, final wording, and submission are the human's.
- **You** must confirm company privacy/HR/legal permission before running.

## Files

```
lark-peer-feedback-drafting/
  SKILL.md                     # entry: gate → flow → tiers → writing → framework → send-gate → disclaimer
  README.md                    # this file
  references/
    evidence-mining.md         # lark-cli methodology + tiers + data minimization/lifecycle + anti-injection + sub-agents
    writing-guide.md           # writing principles + structure + language + humanizer + conservative layer
    verification.md            # spot-check method + full evidence-ledger template
  fixtures/                    # all-synthetic worked example (fictional people/group/messages/ledger/draft)
  tests/                       # RED-GREEN stress-test checklist
```
