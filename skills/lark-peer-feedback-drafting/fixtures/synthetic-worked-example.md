# Synthetic worked example (100% invented — zero real data)

> **All fictional.** Fictional people, group, messages, ids, links, dates, and numbers. Nothing
> here came from a real tenant. The framework dimensions are the skill's generic placeholders, not
> any real company's framework. See `README.md` in this folder.

---

## 0. Scenario (fictional)

- **Cast (all fictional):** **Alex** (evaluator), **Jordan** (reviewee), and **Priya** (a teammate
  who appears once as context, not evaluated). No real person.
- **Evaluator:** Alex (fictional). Holds a formal peer-review responsibility for Jordan this cycle.
- **Reviewee:** Jordan (fictional), `person-id://fixture/jordan`.
- **Evaluation period:** `2049-Q1-start` → `2049-Q1-end` (fictional bounds).
- **Retrieval tier chosen:** `scoped` — the 1:1 work chat with Jordan + one confirmed group:
  **#project-atlas-sync** (`group-id://fixture/atlas-sync`).
- **Budget shown before running (fictional):** approx **6 API calls · ~180 messages · ~12k tokens**.
- **What it would miss (stated up front):** any group not listed; all third-party DMs (never read).

Authorization gate: all five confirmations given, read-back accepted. (In a real run this happens
first and any "no" stops it.)

---

## 1. The retrieved messages (6 invented messages)

Bounded to the period, subject's own messages + minimal context. Third-party DMs never touched.

```
[msg://fixture/0001] #project-atlas-sync · Jordan · day 6
  "Design summary for the sync change is written up before tomorrow's review so folks can read
   async first. Open questions listed at the bottom."

[msg://fixture/0002] #project-atlas-sync · Priya (context) · day 6
  "@Jordan the reviewers were blocked on the schema question — can you take it?"

[msg://fixture/0003] #project-atlas-sync · Jordan · day 6
  "@Priya taking it now — I'll post the resolved schema in ~20 min so nobody stays blocked."

[msg://fixture/0004] 1:1 work chat (Alex ↔ Jordan) · Jordan · day 22
  "Heads up: my estimate for the cross-team migration piece was too optimistic — it'll slip about
   a week. I'd rather flag it now than surprise you later."

[msg://fixture/0005] #project-atlas-sync · Jordan · day 30
  "The cross-team dependency did slip as I flagged; here's the revised plan and what I'd do
   differently on estimating next time."

[msg://fixture/0006] #project-atlas-sync · @all broadcast · day 31
  "@all reminder: submit your quarter notes." (← @all broadcast; NOT evidence of a 1:1 interaction
   with Jordan — filtered out via mentions[].id / @all strip.)
```

> Note how `msg://fixture/0006` is an `@all` broadcast and is **excluded** from the evidence set —
> it does not indicate any targeted interaction with Jordan.

---

## 2. Evidence ledger (private — never shown to the reviewee)

Spot-check mode: rows cited in the draft were verified against raw text; a lower-relevance row is
left `unverified` and stays visible.

| # | Fact | Source author | Time | Locator | Quote/paraphrase | Verification | Relevance | Confidence | Corroboration | Conflicts | Supported prose claim |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Wrote a design summary before the review so people could read async; listed open questions | Jordan | day 6 | msg://fixture/0001 | paraphrase | verified | Shows proactive, written, async-friendly communication | high | #2 (reviewers were reading async) | — | "Jordan writes things down early so others can engage before the meeting." |
| 2 | Took the schema question that had blocked reviewers and committed to posting the resolution promptly | Jordan | day 6 | msg://fixture/0003 | paraphrase | verified | Shows unblocking others quickly | high | #1 | — | "When a review stalled, Jordan picked up the blocking question and unblocked the reviewers fast." |
| 3 | Flagged an over-optimistic estimate proactively before it became a surprise | Jordan | day 22 | msg://fixture/0004 | paraphrase | verified | Candor about own miss; early risk flagging | high | #4, #6 | — | "Jordan flags his own estimation misses early rather than letting them surprise people." |
| 4 | The cross-team dependency slipped ~1 week as flagged; posted a revised plan + a self-noted lesson on estimating | Jordan | day 30 | msg://fixture/0005 | paraphrase | verified | Follow-through + learning from a miss; also the "to improve" fact | high | #3 | — | "Estimates on cross-team work slipped once; he owned it, replanned, and noted how he'd estimate differently." |
| 5 | Generally responsive in the group thread | Jordan | period | msg://fixture/(various) | paraphrase | **unverified** | Weak/general; not cited | low | — | — | (not cited — stays flagged, not used as fact) |
| 6 | Jordan's own words on flagging the slip early: "I'd rather flag it now than surprise you later" | Jordan | day 22 | msg://fixture/0004 | quote | verified | Candor in the subject's own words (kept verbatim in the private ledger; paraphrased in the prose) | high | #3 | — | "That kind of early honesty makes you easy to work with." |

---

## 3. Short feedback draft (built only from verified rows; desensitized; humanizer-polished)

> Language confirmed with the evaluator first (fictional: "Jordan's usual working language").
> Rating is **left to the human** — the draft below supports a positive direction and names one
> concrete area to improve, consistent with the evidence.

**Business output**

- *Works well:* Jordan writes things down early. Before the design review he posted a summary with
  the open questions listed, so people could engage async instead of discovering everything in the
  meeting. When the review stalled on a schema question that was blocking the reviewers, he took it
  and unblocked them quickly.
- *To improve:* Estimation on cross-team work. One cross-team dependency slipped about a week. To
  his credit he flagged it early and replanned — the growth edge is tightening the initial estimate
  on work that crosses team boundaries.

**Values dimensions** *(generic examples — replace with your company's framework)*

- **Collaboration:** Actively unblocks others; picks up the blocking question rather than waiting.
  (Evidence: rows #1, #2.)
- **Candor:** Names his own misses early. He flagged the optimistic estimate before it became a
  surprise, then owned the slip and noted what he'd do differently. (Evidence: rows #3, #4, #6.)
  Note: row #6 keeps Jordan's **verbatim** words in the private ledger, but the prose above
  **paraphrases** them — a quote is desensitized/reworded before it enters reviewee-facing text.

**Short message**

Jordan, the thing I valued most this period was how early you surface things — both the design
context before reviews and the estimate risk before it slipped. That kind of early honesty makes
you easy to work with. The one area I'd push on is estimating cross-team work; you already handled
the slip well, so it's about catching it at the estimate stage next time.

---

## 4. What the human does next (send-gate)

The skill **stops here**. Alex reviews the draft and the private ledger, sets the rating, edits the
wording, and **submits it himself** in the HR system. The skill never submits. After submission,
the derived data (this ledger + draft) is deleted (one-click delete), at the latest by end of the
evaluation period.
