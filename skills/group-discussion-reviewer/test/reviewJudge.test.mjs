import test from "node:test";
import assert from "node:assert/strict";

import {
  buildJudgePrompt,
  parseJudgeResponse,
  validateJudgeDecision
} from "../src/reviewJudge.mjs";

test("buildJudgePrompt forbids new findings and requires traceable severity", () => {
  const prompt = buildJudgePrompt({
    reviewerFindings: [{
      reviewerId: "measurement",
      findings: [{
        findingId: "measurement_finding_1",
        question: "分母是什么？",
        severityProposed: "P0",
        evidenceRefs: ["missing_1"]
      }]
    }],
    factLedger: {
      facts: [],
      missingFacts: [{ missingFactId: "missing_1", category: "measurement", claim: "Denominator missing." }]
    },
    outputLanguage: "zh"
  });

  assert.match(prompt, /Judge \/ Arbiter/);
  assert.match(prompt, /must not create new findings/i);
  assert.match(prompt, /sourceFindingIds/);
  assert.match(prompt, /severityReason/);
  assert.match(prompt, /preservedDissent/);
  assert.match(prompt, /At most 8 issues/i);
  assert.match(prompt, /downgradedFindings.*max 8/i);
  assert.match(prompt, /P0 burden of proof/i);
  assert.match(prompt, /candidate P0/i);
  assert.match(prompt, /Product\/GTM readiness/i);
  assert.match(prompt, /missing sections alone/i);
  assert.match(prompt, /does not automatically become P0/i);
});

test("parseJudgeResponse parses final issues, downgraded issues, and dissent", () => {
  const parsed = parseJudgeResponse(JSON.stringify({
    verdictRisk: "Conditional Pass",
    issues: [{
      issueId: "issue_1",
      sourceFindingIds: ["measurement_finding_1"],
      severity: "P0",
      p0Category: "measurement_failure",
      question: "分母是什么？",
      evidenceRefs: ["missing_1"],
      severityReason: "Success cannot be measured.",
      recommendedRevision: "Define denominator."
    }],
    downgradedFindings: [{
      findingId: "workflow_finding_1",
      reason: "Not launch blocking."
    }],
    preservedDissent: [{
      findingId: "risk_finding_1",
      reason: "One reviewer still sees risk."
    }]
  }));

  assert.equal(parsed.verdictRisk, "Conditional Pass");
  assert.equal(parsed.issues[0].issueId, "issue_1");
  assert.deepEqual(parsed.issues[0].sourceFindingIds, ["measurement_finding_1"]);
  assert.equal(parsed.downgradedFindings[0].findingId, "workflow_finding_1");
  assert.equal(parsed.preservedDissent[0].findingId, "risk_finding_1");
});

test("validateJudgeDecision drops invented issues and downgrades unsupported P0", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [
        {
          issueId: "issue_valid",
          sourceFindingIds: ["measurement_finding_1"],
          severity: "P0",
          p0Category: "measurement_failure",
          question: "分母是什么？",
          evidenceRefs: ["missing_1"],
          severityReason: "Success cannot be measured.",
          recommendedRevision: "Define denominator."
        },
        {
          issueId: "issue_invented",
          sourceFindingIds: ["invented_finding_1"],
          severity: "P0",
          p0Category: "measurement_failure",
          question: "Invented question.",
          evidenceRefs: ["missing_1"],
          severityReason: "Invented.",
          recommendedRevision: "Invented."
        },
        {
          issueId: "issue_unsupported_p0",
          sourceFindingIds: ["risk_finding_1"],
          severity: "P0",
          p0Category: "invalid_category",
          question: "风险是什么？",
          evidenceRefs: ["missing_unknown"],
          severityReason: "Risk exists.",
          recommendedRevision: ""
        }
      ],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [
      { findingId: "measurement_finding_1" },
      { findingId: "risk_finding_1" }
    ],
    factLedger: {
      facts: [{ factId: "fact_1" }],
      missingFacts: [{ missingFactId: "missing_1" }]
    }
  });

  assert.deepEqual(validated.issues.map((issue) => issue.issueId), ["issue_valid", "issue_unsupported_p0"]);
  assert.equal(validated.issues[0].severity, "P0");
  assert.equal(validated.issues[1].severity, "P1");
  assert.equal(validated.issues[1].p0Category, null);
  assert.ok(validated.downgradedFindings.some((item) => item.findingId === "risk_finding_1"));
});

