import test from "node:test";
import assert from "node:assert/strict";

import { runMultiReviewerPipeline } from "../src/multiReviewerPipeline.mjs";

test("runMultiReviewerPipeline calls Fact Ledger, independent reviewers, Judge, and Final Composer", async () => {
  const calls = [];
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD defines an AB experiment and campaign metric denominator.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "deep",
    fetchImpl: async (url, options) => {
      const input = JSON.parse(options.body).messages[0].content[0].text;
      calls.push(input);
      if (input.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload());
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgePayload());
      if (input.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const factLedgerCalls = calls.filter((input) => input.includes("PRD Fact Ledger"));
  const reviewerCalls = calls.filter((input) => input.includes("Independent Reviewer Pass"));
  const judgeCalls = calls.filter((input) => input.includes("Judge / Arbiter"));
  const finalCalls = calls.filter((input) => input.includes("Final Composer"));

  assert.equal(factLedgerCalls.length, 1);
  assert.ok(reviewerCalls.length >= 5);
  assert.equal(judgeCalls.length, 1);
  assert.equal(finalCalls.length, 1);
  assert.equal(result.review, "## 组内准入\n组内准入：是\n\n## 模拟评审结果\n模拟评审结果：有条件通过");
  assert.ok(result.costUsd > 0);
  assert.ok(result.artifacts.reviewerFindings.length >= 5);
  assert.equal(result.artifacts.judgeDecision.issues[0].issueId, "issue_1");

  for (const reviewerInput of reviewerCalls) {
    assert.doesNotMatch(reviewerInput, /measurement_finding_1|workflow_finding_1|risk_finding_1/);
    assert.doesNotMatch(reviewerInput, /\[INDEPENDENT REVIEWER FINDINGS\]/);
  }
});

test("runMultiReviewerPipeline passes regeneration feedback into Judge and Final Composer", async () => {
  const calls = [];
  await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD defines a campaign metric.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    previousReview: "## P0 Blockers\n### P0-1: Existing issue",
    feedbackItems: [{
      feedbackId: "fb_1",
      feedbackType: "severity_disagreement",
      comment: "这个 P0 过于严格。"
    }],
    fetchImpl: async (url, options) => {
      const input = JSON.parse(options.body).messages[0].content[0].text;
      calls.push(input);
      if (input.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload());
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgePayload());
      if (input.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const judgeInput = calls.find((input) => input.includes("Judge / Arbiter"));
  const finalInput = calls.find((input) => input.includes("Final Composer"));
  assert.match(judgeInput, /Regeneration with feedback/);
  assert.match(judgeInput, /fb_1/);
  assert.match(judgeInput, /do not comply by default/i);
  assert.match(finalInput, /Feedback Decisions/);
  assert.match(finalInput, /fb_1/);
});

test("runMultiReviewerPipeline adds phase context when a reviewer response fails", async () => {
  await assert.rejects(
    () => runMultiReviewerPipeline({
      config: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "key",
        model: "model-1"
      },
      prdContent: "This PRD defines a campaign metric.",
      outputDepth: "full",
      outputLanguage: "zh",
      reviewMode: "standard",
      fetchImpl: async (url, options) => {
        const input = JSON.parse(options.body).messages[0].content[0].text;
        if (input.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload());
        if (input.includes("Reviewer role ID: measurement")) return jsonResponse({ output_text: "{not-json" });
        if (input.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(input));
        return jsonResponse({ output_text: "unexpected" });
      }
    }),
    /phase=reviewer.*reviewerId=measurement/
  );
});

test("runMultiReviewerPipeline requests JSON mode for structured intermediate calls", async () => {
  const bodies = [];
  await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD defines an AB experiment and campaign metric denominator.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      bodies.push(body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload());
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse(judgePayload());
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const structuredBodies = bodies.filter((body) => (
    body.messages[0].content[0].text.includes("PRD Fact Ledger") ||
    body.messages[0].content[0].text.includes("Independent Reviewer Pass") ||
    body.messages[0].content[0].text.includes("Judge / Arbiter")
  ));
  const finalBody = bodies.find((body) => body.messages[0].content[0].text.includes("Final Composer"));
  assert.ok(structuredBodies.length > 0);
  assert.ok(structuredBodies.every((body) => body.response_format?.type === "json_object"));
  assert.equal(finalBody.response_format, undefined);
});

test("runMultiReviewerPipeline retries compact JSON when Judge output is invalid", async () => {
  const calls = [];
  let judgeAttempts = 0;
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD defines an AB experiment and campaign metric denominator.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload());
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) {
        judgeAttempts += 1;
        if (judgeAttempts === 1) {
          return jsonResponse({
            output_text: "{\"verdictRisk\":\"Conditional Pass\",\"issues\":[{\"issueId\":\"issue_1\"",
            usage: { input_tokens: 120, output_tokens: 30 }
          });
        }
        return jsonResponse(judgePayload());
      }
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const judgeCalls = calls.filter((body) => body.messages[0].content[0].text.includes("Judge / Arbiter"));
  assert.equal(judgeCalls.length, 2);
  assert.match(judgeCalls[1].messages[0].content[0].text, /Structured JSON retry/i);
  assert.equal(result.artifacts.judgeDecision.issues[0].issueId, "issue_1");
  assert.equal(result.usage.output_tokens, 50 + (40 * result.artifacts.reviewerRoles.length) + 30 + 60 + 80);
});

