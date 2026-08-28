---
name: session-handoff
description: "Use when work must be handed from this AI coding session to another session on the same machine, or to a later session of the same person. Session handoff / context handoff: produce a fixed three-line header (state / what you do next / what you decide) plus a six-section HANDOFF.md so the receiver sees 'fixed or not fixed?' at a glance. 触发词：「另一个 session」「转给那个 session」「你把这个发给 XX session」「交接」“收工交接”“写个交接”「HANDOFF」。English triggers: “hand this off to the other session”, “write a handoff”, “end-of-shift handoff”, “continue this in my next session”. 不适用：派子代理/并行任务（parallel-agent dispatch）、给人发消息（audience-tailored message）、会话超时/重连（不是交接）。"
metadata:
---

# session-handoff — passing work between sessions on one machine

Hand the work in this session's hands to **another session**, or to **this same person's next session.**

**Core principle: the receiver must see "fixed or not fixed?" at first glance.** A handoff is not a work log — it's a status note that lets someone decide the next step **within three lines.**

## When to use

- You need to pass live work to another running session, or write it for your own next session.
- You're wrapping up and want to leave a "here's where I got to."

**Not for:**
- **Dispatching subagents / parallel tasks** → that's a parallel-agent dispatch skill. **Handoff ≠ dispatch**: a handoff moves **existing context** to a session that already exists; dispatch **constructs** the context a new agent needs.
- **Sending a message to a person** (teammate, boss, engineer) → use an audience-tailored message skill.
- **Session timeout / reconnect** — that's a connection problem, not a handoff.

---

## Output 1: `HANDOFF.md`

Write to the scratchpad directory by default; `--out <path>` for elsewhere. **Six sections — a missing section is worse than a wrong one:**

| Section | What goes in |
|---|---|
| **What changed** | Per file: absolute path + what changed + why |
| **Unfinished** | Which step is missing, what the next step concretely is (not "look into it more") |
| **Landmines** | Traps you hit, paths not to retread, inputs known to blow up |
| **git snapshot** | See section 2 — all four items, with a timestamp |
| **Not my turf** | Things in this worktree/repo that **I did not change**, and whose they are |
| **Evidence strength** | **Tag only the key calls**, four levels: measured / read the code / inferred / unverified |

> Don't tag evidence strength line by line — tagging every line is the same as tagging none; it just drowns the receiver. Tag only the calls where "if this is wrong, the receiver walks a wasted mile."

## 2. git snapshot (four steps, run each — don't write from memory)

```bash
date '+%Y-%m-%d %H:%M:%S %z'
git branch --show-current                      # (1) re-read on the spot, not the one you memorized minutes ago
git status --porcelain                         # (2) working tree: uncommitted / untracked
git rev-parse --abbrev-ref '@{u}' 2>/dev/null  # (3) upstream; if none, say "no upstream" explicitly
git rev-list --left-right --count '@{u}...HEAD' 2>/dev/null   # (4) only if there's an upstream: behind<TAB>ahead
```

- **(1) must be re-read on the spot.** In a shared worktree **another session can switch HEAD out from under you** — the branch you created minutes ago may not be current now. Writing the branch name from memory sends the receiver to the wrong branch.
- **(3) when there's no upstream, say "no upstream" explicitly** — don't omit the line; omission reads as "already pushed."
- **(4) run only once (3) yields an upstream**; report it in words as `ahead N / behind M`, don't paste the two raw numbers.

**Uncommitted / un-pushed git state must go inside the three-line header**, not hidden in `HANDOFF.md`'s fourth section. Real-world quote:
> "Did you commit your changes to the retriever engine? The other session says you didn't."

— two sessions disagreeing on the commit state of the same code is the most expensive handoff failure: the receiver keeps working on a false premise.

## 3. Output 2: paste-ready note (**fixed three-line header**)

```
State: <one line — fixed or not fixed, and committed/pushed or not>
Do this: <one line — one concrete action>
Decide this: <one line; if nothing, write "none, just do the above">
```

Details come after the three-line header. **Order and line count are fixed — no merging, no extra line.** These three lines exist because of this:
> "I don't get it — so is it fixed or not?"

— that's the receiving session's opening line. The three-line header exists so that sentence never has to be said.

## 4. Finding someone else's changes: **diagnose only, don't touch**

When there's something in the worktree/repo you didn't change: **note it, put it under "Not my turf," name it in the handoff** — then **stop.** Don't revert, don't stash, don't "tidy up while I'm here," don't switch branches.

> "Check first, don't change anything — the other session is still working right now."

— another session may be working on those files this very moment. Your "while I'm here" is its data loss.

## 5. Delivery

**Default: draft only.** The draft goes to the human; the human passes it on.

To have me deliver straight to the target session, three conditions must all hold:
1. The human **named the target session**;
2. It's **visible** in the session list;
3. I **show a preview first**, and the human says go after seeing it.

Only with all three do I send. **A "send it over" before the preview is not authorization.**

---

## Guardrails (from real usage)

- **git state always reported** — inside the three-line header, not buried.
- **Someone else's turf: diagnose, don't touch** — another session may be live on those files.
- **The three-line header exists so "is it fixed or not?" never has to be asked.**

---

## Related

- A **parallel-agent dispatch skill**: spins up a new agent for new work; this skill moves existing context — two different things.
- An **audience-tailored message skill**: use it when the recipient is a **person**.

## Template

`handoff-template.md` (same directory).