test("validateJudgeDecision downgrades technical execution details that do not block product approval", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [{
        issueId: "issue_ai_ops",
        sourceFindingIds: ["ai_finding_1"],
        severity: "P0",
        p0Category: "delivery_viability_failure",
        question: "ML 服务延迟、QPS、告警和 runbook 是否明确？",
        evidenceRefs: ["missing_1"],
        severityReason: "PRD 未写 SLA 和 on-call。",
        recommendedRevision: "补充延迟 SLA、QPS 成本上限、监控告警、自动重试和 runbook。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "ai_finding_1" }],
    factLedger: {
      facts: [],
      missingFacts: [{ missingFactId: "missing_1" }]
    }
  });

  assert.equal(validated.verdictRisk, "Conditional Pass");
  assert.equal(validated.issues[0].severity, "P1");
  assert.equal(validated.issues[0].p0Category, null);
  assert.ok(validated.downgradedFindings.some((item) => item.findingId === "ai_finding_1"));
});

test("validateJudgeDecision downgrades technical issues wrapped as measurement P0", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [{
        issueId: "issue_pipeline",
        sourceFindingIds: ["data_finding_1"],
        severity: "P0",
        p0Category: "measurement_failure",
        question: "数仓 pipeline、字段映射、缓存刷新频率和补数 runbook 是否明确？",
        evidenceRefs: ["missing_pipeline"],
        severityReason: "没有这些技术细节会影响数据维护。",
        recommendedRevision: "补充 pipeline、字段映射、缓存刷新和补数 runbook。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "data_finding_1" }],
    factLedger: {
      facts: [],
      missingFacts: [{ missingFactId: "missing_pipeline", category: "data", claim: "Pipeline details are missing." }]
    }
  });

  assert.equal(validated.verdictRisk, "Conditional Pass");
  assert.equal(validated.issues[0].severity, "P1");
  assert.equal(validated.issues[0].p0Category, null);
  assert.equal(validated.p0GateDecisions.length, 0);
  assert.ok(validated.downgradedFindings.some((item) => /SQL and data table implementation detail|technical execution detail/.test(item.reason)));
});

test("validateJudgeDecision forces Blocked when a P0 survives the gate", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Conditional Pass",
      issues: [{
        issueId: "issue_metric",
        sourceFindingIds: ["measurement_finding_1"],
        severity: "P0",
        p0Category: "measurement_failure",
        question: "活动参与率的分母、基线、AB 归因和活动后留存窗口是什么？",
        evidenceRefs: ["missing_metric"],
        severityReason: "没有口径和归因规则，活动成败无法解释。",
        recommendedRevision: "补充分母、基线、AB 剔除和留存窗口。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "measurement_finding_1" }],
    factLedger: {
      facts: [],
      missingFacts: [{ missingFactId: "missing_metric", category: "measurement", claim: "Metric denominator and attribution are missing." }]
    }
  });

  assert.equal(validated.verdictRisk, "Blocked");
  assert.equal(validated.issues[0].severity, "P0");
  assert.equal(validated.p0GateDecisions[0].kept, true);
  assert.equal(validated.p0GateDecisions[0].reasonCode, "measurement_success_uninterpretable");
});

test("validateJudgeDecision defers calibration when cited Fact Ledger evidence is approval-blocking", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [{
        issueId: "issue_launch_gate_dashboard_metric",
        sourceFindingIds: ["measurement_finding_1"],
        severity: "P0",
        p0Category: "measurement_failure",
        question: "监控看板已有 expanded metric list，但核心验收指标、baseline 和归因窗口未完全收敛，如何判断成败？",
        evidenceRefs: ["fact_expanded_metrics", "fact_monitoring_dashboard", "missing_launch_gate_metric"],
        severityReason: "缺少这些收敛口径会导致成败无法解释。",
        recommendedRevision: "补充主验收指标、baseline、归因窗口和通过阈值。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "measurement_finding_1" }],
    factLedger: {
      facts: [{
        factId: "fact_expanded_metrics",
        category: "dashboard",
        claim: "Expanded embedded sheet lists dashboard metrics and definitions."
      }, {
        factId: "fact_monitoring_dashboard",
        category: "dashboard",
        claim: "The PRD says the dashboard supports campaign monitoring and recap."
      }],
      missingFacts: [{
        missingFactId: "missing_launch_gate_metric",
        category: "measurement",
        claim: "Launch-gate dashboard lacks primary metric, baseline, attribution window, and pass threshold.",
        approvalImpact: "approval_blocking"
      }]
    }
  });

  assert.equal(validated.verdictRisk, "Blocked");
  assert.equal(validated.issues[0].severity, "P0");
  assert.equal(validated.p0GateDecisions[0].kept, true);
  assert.equal(validated.p0GateDecisions[0].reasonCode, "measurement_success_uninterpretable");
});

