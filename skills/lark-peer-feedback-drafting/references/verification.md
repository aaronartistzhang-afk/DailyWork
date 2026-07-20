# verification.md — spot-check method + the evidence-ledger template

The evidence ledger is the backbone of `lark-peer-feedback-drafting`: every claim in the draft
must trace to a ledger row. The ledger is **kept private by the evaluator** and **never goes into
the part the reviewee sees**. Process **one subject at a time**.

---

## 1. The evidence-ledger template (all fields from the spec)

Record one row per fact. Store it in the evaluator's **local, minimal-permission** dir only —
never to cloud, repo, or git (see `references/evidence-mining.md` §6).

| # | Fact | Source author | Time | Re-checkable locator (msg link / id) | Quote vs paraphrase | Verification status | Relevance | Confidence | Corroboration | Conflicts | Supported prose claim |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | *what was observed, factually* | *who said/did it* | *when (bounded to period)* | *message link or id so it can be re-opened* | `quote` \| `paraphrase` | `verified` \| `unverified` | *why it matters to this evaluation* | `high` \| `med` \| `low` | *other rows/sources that back it (row #s)* | *any row/source that contradicts it* | *the exact draft sentence this row supports* |

**Field rules:**
- **Fact** — an observed behavior, not an interpretation. ("Posted a written design summary before
  the review" — not "is a great communicator".)
- **Source author** — who authored the message/action. Kept in the private ledger only; **stripped
  from the reviewee-facing prose** (desensitize — see writing-guide A3).
- **Time** — must fall **within the evaluation period**. Rows outside the period don't belong here.
- **Re-checkable locator** — a **message link or id** that lets you (or a reviewer) re-open the
  exact source later. A row with no re-checkable locator cannot be `verified`.
- **Quote vs paraphrase** — mark `quote` only if the Fact reproduces the source text verbatim;
  otherwise `paraphrase`. Sub-agents and summaries often present a paraphrase as a quote —
  **default to `paraphrase` until you've checked the raw text** (see §2).
- **Verification status** — `verified` only after the row passes the check in §2. Otherwise
  `unverified`. **Unverified rows MUST be explicitly marked and MUST NEVER be cited as if
  verified.**
- **Relevance** — why this fact matters for *this* evaluation dimension. Low-relevance rows should
  be dropped, not padded in.
- **Confidence** — your confidence the fact is accurately captured (`high`/`med`/`low`),
  independent of verification status.
- **Corroboration** — other rows or sources that independently support this fact (list row #s). A
  fact with corroboration is stronger than a lone data point.
- **Conflicts** — any row/source that contradicts this fact. **Never hide a conflict** — a fair
  draft acknowledges tension rather than cherry-picking.
- **Supported prose claim** — the **exact sentence** in the draft this row backs. If a draft
  sentence has no row in this column, it is unsupported — cut it or move it to an explicit
  "impression, unverified" aside.

---

## 2. Verification method

A row becomes `verified` only when **all** of the following hold:

1. **Re-openable.** The locator actually resolves to the source message (you can re-open it).
2. **Text matches the flag.** If flagged `quote`, the Fact matches the raw message **verbatim**
   (no paraphrase smuggled in as a quote). If it doesn't match verbatim, either fix the text or
   downgrade the flag to `paraphrase`.
3. **In period.** The time is within the evaluation period.
4. **Fact = what's there.** The Fact states what the message shows, with no added interpretation
   or inflation.

If any check fails, the row stays `unverified` (fix it and re-check, or leave it flagged).

### Spot-check mode (default) vs full verification
- **Spot-check mode (default):** sample a subset of rows — **prioritize every row that will be
  cited in the draft, plus any `low`-confidence or `conflict`-bearing row** — and run the §2 check
  on them. Sampled rows that pass become `verified`. **The rest stay `unverified` and remain
  visible in the ledger** — they are not deleted, and they are **never cited as if verified**.
- **Full verification:** run §2 on **every** row. Required by the **conservative layer**
  (`references/writing-guide.md` Part B) and recommended whenever a low rating or a
  high-consequence claim is involved.

### The non-negotiable rule
> **Unverified rows are never cited as verified.** A claim backed only by an unverified row is
> either written softly as an explicit impression ("my sense was...", clearly not asserted as
> fact) or dropped. It must never be phrased as an established fact in the draft.

---

## 3. Anti-distortion checks (before drafting)

- **Quote integrity.** For every `quote` row cited, re-read the raw message. If the "quote" is
  actually a paraphrase, fix the flag or the text. (This is the single most common distortion when
  sub-agents summarize.)
- **No inflation.** "Answered the question" must not become "single-handedly unblocked the team"
  unless a row supports that stronger claim.
- **Conflicts surfaced.** If a row has a `conflict`, the draft must not present the flattering side
  as settled fact — acknowledge the tension.
- **Period integrity.** Drop rows outside the evaluation period, however tempting.

---

## 4. What leaves the ledger vs what stays

- **Leaves (into the draft, desensitized):** the *behavior* described by verified rows, in the
  evaluator's own desensitized words.
- **Stays (private, never to the reviewee):** the ledger itself — source authors, locators, raw
  quotes, confidence, corroboration, conflicts. This is the evaluator's audit trail, retained
  locally and short-lived (delete after submission; see `references/evidence-mining.md` §6).
