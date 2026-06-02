import test from "node:test";
import assert from "node:assert/strict";

import { extractOutputText, generateReview, preparePrdForReview } from "../src/openaiReview.mjs";

test("extractOutputText supports Responses API output_text", () => {
  assert.equal(extractOutputText({ output_text: "hello" }), "hello");
});

test("generateReview sends Standard Review through the governed multi reviewer path", async () => {
  const calls = [];
  const result = await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "A sufficiently detailed PRD body for a test review.",
    prdType: "data",
    outputDepth: "p0",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const input = JSON.parse(options.body).messages[0].content[0].text;
      if (input.includes("PRD Fact Ledger")) {
        return jsonResponse(factLedgerPayload("full_prd"));
      }
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(roleReviewPayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgeDecisionPayload());
      if (input.includes("Final Composer")) return jsonResponse(finalReviewPayload("## Simulation Questions"));
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.match(calls[0].url, /^https:\/\/api\.openai\.com\/v1\?ak=/);
  assert.equal(JSON.parse(calls[0].options.body).model, "model-1");
  assert.match(JSON.parse(calls[0].options.body).messages[0].content[0].text, /PRD Fact Ledger/);
  assert.equal(JSON.parse(calls[0].options.body).response_format.type, "json_object");
  assert.ok(calls.some((call) => JSON.parse(call.options.body).messages[0].content[0].text.includes("Independent Reviewer Pass")));
  assert.ok(calls.some((call) => JSON.parse(call.options.body).messages[0].content[0].text.includes("Judge / Arbiter")));
  assert.ok(calls.some((call) => JSON.parse(call.options.body).messages[0].content[0].text.includes("Final Composer")));
  assert.match(result.review, /模拟评审结果：有条件通过/);
  assert.match(result.review, /## Simulation Questions/);
  assert.equal(result.artifacts.judgeDecision.verdictRisk, "Conditional Pass");
  assert.ok(result.costUsd > 0);
});

test("generateReview forwards selected review mode into the prompt", async () => {
  const calls = [];
  await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "A sufficiently detailed PRD body for a test review.",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const input = JSON.parse(options.body).messages[0].content[0].text;
      if (input.includes("PRD Fact Ledger")) {
        return jsonResponse(factLedgerPayload("full_prd"));
      }
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(roleReviewPayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgeDecisionPayload());
      if (input.includes("Final Composer")) return jsonResponse(finalReviewPayload("review ok"));
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const input = calls
    .map((call) => JSON.parse(call.options.body).messages[0].content[0].text)
    .find((body) => body.includes("Independent Reviewer Pass"));
  assert.match(input, /Review mode: standard/);
  assert.doesNotMatch(input, /Challenge Review \(default strict mode\)/);
});

test("preparePrdForReview reports long PRDs as chunked instead of condensed excerpts", () => {
  const prdContent = [
    "# Long PRD",
    "Important opening context.",
    "x".repeat(130_000),
    "Important closing rollout notes."
  ].join("\n");

  const prepared = preparePrdForReview(prdContent);

  assert.equal(prepared.condensed, false);
  assert.equal(prepared.chunked, true);
  assert.equal(prepared.originalLength, prdContent.length);
  assert.ok(prepared.chunks.length > 1);
  assert.equal(prepared.chunks[0].chunkId, "chunk_1");
});

test("generateReview extracts fact ledgers from long PRD chunks", async () => {
  const calls = [];
  const result = await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: `# PRD\n${"long section\n".repeat(13_000)}closing notes`,
    prdType: "data",
    outputDepth: "p0",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const input = JSON.parse(options.body).messages[0].content[0].text;
      if (input.includes("PRD Fact Ledger")) {
        const chunkId = input.match(/Chunk: (chunk_\d+)/)?.[1] || "chunk_1";
        return jsonResponse(factLedgerPayload(chunkId));
      }
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(roleReviewPayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgeDecisionPayload());
      if (input.includes("Final Composer")) return jsonResponse(finalReviewPayload("review ok"));
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const factLedgerCalls = calls.filter((call) => JSON.parse(call.options.body).messages[0].content[0].text.includes("PRD Fact Ledger"));
  const reviewerInput = calls
    .map((call) => JSON.parse(call.options.body).messages[0].content[0].text)
    .find((body) => body.includes("Independent Reviewer Pass"));
  assert.match(result.review, /模拟评审结果：有条件通过/);
  assert.match(result.review, /review ok/);
  assert.ok(factLedgerCalls.length > 1);
  assert.match(reviewerInput, /\[PRD FACT LEDGER\]/);
  assert.match(reviewerInput, /chunk_1_fact_1/);
  assert.doesNotMatch(reviewerInput, /AUTO-CONDENSED LONG PRD/);
});

test("generateReview retries compact JSON when legacy Fact Ledger output is invalid", async () => {
  const calls = [];
  let factLedgerAttempts = 0;
  const result = await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "A sufficiently detailed PRD body for fact ledger retry.",
    prdType: "data",
    outputDepth: "p0",
    reviewMode: "standard",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const input = JSON.parse(options.body).messages[0].content[0].text;
      if (input.includes("PRD Fact Ledger")) {
        factLedgerAttempts += 1;
        if (factLedgerAttempts === 1) {
          return jsonResponse({
            output_text: "{\"facts\":[{\"factId\":\"fact_1\"",
            usage: { input_tokens: 100, output_tokens: 10 }
          });
        }
        return jsonResponse(factLedgerPayload("full_prd"));
      }
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(roleReviewPayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgeDecisionPayload());
      if (input.includes("Final Composer")) return jsonResponse(finalReviewPayload("review ok"));
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const factLedgerCalls = calls.filter((call) => JSON.parse(call.options.body).messages[0].content[0].text.includes("PRD Fact Ledger"));
  assert.equal(factLedgerCalls.length, 2);
  assert.match(JSON.parse(factLedgerCalls[1].options.body).messages[0].content[0].text, /Structured JSON retry/);
  assert.match(result.review, /模拟评审结果：有条件通过/);
  assert.match(result.review, /review ok/);
  assert.equal(
    result.usage.input_tokens,
    100 + 100 + (80 * result.artifacts.reviewerRoles.length) + 120 + 150
  );
  assert.equal(
    result.usage.output_tokens,
    10 + 50 + (40 * result.artifacts.reviewerRoles.length) + 60 + 80
  );
});

test("generateReview includes feedback context for regenerated reviews", async () => {
  const calls = [];
  await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "A sufficiently detailed PRD body for a regenerated review.",
    reviewMode: "standard",
    previousReview: "## P0 Blockers\n### P0-1: Existing issue",
    feedbackItems: [{
      feedbackId: "fb_1",
      target: "p0",
      feedbackType: "severity_disagreement",
      tags: ["too_strict"],
      comment: "This should not be P0."
    }],
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const input = JSON.parse(options.body).messages[0].content[0].text;
      if (input.includes("PRD Fact Ledger")) {
        return jsonResponse(factLedgerPayload("full_prd"));
      }
      if (input.includes("Independent Reviewer Pass")) return jsonResponse(roleReviewPayload(input));
      if (input.includes("Judge / Arbiter")) return jsonResponse(judgeDecisionPayload());
      if (input.includes("Final Composer")) return jsonResponse(finalReviewPayload("review ok"));
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  const judgeInput = calls
    .map((call) => JSON.parse(call.options.body).messages[0].content[0].text)
    .find((body) => body.includes("Judge / Arbiter"));
  const finalInput = calls
    .map((call) => JSON.parse(call.options.body).messages[0].content[0].text)
    .find((body) => body.includes("Final Composer"));
  assert.match(judgeInput, /Regeneration with feedback/);
  assert.match(judgeInput, /This should not be P0/);
  assert.match(finalInput, /Feedback Decisions/);
});

test("generateReview can route to the multi reviewer pipeline behind a feature flag", async () => {
  const calls = [];
  const result = await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1",
      multiReviewerPipelineEnabled: true
    },
    prdContent: "A sufficiently detailed PRD body with an AB experiment and CTR metric.",
    outputDepth: "p0",
    outputLanguage: "zh",
    reviewMode: "deep",
    fetchImpl: async (url, options) => {
      const input = JSON.parse(options.body).messages[0].content[0].text;
      calls.push(input);
      if (input.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload("full_prd"));
      if (input.includes("Independent Reviewer Pass")) {
        const reviewerId = input.match(/Reviewer role ID: ([a-z_]+)/)?.[1] || "unknown";
        return jsonResponse({
          output_text: JSON.stringify({
            reviewerId,
            findings: [{
              findingId: `${reviewerId}_finding_1`,
              question: "口径是什么？",
              severityProposed: "P1",
              p0Category: null,
              evidenceRefs: ["full_prd_missing_1"],
              impactReason: "Metric interpretation risk.",
              recommendedRevision: "Define the denominator."
            }]
          }),
          usage: { input_tokens: 80, output_tokens: 40 }
        });
      }
      if (input.includes("Judge / Arbiter")) {
        return jsonResponse({
          output_text: JSON.stringify({
            verdictRisk: "Conditional Pass",
            issues: [{
              issueId: "issue_1",
              sourceFindingIds: ["measurement_finding_1"],
              severity: "P1",
              p0Category: null,
              question: "口径是什么？",
              evidenceRefs: ["full_prd_missing_1"],
              severityReason: "Metric interpretation risk.",
              recommendedRevision: "Define the denominator."
            }],
            downgradedFindings: [],
            preservedDissent: []
          }),
          usage: { input_tokens: 120, output_tokens: 60 }
        });
      }
      if (input.includes("Final Composer")) {
        return jsonResponse({
          output_text: "## Review Verdict\n结论：有条件通过",
          usage: { input_tokens: 150, output_tokens: 80 }
        });
      }
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.review, "## 组内准入\n组内准入：是\n\n## 模拟评审结果\n模拟评审结果：有条件通过");
  assert.ok(calls.some((input) => input.includes("Independent Reviewer Pass")));
  assert.ok(calls.some((input) => input.includes("Judge / Arbiter")));
  assert.ok(calls.some((input) => input.includes("Final Composer")));
  assert.ok(Array.isArray(result.artifacts.reviewerFindings));
});

