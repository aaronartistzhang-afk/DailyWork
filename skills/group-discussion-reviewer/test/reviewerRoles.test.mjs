import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoleReviewPrompt,
  parseRoleReviewResponse,
  selectReviewerRoles
} from "../src/reviewerRoles.mjs";

test("selectReviewerRoles keeps Standard Review to core reviewers", () => {
  const roles = selectReviewerRoles({
    reviewMode: "standard",
    scenarioSignals: [
      { signalId: "experiment", confidence: "high" },
      { signalId: "ai_capability", confidence: "high" }
    ]
  });

  assert.deepEqual(roles.map((role) => role.id), [
    "business_strategy",
    "measurement",
    "workflow_ux",
    "risk_governance"
  ]);
});

test("selectReviewerRoles adds high-confidence conditional reviewers for Deep Review", () => {
  const roles = selectReviewerRoles({
    reviewMode: "deep",
    scenarioSignals: [
      { signalId: "experiment", confidence: "high" },
      { signalId: "ai_capability", confidence: "medium" },
      { signalId: "incentive", confidence: "high" }
    ]
  });

  assert.deepEqual(roles.map((role) => role.id), [
    "business_strategy",
    "measurement",
    "workflow_ux",
    "risk_governance",
    "experiment_design",
    "incentive_economy"
  ]);
});

test("selectReviewerRoles adds relevant conditional and contrarian role for Challenge Review", () => {
  const roles = selectReviewerRoles({
    reviewMode: "challenge",
    scenarioSignals: [
      { signalId: "data_product", confidence: "medium" },
      { signalId: "localization", confidence: "low" },
      { signalId: "technical_feasibility", confidence: "high" }
    ]
  });

  assert.deepEqual(roles.map((role) => role.id), [
    "business_strategy",
    "measurement",
    "workflow_ux",
    "risk_governance",
    "data_product",
    "technical_feasibility",
    "contrarian_product_review"
  ]);
});

test("buildRoleReviewPrompt requires cited findings and forbids seeing other reviewers", () => {
  const prompt = buildRoleReviewPrompt({
    role: { id: "measurement", label: "Measurement", focus: "metric definition", nonGoal: "pipeline audit" },
    factLedger: {
      facts: [{ factId: "fact_1", category: "metric", claim: "CTR is the metric." }],
      missingFacts: [{ missingFactId: "missing_1", category: "measurement", claim: "Denominator missing." }]
    },
    scenarioSignals: [{ signalId: "measurement", confidence: "high" }],
    reviewMode: "deep",
    outputLanguage: "zh"
  });

  assert.match(prompt, /Independent Reviewer Pass/);
  assert.match(prompt, /measurement/);
  assert.match(prompt, /Do not use other reviewers' outputs/);
  assert.match(prompt, /fact_id/);
  assert.match(prompt, /missing_fact_id/);
  assert.match(prompt, /context_fact_id/);
  assert.match(prompt, /At most 3 findings/);
  assert.match(prompt, /Return valid JSON only/);
  assert.match(prompt, /why now/i);
  assert.match(prompt, /converged goal/i);
  assert.match(prompt, /decisive contradiction/i);
  assert.match(prompt, /explanation is not a solution/i);
  assert.match(prompt, /reuse existing capability/i);
});

test("parseRoleReviewResponse parses structured reviewer findings", () => {
  const parsed = parseRoleReviewResponse(JSON.stringify({
    reviewerId: "measurement",
    findings: [{
      findingId: "finding_1",
      question: "分母是什么？",
      severityProposed: "P0",
      p0Category: "measurement_failure",
      evidenceRefs: ["missing_1"],
      impactReason: "Success cannot be interpreted.",
      recommendedRevision: "Define denominator."
    }]
  }));

  assert.equal(parsed.reviewerId, "measurement");
  assert.equal(parsed.findings[0].findingId, "finding_1");
  assert.deepEqual(parsed.findings[0].evidenceRefs, ["missing_1"]);
});
