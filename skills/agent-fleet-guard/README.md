# agent-fleet-guard — guardrails for large agent orchestrations

Before you fan out **≥20 subagents** (or an estimated **≥1M subagent tokens**), and while that fleet is in flight: quote the cost to the human first, refuse to launch on an unstable connection, stop-loss on the approved budget, health-check the batch at T+60s, don't trust resume caches in concurrent pipelines, and don't let two classic shell pitfalls silently break your wait loop. Every guardrail here was paid for with a real incident.

- **Stack**: pure prompt + one dependency-free bash script (`fleet_estimate.sh`).
- **Required**: nothing.
- **Scope**: only what's specific to *large* fleets. Dispatching one or two agents needs no gate.

## The problem it kills

Large orchestrations fail expensively and *quietly*: a fleet quoted at ~0.9M tokens burns 2.7M; ten agents die silently and nobody notices until a human asks; three critics faithfully review an empty draft; a `pgrep -f` wait loop matches itself and never exits. The guardrails turn each of these from "discovered by accident" into a checked step.

## The six guardrails

| # | Guardrail | One-liner |
|---|---|---|
| ① | Quote gate | Over threshold → quote rough **and** ×3-corrected tokens (both are floors), wait for approval |
| ② | Connection check | Recent `Connection closed` errors = don't launch; no signal → 3 one-token probes first |
| ③ | In-flight stop-loss | Spend crosses the **approved** number → stop and re-quote, unprompted |
| ④ | T+60s health check | Launched ≠ dispatched, or empty returns → abort; never feed `[]` downstream |
| ⑤ | Resume-cache trap | Concurrent pipelines: one upstream change invalidates the whole cache — don't budget on resume |
| ⑥ | Wait-loop pitfalls | No `pgrep -f` self-match; no `| head -N` SIGPIPE kills — watch a completion marker in a log file |

## The estimator

```bash
./fleet_estimate.sh --agents 25 --per 40000 --json
# → {"rough":1000000,"corrected":3000000,"quote_required":true,"reason":"agents+tokens"}  exit 10

./fleet_estimate.sh --agents 25 --per 40000 --spent 3200000 --approved 3000000 --json
# → ...,"over_budget":true   (in-flight stop-loss check)
```

Pure arithmetic — no network, no files, exit codes: 0 = no quote needed, 10 = quote required, 2 = bad input. Rejects leading zeros (`--agents 08` would otherwise fail-open as octal).

## When to use

Triggers (bilingual): "大编排" · "批量派代理" · "fan-out" · "先报价" · "连接不稳" · "会不会烧太多 token" · "quote this fan-out first" · "is the fleet healthy" · "we're burning tokens".