test("generateReview routes Deep Review to the multi reviewer pipeline by default", async () => {
  const calls = [];
  const result = await generateReview({
    config: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "key",
      model: "model-1"
    },
    prdContent: "A sufficiently detailed PRD body with funnel metrics, creator cohorts, and launch guardrails.",
    outputDepth: "p0",
    outputLanguage: "zh",
    reviewMode: "deep",
    fetchImpl: async (url, options) => {
      const input = JSON.parse(options.body).messages[0].content[0].text;
      calls.push(input);
      if (input.includes("PRD Fact Ledger")) return jsonResponse(factLedgerPayload("full_prd"));
      if (input.includes("Independent Reviewer Pass")) {
        const reviewerId = input.match(/Reviewer role ID: ([a-z_]+)/)?.[1] || "unknown";
        return jsonResponse({
          output_text: JSON.stringify({
            reviewerId,
            findings: [{
              findingId: `${reviewerId}_finding_1`,
              question: "目标口径是什么？",
              severityProposed: "P1",
              p0Category: null,
              evidenceRefs: ["full_prd_missing_1"],
              impactReason: "Metric interpretation risk.",
              recommendedRevision: "Define the denominator."
            }]
          }),
          usage: { input_tokens: 80, output_tokens: 40 }
        });
      }
      if (input.includes("Judge / Arbiter")) {
        return jsonResponse({
          output_text: JSON.stringify({
            verdictRisk: "Conditional Pass",
            issues: [{
              issueId: "issue_1",
              sourceFindingIds: ["measurement_finding_1"],
              severity: "P1",
              p0Category: null,
              question: "目标口径是什么？",
              evidenceRefs: ["full_prd_missing_1"],
              severityReason: "Metric interpretation risk.",
              recommendedRevision: "Define the denominator."
            }],
            downgradedFindings: [],
            preservedDissent: []
          }),
          usage: { input_tokens: 120, output_tokens: 60 }
        });
      }
      if (input.includes("Final Composer")) {
        return jsonResponse({
          output_text: "## Review Verdict\n结论：有条件通过",
          usage: { input_tokens: 150, output_tokens: 80 }
        });
      }
      return jsonResponse({ output_text: "unexpected" });
    }
  });

  assert.equal(result.review, "## 组内准入\n组内准入：是\n\n## 模拟评审结果\n模拟评审结果：有条件通过");
  assert.ok(calls.some((input) => input.includes("Independent Reviewer Pass")));
  assert.ok(calls.some((input) => input.includes("Judge / Arbiter")));
  assert.ok(calls.some((input) => input.includes("Final Composer")));
});

