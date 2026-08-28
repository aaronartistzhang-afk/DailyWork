# session-handoff — pass work between AI coding sessions on one machine

Hand the work in this session's hands to **another running session**, or to **your own next session** — with a fixed **three-line header** (state / do this / decide this) and a six-section `HANDOFF.md`, so the receiver sees **"fixed or not fixed?"** at first glance instead of re-reading a work log. Session handoff, context handoff, session continuity.

- **Stack**: pure prompt. No install, no dependencies, no API key.
- **Required**: nothing (a git repo if you want the git-snapshot section).
- **Scope**: moving **existing context** to a session that already exists. It is not dispatch (that constructs new context for a new agent) and not messaging a person.

## The problem it kills

The most expensive handoff failure is two sessions disagreeing on whether the code was committed — the receiver keeps building on a false premise. So git state (uncommitted / un-pushed) is forced **into the three-line header**, never buried. And the branch name is re-read on the spot, because in a shared worktree another session can switch `HEAD` out from under you.

The three-line header exists to kill one sentence the receiving session always opens with: *"I don't get it — so is it fixed or not?"*

## What it produces

1. **`HANDOFF.md`** — six sections: what changed (per file, absolute paths) · unfinished (concrete next step) · landmines · git snapshot · **not my turf** (things you didn't change, and whose they are) · evidence strength (tag only the key calls).
2. **A paste-ready three-line header** — fixed order, fixed line count:
   ```
   State: <fixed or not fixed, committed/pushed or not>
   Do this: <one concrete action>
   Decide this: <one line, or "none, just do the above">
   ```

## One rule worth stealing even if you don't use the skill

**Find someone else's uncommitted changes → diagnose only, don't touch.** Note them, name them in the handoff, and stop. Another session may be live on those files right now; your "while I'm here, let me tidy up" is its data loss.

## When to use

- Passing live work to another session, or writing for your own next session.
- End-of-shift "here's where I got to."

Triggers (bilingual): "另一个 session" · "交接" · "收工交接" · "写个交接" · "HANDOFF" · "hand this off to the other session" · "write a handoff" · "continue this in my next session".

**Not for:** dispatching parallel subagents, sending a message to a person, or a session timeout/reconnect (that's a connection problem, not a handoff).
