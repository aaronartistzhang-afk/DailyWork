---
name: agent-fleet-guard
description: "Use before launching any large agent orchestration (fan-out) — roughly ≥20 subagents or an estimated ≥1M subagent tokens — and while such a fleet is in flight. Covers: quoting the cost to the human before dispatch, refusing to launch during unstable API connections, in-flight budget stop-loss, T+60s batch health checks, resume-cache traps, and two shell pitfalls that silently break wait loops. 触发词：大编排 / 批量派代理 / fan-out / 20 个代理 / 先报价 / 连接不稳 / 会不会烧太多 token / 这批代理要不要报价。English: “quote this fan-out first”, “is the fleet healthy”, “we're burning tokens”. Not for dispatching one or two agents — that needs no gate."
metadata:
---

# agent-fleet-guard — guardrails for large agent orchestrations

Dispatching one agent is routine. Dispatching **twenty** is a spend decision — and a fleet that half-dies silently poisons everything downstream. Six guardrails, all paid for with real incidents.

**Threshold**: fan-out ≥ 20 subagents, **or** estimated ≥ 1M subagent tokens. Below that, just dispatch.

## ① Quote gate — quote first, wait for approval

Before dispatch, run the estimator (same directory):

```bash
./fleet_estimate.sh --agents <N> --per <rough-tokens-per-agent> --json
```

Exit 10 = over threshold (`agents ≥ 20` **or** corrected estimate ≥ 1M) → **you must quote and wait**:

> "Planning N agents, rough estimate X tokens, ×3 corrected ≈ Y tokens (**both are floors, not ceilings**) — the output is Z. Approve?"

Give **both** numbers — the rough estimate and the ×3 correction. Why ×3: a real fleet quoted at ~0.9M tokens burned ~2.7M — roughly 3×, **and that was a lower bound**. Per-agent guesses run low; the estimator's default `--factor 3` bakes this in.

## ② Don't launch on an unstable connection

If this session has recently seen `Connection closed` / connection-lost errors: **treat that as the signal, no probing needed** — crashed agents burn their tokens for nothing, and fail-closed pipelines then demand a full rerun. The classic failure is seeing scattered disconnects and *not counting them as a signal*.

No existing signal but the fan-out is over threshold? Send **3 one-token probe agents** first; any probe timing out >10s or erroring → unstable. Unstable → don't force it: split into smaller batches or wait.

## ③ In-flight stop-loss

While the fleet runs, track cumulative spend (orchestration frameworks expose a budget/spent counter; with散派 agents, sum their usage by hand). **The moment spend crosses the approved number Y — stop and re-quote, without waiting to be asked.**

Anchor on the **approved** number, not the rough estimate — you quoted ×3, so anchoring on the rough estimate false-alarms at ⅓ of every normal run.

```bash
./fleet_estimate.sh --agents N --per K --spent <spent> [--approved <approved>]   # → over_budget
```

## ④ Batch health check at T+60s

After a mass dispatch, verify at T+60s: **launched count ≠ dispatched count, or empty returns → abort and report the gap.** A fleet of 10 once died silently — nobody knew until a human asked. And **never feed empty results downstream**: three critics once faithfully reviewed a `DRAFT: []` — reviewers working on a false premise produce confident garbage.

## ⑤ Resume-cache trap

Concurrent-pipeline resume caches match on `(prompt, opts)`. One upstream crash → its output changes → every downstream prompt changes → the whole cache misses = full rerun anyway. **Don't budget on resume saving you money in a concurrent pipeline.** Recover with a deterministic continuation script reading your own journal instead.

## ⑥ Two wait-loop pitfalls (both silently break "wait for the fleet")

- **Never use `pgrep -f` to test liveness** — it matches the wait loop itself (`until ! pgrep -f "run.js"` never exits, and no notification ever fires; the failure surfaces only when a human asks what those background jobs are doing). Watch for a **completion marker in the output file** instead: `until grep -q "DONE" "$LOG"; do sleep 4; done`.
- **Never pipe a long task into `head -N`** — `head` exits once it has enough, the next upstream write gets SIGPIPE and the task dies mid-run, leaving a stale artifact that you'll then validate new code against. Write to a log (`> log 2>&1`), then read the beginning with `sed -n '1,30p'`.

---

Scope note: this skill covers only what is *specific to large fleets*. Per-dispatch context construction and result integration belong to your normal dispatch workflow.