function factLedgerPayload(chunkId) {
  return {
    output_text: JSON.stringify({
      facts: [{
        factId: "fact_1",
        category: "metric",
        claim: `${chunkId} defines campaign CTR.`,
        sourceExcerpt: "CTR",
        evidenceStrength: "direct",
        confidence: "high"
      }],
      missingFacts: [{
        missingFactId: "missing_1",
        category: "measurement",
        claim: `${chunkId} missing denominator.`,
        evidenceStrength: "missing",
        confidence: "high"
      }],
      coverageMap: [{ chunkId, startChar: 0, endChar: 100 }]
    }),
    usage: {
      input_tokens: 100,
      output_tokens: 50
    }
  };
}

function roleReviewPayload(input) {
  const reviewerId = input.match(/Reviewer role ID: ([a-z_]+)/)?.[1] || "unknown";
  return {
    output_text: JSON.stringify({
      reviewerId,
      findings: [{
        findingId: `${reviewerId}_finding_1`,
        question: "口径是什么？",
        severityProposed: "P1",
        p0Category: null,
        evidenceRefs: ["full_prd_missing_1"],
        impactReason: "Metric interpretation risk.",
        recommendedRevision: "Define the denominator."
      }]
    }),
    usage: {
      input_tokens: 80,
      output_tokens: 40
    }
  };
}

function judgeDecisionPayload() {
  return {
    output_text: JSON.stringify({
      verdictRisk: "Conditional Pass",
      issues: [{
        issueId: "issue_1",
        sourceFindingIds: ["measurement_finding_1"],
        severity: "P1",
        p0Category: null,
        question: "口径是什么？",
        evidenceRefs: ["full_prd_missing_1"],
        severityReason: "Metric interpretation risk.",
        recommendedRevision: "Define denominator."
      }],
      downgradedFindings: [],
      preservedDissent: []
    }),
    usage: {
      input_tokens: 120,
      output_tokens: 60
    }
  };
}

function finalReviewPayload(outputText) {
  return {
    output_text: outputText,
    usage: {
      input_tokens: 150,
      output_tokens: 80
    }
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