test("runMultiReviewerPipeline exposes P0 gate decisions in artifacts and final composer input", async () => {
  const calls = [];
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD uses a formal AB result as a ramp decision gate, but the extracted evidence does not mark the statistics gap as approval-blocking.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body.messages[0].content[0].text);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{ factId: "fact_1", category: "experiment", claim: "Formal AB result is the ramp decision gate.", evidenceStrength: "direct", confidence: "high" }],
          missingFacts: [{ missingFactId: "missing_experiment_decision", category: "measurement", claim: "Formal experiment statistics are incomplete, but no approval-blocking impact is marked.", approvalImpact: "follow_up", evidenceStrength: "missing", confidence: "high" }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_experiment_decision",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "正式 AB 放量决策缺少显著性水平、MDE、样本量和停止规则，怎么判断是否替代旧策略？",
            evidenceRefs: ["chunk_1_missing_experiment_decision"],
            severityReason: "实验结论作为放量门槛，但统计判定细节未完整展开。",
            recommendedRevision: "补充 alpha、MDE、样本量、观察窗口和停止规则。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const finalInput = calls.find((input) => input.includes("Final Composer"));
  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P1");
  assert.equal(result.artifacts.p0GateDecisions[0].reasonCode, "statistical_audit_without_approval_blocking_evidence");
  assert.match(finalInput, /"verdictRisk": "Conditional Pass"/);
  assert.match(finalInput, /"p0GateDecisions"/);
});

test("runMultiReviewerPipeline downgrades statistical-audit-only P0 to Conditional Pass", async () => {
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD mentions an AB experiment but does not make it a launch gate.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "deep",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{ factId: "fact_1", category: "experiment", claim: "AB experiment is mentioned.", evidenceStrength: "direct", confidence: "high" }],
          followUpMissingFacts: [{ missingFactId: "missing_stats", category: "measurement", claim: "Sample size and significance level are not specified.", evidenceStrength: "missing", confidence: "medium" }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_stats",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
            evidenceRefs: ["chunk_1_missing_stats"],
            severityReason: "没有这些统计参数会导致实验成败无法判断。",
            recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P1");
  assert.ok(result.artifacts.judgeDecision.downgradedFindings.some((item) => /statistical audit/i.test(item.reason)));
});

test("runMultiReviewerPipeline normalizes final verdict to Judge decision after P0 gatekeeping", async () => {
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This known-passed PRD may have follow-up questions but no surviving P0 blocker.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{ factId: "fact_1", category: "system", claim: "The PRD has a coherent launch path.", evidenceStrength: "direct", confidence: "high" }],
          missingFacts: [{ missingFactId: "missing_stats", category: "measurement", claim: "Sample size and significance level are not specified.", evidenceStrength: "missing", confidence: "medium" }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_stats",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
            evidenceRefs: ["chunk_1_missing_stats"],
            severityReason: "没有这些统计参数会导致实验成败无法判断。",
            recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse({
        output_text: "## Review Verdict\n结论：不建议通过\n原因：Composer 误写了更严格的结论。\n\n## P0 Blockers\n无 P0",
        usage: { input_tokens: 150, output_tokens: 80 }
      });
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.match(result.review, /模拟评审结果：有条件通过/);
  assert.doesNotMatch(result.review, /模拟评审结果：不通过|结论：不建议通过/);
});