test("validateJudgeDecision downgrades significance-only candidate P0", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [{
        issueId: "issue_stats",
        sourceFindingIds: ["experiment_finding_1"],
        severity: "P0",
        p0Category: "measurement_failure",
        question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
        evidenceRefs: ["missing_stats"],
        severityReason: "没有这些统计参数会导致实验成败无法判断。",
        recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "experiment_finding_1", reviewerId: "experiment_design" }],
    factLedger: {
      facts: [{ factId: "fact_experiment", category: "experiment", claim: "AB compares control and treatment." }],
      missingFacts: [{ missingFactId: "missing_stats", category: "measurement", claim: "Sample size and significance level are missing.", approvalImpact: "follow_up" }]
    }
  });

  assert.equal(validated.verdictRisk, "Conditional Pass");
  assert.equal(validated.issues[0].severity, "P1");
  assert.ok(validated.downgradedFindings.some((item) => /statistical audit/i.test(item.reason)));
});

test("validateJudgeDecision downgrades delivery P0 when bridge fields are only readiness assertions", () => {
  const validated = validateJudgeDecision({
    judgeDecision: {
      verdictRisk: "Blocked",
      issues: [{
        issueId: "issue_template_fallback_ready",
        sourceFindingIds: ["delivery_finding_1"],
        severity: "P0",
        p0Category: "delivery_viability_failure",
        question: "消息模板、文案审批和发送失败 fallback 是否明确？",
        evidenceRefs: ["missing_template_fallback"],
        severityReason: "缺少模板和 fallback 会影响消息发送。",
        recommendedRevision: "补充模板、审批和 fallback。",
        blockedOutcome: "缺少模板和 fallback 会影响消息发送。",
        affectedPath: "消息发送链路",
        bridgeEvidenceRefs: ["missing_template_fallback"],
        whyReviewCannotPass: "无法证明消息发送链路可交付。"
      }],
      downgradedFindings: [],
      preservedDissent: []
    },
    reviewerFindings: [{ findingId: "delivery_finding_1" }],
    factLedger: {
      facts: [],
      missingFacts: [{
        missingFactId: "missing_template_fallback",
        category: "delivery",
        claim: "Message template and fallback are not documented.",
        approvalImpact: "follow_up"
      }]
    }
  });

  assert.equal(validated.verdictRisk, "Conditional Pass");
  assert.equal(validated.issues[0].severity, "P1");
  assert.equal(validated.issues[0].p0Category, null);
  assert.ok(validated.downgradedFindings.some((item) => /delivery readiness follow-up/i.test(item.reason)));
});

test("parseJudgeResponse extracts groupAdmission into admissionRisk", () => {
  assert.equal(parseJudgeResponse(JSON.stringify({ verdictRisk: "Pass", groupAdmission: "needs pre-review fix", issues: [] })).admissionRisk, "needs pre-review fix");
  assert.equal(parseJudgeResponse(JSON.stringify({ verdictRisk: "Pass", groupAdmission: "Ready", issues: [] })).admissionRisk, "ready");
  assert.equal(parseJudgeResponse(JSON.stringify({ verdictRisk: "Pass", issues: [] })).admissionRisk, "ready");
  assert.equal(parseJudgeResponse(JSON.stringify({ verdictRisk: "Pass", groupAdmission: "否", issues: [] })).admissionRisk, "needs pre-review fix");
});

test("validateJudgeDecision preserves admissionRisk and defaults to ready", () => {
  const rejected = validateJudgeDecision({ judgeDecision: { admissionRisk: "needs pre-review fix", verdictRisk: "Pass", issues: [] }, reviewerFindings: [], factLedger: {} });
  assert.equal(rejected.admissionRisk, "needs pre-review fix");
  const defaulted = validateJudgeDecision({ judgeDecision: { verdictRisk: "Pass", issues: [] }, reviewerFindings: [], factLedger: {} });
  assert.equal(defaulted.admissionRisk, "ready");
});

test("buildJudgePrompt asks for a groupAdmission assessment", () => {
  const prompt = buildJudgePrompt({ reviewerFindings: [], factLedger: {} });
  assert.match(prompt, /groupAdmission/);
  assert.match(prompt, /组内准入/);
});
