import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFactLedgerPrompt,
  parseFactLedgerResponse,
  serializeFactLedgerForReview
} from "../src/prdFactLedger.mjs";

test("buildFactLedgerPrompt asks for structured facts and missing facts", () => {
  const prompt = buildFactLedgerPrompt({
    prdContent: "This PRD changes campaign metrics.",
    outputLanguage: "zh",
    chunkMeta: {
      chunkId: "chunk_1",
      startChar: 0,
      endChar: 33
    }
  });

  assert.match(prompt, /PRD Fact Ledger/);
  assert.match(prompt, /facts/);
  assert.match(prompt, /approvalBlockingMissingFacts/);
  assert.match(prompt, /followUpMissingFacts/);
  assert.match(prompt, /sourceExcerpt/);
  assert.match(prompt, /evidenceStrength/);
  assert.match(prompt, /confidence/);
  assert.match(prompt, /chunk_1/);
  assert.match(prompt, /Simplified Chinese/);
  assert.match(prompt, /At most 12 facts/);
  assert.match(prompt, /At most 4 approvalBlockingMissingFacts/);
  assert.match(prompt, /At most 8 followUpMissingFacts/);
  assert.match(prompt, /resourceCoverage/);
  assert.match(prompt, /unexpandedResources/);
  assert.match(prompt, /sourceRef/);
});

test("buildFactLedgerPrompt treats monitoring dashboard metric convergence as follow-up unless decision gate is explicit", () => {
  const prompt = buildFactLedgerPrompt({
    prdContent: "Dashboard PRD with metrics table.",
    outputLanguage: "zh"
  });

  assert.match(prompt, /monitoring or recap dashboard/i);
  assert.match(prompt, /followUpMissingFacts/i);
  assert.match(prompt, /launch, ramp, settlement, SOT, or resource decision gate/i);
  assert.match(prompt, /approvalBlockingMissingFacts/i);
});

test("parseFactLedgerResponse parses valid JSON responses with missing fact tiers", () => {
  const parsed = parseFactLedgerResponse(JSON.stringify({
    facts: [{
      factId: "fact_1",
      category: "metric",
      claim: "CTR is the primary metric.",
      sourceExcerpt: "CTR",
      sourceRef: "resource:sheet:e9LMNf",
      evidenceStrength: "direct",
      confidence: "high"
    }],
    approvalBlockingMissingFacts: [{
      missingFactId: "missing_1",
      category: "measurement",
      claim: "Denominator is not defined.",
      evidenceStrength: "missing",
      confidence: "high"
    }],
    followUpMissingFacts: [{
      missingFactId: "missing_2",
      category: "rollout",
      claim: "Dashboard refresh cadence is not defined.",
      sourceRef: "resource:sheet:e9LMNf",
      evidenceStrength: "missing",
      confidence: "medium"
    }],
    coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 100 }],
    resourceCoverage: [{
      resourceId: "sheet:e9LMNf",
      type: "sheet",
      status: "expanded",
      summary: "Metrics table was expanded."
    }],
    unexpandedResources: [{
      resourceId: "sheet:ref",
      type: "sheet",
      status: "referenced",
      reason: "Reference resource was not expanded."
    }]
  }));

  assert.equal(parsed.facts[0].factId, "fact_1");
  assert.equal(parsed.facts[0].sourceRef, "resource:sheet:e9LMNf");
  assert.equal(parsed.missingFacts[0].missingFactId, "missing_1");
  assert.equal(parsed.missingFacts[0].approvalImpact, "approval_blocking");
  assert.equal(parsed.missingFacts[1].missingFactId, "missing_2");
  assert.equal(parsed.missingFacts[1].approvalImpact, "follow_up");
  assert.equal(parsed.missingFacts[1].sourceRef, "resource:sheet:e9LMNf");
  assert.equal(parsed.approvalBlockingMissingFacts[0].missingFactId, "missing_1");
  assert.equal(parsed.followUpMissingFacts[0].missingFactId, "missing_2");
  assert.equal(parsed.coverageMap[0].chunkId, "chunk_1");
  assert.equal(parsed.resourceCoverage[0].resourceId, "sheet:e9LMNf");
  assert.equal(parsed.unexpandedResources[0].status, "referenced");
});

test("parseFactLedgerResponse throws a clear error on invalid JSON", () => {
  assert.throws(
    () => parseFactLedgerResponse("not json"),
    /Fact Ledger response was not valid JSON/
  );
});

test("serializeFactLedgerForReview creates a compact review input", () => {
  const text = serializeFactLedgerForReview({
    facts: [{ factId: "fact_1", category: "objective", claim: "Increase activity participation." }],
    approvalBlockingMissingFacts: [{ missingFactId: "missing_1", category: "measurement", claim: "No denominator.", approvalImpact: "approval_blocking" }],
    followUpMissingFacts: [{ missingFactId: "missing_2", category: "rollout", claim: "No dashboard refresh cadence.", approvalImpact: "follow_up" }],
    coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 50 }],
    resourceCoverage: [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded", summary: "Metric sheet expanded." }],
    unexpandedResources: [{ resourceId: "sheet:ref", type: "sheet", status: "referenced", reason: "Reference only." }]
  });

  assert.match(text, /\[PRD FACT LEDGER\]/);
  assert.match(text, /fact_1/);
  assert.match(text, /missing_1/);
  assert.match(text, /missing_2/);
  assert.match(text, /approvalBlockingMissingFacts/);
  assert.match(text, /followUpMissingFacts/);
  assert.match(text, /chunk_1/);
  assert.match(text, /resourceCoverage/);
  assert.match(text, /unexpandedResources/);
  assert.match(text, /sheet:e9LMNf/);
});