test("runMultiReviewerPipeline keeps formal experiment decision blocker as Blocked", async () => {
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD uses a formal AB result as the ramp decision gate.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "deep",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{ factId: "fact_1", category: "experiment", claim: "Formal AB result is the ramp decision gate.", evidenceStrength: "direct", confidence: "high" }],
          approvalBlockingMissingFacts: [{ missingFactId: "missing_experiment_decision", category: "measurement", claim: "Primary metric and randomization unit are missing.", evidenceStrength: "missing", confidence: "high" }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_formal_experiment",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "正式 AB 放量决策缺少主指标、随机化单位、污染处理和归因窗口，怎么判断是否替代旧策略？",
            evidenceRefs: ["chunk_1_missing_experiment_decision"],
            severityReason: "实验结论作为放量门槛，但缺少分流和归因口径会让成败无法解释。",
            recommendedRevision: "补充 primary metric、随机化单位、污染处理、归因窗口和放量门槛。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Blocked");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P0");
  assert.equal(result.artifacts.p0GateDecisions[0].reasonCode, "measurement_success_uninterpretable");
});

test("runMultiReviewerPipeline downgrades dashboard implementation P0 when embedded metrics are covered", async () => {
  const calls = [];
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD includes an embedded dashboard metric sheet.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body.messages[0].content[0].text);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{
            factId: "fact_embedded_metrics",
            category: "dashboard",
            claim: "Embedded Sheet lists selected creator UV, reached creator UV, revenue USD, and metric definitions.",
            sourceRef: "sheet:e9LMNf"
          }],
          missingFacts: [{
            missingFactId: "missing_dashboard_details",
            category: "dashboard",
            claim: "Data source, SQL, refresh cadence, owner, and acceptance sample are not specified.",
            approvalImpact: "follow_up"
          }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }],
          resourceCoverage: [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded", summary: "Metric table expanded." }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_dashboard_details",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "看板已列出圈选主播UV、触达主播UV和营收收入等指标，但数据源、SQL、刷新频率、owner 和验收样例是否明确？",
            evidenceRefs: ["chunk_1_fact_embedded_metrics", "chunk_1_missing_dashboard_details"],
            severityReason: "这些信息影响数据交付效率，但指标列表和业务定义已在嵌入表格中给出。",
            recommendedRevision: "补充数据源表、示例 SQL、刷新频率、owner 和验收样例。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const judgeInput = calls.find((input) => input.includes("Judge / Arbiter"));
  assert.match(judgeInput, /resourceCoverage/);
  assert.match(judgeInput, /sheet:e9LMNf/);
  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P1");
  assert.ok(result.artifacts.judgeDecision.downgradedFindings.some((item) => /dashboard metric implementation/i.test(item.reason)));
});

test("runMultiReviewerPipeline downgrades Campaign-style monitoring dashboard metric P0", async () => {
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "Campaign dashboard PRD with expanded embedded metric sheet and daily monitoring purpose.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{
            factId: "fact_embedded_metrics",
            category: "dashboard",
            claim: "Expanded Sheet lists selected creator UV, reached creator UV, registration UV, revenue USD, paid conversion, component exposure/click PV/UV, priorities, dimensions, and metric definitions.",
            sourceRef: "sheet:e9LMNf"
          }, {
            factId: "fact_monitoring_purpose",
            category: "dashboard",
            claim: "Dashboard purpose is daily campaign monitoring and recap comparison with MOY baseline."
          }],
          missingFacts: [{
            missingFactId: "missing_metric_convergence",
            category: "measurement",
            claim: "Core acceptance metric, MOY baseline comparison formula, aggregation dimension, and attribution window need convergence.",
            approvalImpact: "follow_up"
          }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 120 }],
          resourceCoverage: [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded", summary: "Metric table expanded." }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_live_moment_metric",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "measurement_failure",
            question: "日常监控看板已有指标表，但核心验收指标、MOY baseline 对比口径和归因窗口未收敛，如何判断营收、触达和转化成败？",
            evidenceRefs: ["chunk_1_fact_embedded_metrics", "chunk_1_fact_monitoring_purpose", "chunk_1_missing_metric_convergence"],
            severityReason: "缺少这些口径会影响复盘解释一致性，但指标表已存在且未说明该看板是放量、结算或上线门禁。",
            recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。",
            blockedOutcome: "复盘解释一致性不足",
            affectedPath: "运营查看活动监控和复盘看板",
            bridgeEvidenceRefs: ["chunk_1_missing_metric_convergence"],
            whyReviewCannotPass: "需要补充口径后才能解释成败。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P1");
  assert.ok(result.artifacts.judgeDecision.downgradedFindings.some((item) => (
    /dashboard monitoring metric convergence|dashboard_monitoring_metric_convergence_followup/i.test(item.reason)
  )));
});

