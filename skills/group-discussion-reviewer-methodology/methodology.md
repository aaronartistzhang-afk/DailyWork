# Group Discussion Review — Methodology

A disciplined method for simulating a product **group-discussion review** of a PRD. Follow
it in-conversation when you don't have (or don't want) the runnable engine. It trades the
engine's deterministic P0 gate for your judgment, so be strict about the P0 bar.

The whole point is **disciplined severity**: P0 is reserved for true approval blockers;
almost everything else is a P1/P2 follow-up. A clean PRD with **0 P0** is a valid outcome.

---

## Output contract (always produce exactly this)

```
## 组内准入            (Group Admission)
组内准入：是 / 否        — is the PRD concrete enough to enter group discussion?
## 模拟评审结果          (Simulated Review Result)
模拟评审结果：通过 / 有条件通过 / 不通过
## P0 Blockers          — only true approval blockers; write "无 P0" if none
## P1 Questions
## P2 Questions
## P1/P2 Improvement Suggestions
```

Two **independent** axes:
- **组内准入 (admission)** judges only whether the PRD has enough concrete context — a clear
  objective, a defined scope, and at least one measurable success/acceptance signal — for a
  meaningful discussion. Set 否 **only** when that core context is missing.
- **模拟评审结果 (verdict)** judges whether the simulated group review would pass. A PRD can
  be admitted (是) and still be 不通过.

If any P0 blocker survives → verdict is **不通过**. Otherwise 通过 / 有条件通过.

Never expose internal scaffolding in the output (no "fact_1", "downgraded", category codes
like `measurement_failure`). Write product-facing questions only. Every P0 must include a
concrete PRD revision suggestion. Keep P1/P2 in their own sections so blockers are scannable.

---

## The 8 phases

### 1. Fact Ledger
Read the PRD and extract a compact ledger:
- **Facts**: the decision-relevant claims actually stated (objective, target population,
  metric, experiment, workflow, rollout, risk, AI, reward, dashboard, dependency).
- **Approval-blocking missing facts**: gaps whose absence genuinely prevents approval, safe
  launch, measurable success, correct direction, or delivery viability.
- **Follow-up missing facts**: useful gaps that should **not** block approval by themselves.

Rule: "not written" ≠ "approval-blocking". Most missing detail is a follow-up. Only call a
gap approval-blocking when the PRD body itself makes it a launch/ramp/settlement/decision
gate.

### 2. Scenario Signals
From the ledger, note which domains are in play: measurement, experiment, workflow,
AI-capability, incentive/reward, data-product/dashboard, risk/governance. These decide
which extra reviewer lenses to apply.

### 3. Reviewer Roles (apply each as an independent lens)
Always apply the four core lenses:
- **Business & Strategy** — right problem, right population, business value, opportunity cost.
- **Outcome & Metric** — business outcome, metric definition, denominator, attribution,
  success threshold.
- **Workflow & UX** — operator/user path, decision points, handoff breaks, unsafe steps.
- **Risk & Governance** — rollout, rollback, compliance, privacy, dependency, ownership, cost.

Add conditional lenses when signals fire: Experiment Design, Incentive Economy, AI Quality &
Human Control, Data Product, Localization, Technical Feasibility. In a **challenge** review,
also add a Contrarian lens that attacks hidden assumptions and approval shortcuts.

Each lens raises at most a few findings, grounded in a ledger fact or missing-fact. P0 only
when the issue blocks approval, safe launch, measurable success, right problem/population, or
delivery viability.

### 4. Judge / merge
Merge the lens findings into one decision. Don't invent new issues. Merge duplicates. For
every proposed P0, demand proof of: the blocked approval-critical outcome, the affected
user/operator/business path, direct evidence, and why a Conditional Pass is impossible. If it
can't clear that bar → downgrade to P1.