test("runMultiReviewerPipeline downgrades ranking boundary P0 when core revival rules are present", async () => {
  const result = await runMultiReviewerPipeline({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "This PRD defines revival rankings and finals qualification.",
    outputDepth: "full",
    outputLanguage: "zh",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.messages[0].content[0].text.includes("PRD Fact Ledger")) return jsonResponse({
        output_text: JSON.stringify({
          facts: [{
            factId: "fact_revival_core",
            category: "reward",
            claim: "Revival participants are semifinal eliminated creators; five lists revive top 3 into finals."
          }],
          missingFacts: [{
            missingFactId: "missing_revival_boundary",
            category: "risk",
            claim: "Tie-break, cross-list dedupe, exception correction, and settlement cutoff are not specified.",
            approvalImpact: "follow_up"
          }],
          coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      if (body.messages[0].content[0].text.includes("Independent Reviewer Pass")) return jsonResponse(rolePayload(body.messages[0].content[0].text));
      if (body.messages[0].content[0].text.includes("Judge / Arbiter")) return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Blocked",
          issues: [{
            issueId: "issue_revival_boundary",
            sourceFindingIds: ["measurement_finding_1"],
            severity: "P0",
            p0Category: "launch_safety_failure",
            question: "复活赛已明确复赛淘汰主播、金木水火土榜、各复活3人和Top3写入决赛，但同分、跨榜去重、异常纠错和结算时点是否明确？",
            evidenceRefs: ["chunk_1_fact_revival_core", "chunk_1_missing_revival_boundary"],
            severityReason: "这些边界会影响对账和运营处理，但核心晋级规则已经明确。",
            recommendedRevision: "补充同分、跨榜去重、异常纠错、结算时点和人工修正规则。"
          }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
      if (body.messages[0].content[0].text.includes("Final Composer")) return jsonResponse(finalPayload());
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.equal(result.artifacts.judgeDecision.issues[0].severity, "P1");
  assert.ok(result.artifacts.judgeDecision.downgradedFindings.some((item) => /ranking boundary rule follow-up/i.test(item.reason)));
});

function factLedgerPayload() {
  return {
    output_text: JSON.stringify({
      facts: [
        { factId: "fact_1", category: "experiment", claim: "AB experiment compares treatment and control.", evidenceStrength: "direct", confidence: "high" },
        { factId: "fact_2", category: "metric", claim: "Campaign CTR is a metric.", evidenceStrength: "direct", confidence: "high" }
      ],
      missingFacts: [
        { missingFactId: "missing_1", category: "measurement", claim: "Denominator missing.", evidenceStrength: "missing", confidence: "high" }
      ],
      coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 80 }]
    }),
    usage: { input_tokens: 100, output_tokens: 50 }
  };
}

function rolePayload(input) {
  const reviewerId = input.match(/Reviewer role ID: ([a-z_]+)/)?.[1] || "unknown";
  return {
    output_text: JSON.stringify({
      reviewerId,
      findings: [{
        findingId: `${reviewerId}_finding_1`,
        question: "分母是什么？",
        severityProposed: "P1",
        p0Category: null,
        evidenceRefs: ["missing_1"],
        impactReason: "The result may be hard to interpret.",
        recommendedRevision: "Define the denominator."
      }]
    }),
    usage: { input_tokens: 80, output_tokens: 40 }
  };
}

function judgePayload() {
  return {
    output_text: JSON.stringify({
      verdictRisk: "Conditional Pass",
      issues: [{
        issueId: "issue_1",
        sourceFindingIds: ["measurement_finding_1"],
        severity: "P1",
        p0Category: null,
        question: "分母是什么？",
        evidenceRefs: ["missing_1"],
        severityReason: "Metric interpretation risk.",
        recommendedRevision: "Define denominator."
      }],
      downgradedFindings: [],
      preservedDissent: []
    }),
    usage: { input_tokens: 120, output_tokens: 60 }
  };
}

function finalPayload() {
  return {
    output_text: "## Review Verdict\n结论：有条件通过",
    usage: { input_tokens: 150, output_tokens: 80 }
  };
}

function jsonResponse(payload, status = 200) {
  // The gateway client speaks chat/completions; adapt the legacy
  // Responses-shaped test payloads ({ output_text, usage:{input_tokens} }).
  const usage = payload.usage || {};
  const body = (payload.choices || payload.error) ? payload : {
    choices: [{ message: { content: payload.output_text ?? "" } }],
    usage: {
      prompt_tokens: usage.input_tokens ?? 0,
      completion_tokens: usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? ((usage.input_tokens || 0) + (usage.output_tokens || 0))
    }
  };
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}