### 5. P0 Gate (the discipline — downgrade aggressively)
A candidate P0 **survives only** if it maps to one of these four categories **and** proves a
concrete product bridge:
- **Direction failure** — wrong problem, wrong population, or unjustified outcome; or a
  request for extra traffic/ranking/reward/placement with no business guardrail to judge it.
- **Measurement failure** — success can't be measured or interpreted consistently after
  launch (ambiguous primary-metric definition, denominator, baseline, attribution window) —
  **for a formal launch/ramp/replacement decision**.
- **Launch-safety failure** — direct user/compliance/privacy/incentive-abuse/irreversible-
  rollout risk.
- **Delivery-viability failure** — a dependency/cost/ownership/operational loop that makes the
  proposal not realistically deliverable, with evidence the core path is actually blocked and
  has no viable fallback.

**Downgrade to P1/P2 by default** (these are NOT P0 just because they're missing):
- Statistical audit detail: sample size, significance, p-value, power, MDE — unless a formal
  experiment result is the explicit launch/ramp/replacement gate.
- Engineering/ops detail: SLA, QPS, latency, monitoring dashboards, alert thresholds,
  runbook, on-call.
- Tracking/data detail: event schema, event names, properties, target tables, owner,
  validation SQL — unless the **core** metric definition/decision unit is missing.
- Dashboards that already list their metrics but still need acceptance-metric convergence /
  baseline formula / attribution window — unless the PRD makes the dashboard a launch/ramp/
  settlement/source-of-truth/resource decision gate.
- Release-readiness: launch scope, gray/ramp steps, rollback thresholds/owners, observation
  windows — usually "pass with Todo" unless there's a direct unsafe launch or no fallback.
- Compliance checklist: empty legal ticket, review SLA, opt-in/consent proof, cross-border
  approval — unless the PRD plans unsafe behavior (sending without consent, bypassing legal
  approval, no human review for sensitive content, no rollback) or evidence says approval is
  the current blocker.
- Information-standard cleanups: badge/icon sizing, naming, copy standards.
- Missing sections / acceptance-criteria / risk-dependency completeness — unless the gap
  itself blocks approval, measurable success, launch safety, the right problem, or delivery.

Keep P0 for genuine product-strategy contradictions: trigger timing, frequency cap, exit
rule, target population, resource guardrail, or incentive logic that makes the solution
itself unapprovable.

### 6. Readiness priors (how to prioritize, not how to block)
- Product PRD: why now; what user/business problem; is the goal converged; does the solution
  hit the decisive contradiction; is the causal chain credible; should it reuse existing
  capability before rebuilding.
- GTM PRD: is the objective converged; do the actions serve it; is the execution loop closed;
  is the ROI / resource ask justified; are key dependencies explicit enough to push forward.
- "Explanation is not a solution": describing a problem/dashboard/data view is not enough
  unless the PRD says what product/business **action** changes.

### 7. Compose
Write the output contract above. For each P0 give a concrete PRD revision. Soften any
downgraded candidate into a P1/P2 follow-up (don't present it as a blocker, and don't hide
the decision either — briefly say why it isn't a hard blocker).

### 8. Self-check before finalizing
- Is every P0 truly one of the four categories with a concrete bridge? If not, downgrade.
- Did I keep 组内准入 and 模拟评审结果 as separate judgments?
- Did I avoid blocker-language ("阻断", "上线门控") in P1/P2 sections?
- Is the output free of internal scaffolding terms?

---

## Review modes

- **standard** — like a typical product group review. Pass if understandable, has a plausible
  execution path, and success is checkable after launch. Typically 0 P0.
- **deep** — systematically check goal, journey, metric, ownership/handoff, rollout; cover
  completeness via P1/P2, not inflated P0. Max ~2 P0.
- **challenge** — stress-test the direction itself (right problem? right population? right
  time? worth the cost?). Be adversarial about the proposal, not nitpicky about the document.

Blind review: use only the PRD body and explicit options. Ignore comments, resolved
discussions, reviewer annotations, and post-meeting explanations. Ask questions; don't answer
them (except the required P0 revision suggestions).
