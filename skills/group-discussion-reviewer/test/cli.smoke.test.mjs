import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runCli, parseArgs, resolveConfig } from "../bin/review-prd.mjs";

function jsonResponse(payload) {
  // Adapt legacy Responses-shaped payloads ({ output_text, usage }) into the
  // OpenAI chat/completions shape the gateway client parses.
  const usage = payload.usage || {};
  const body = (payload.choices || payload.error) ? payload : {
    choices: [{ message: { content: payload.output_text ?? "" } }],
    usage: {
      prompt_tokens: usage.input_tokens ?? 0,
      completion_tokens: usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? ((usage.input_tokens || 0) + (usage.output_tokens || 0))
    }
  };
  return { ok: true, status: 200, json: async () => body };
}

// Canned pipeline payloads routed by prompt marker (offline, no network).
function mockFetch() {
  return async (url, options) => {
    const input = JSON.parse(options.body).messages[0].content[0].text;
    if (input.includes("PRD Fact Ledger")) {
      return jsonResponse({
        output_text: JSON.stringify({
          facts: [{ factId: "fact_1", category: "metric", claim: "defines CTR", sourceExcerpt: "CTR", evidenceStrength: "direct", confidence: "high" }],
          missingFacts: [{ missingFactId: "missing_1", category: "measurement", claim: "missing denominator", evidenceStrength: "missing", confidence: "high" }],
          coverageMap: [{ chunkId: "full_prd", startChar: 0, endChar: 100 }]
        }),
        usage: { input_tokens: 100, output_tokens: 50 }
      });
    }
    if (input.includes("Independent Reviewer Pass")) {
      const reviewerId = input.match(/Reviewer role ID: ([a-z_]+)/)?.[1] || "unknown";
      return jsonResponse({
        output_text: JSON.stringify({
          reviewerId,
          findings: [{ findingId: `${reviewerId}_finding_1`, question: "口径是什么？", severityProposed: "P1", p0Category: null, evidenceRefs: ["missing_1"], impactReason: "metric risk", recommendedRevision: "define denominator" }]
        }),
        usage: { input_tokens: 80, output_tokens: 40 }
      });
    }
    if (input.includes("Judge / Arbiter")) {
      return jsonResponse({
        output_text: JSON.stringify({
          verdictRisk: "Conditional Pass",
          groupAdmission: "ready",
          issues: [{ issueId: "issue_1", sourceFindingIds: ["measurement_finding_1"], severity: "P1", p0Category: null, question: "口径是什么？", evidenceRefs: ["missing_1"], severityReason: "metric risk", recommendedRevision: "define denominator" }],
          downgradedFindings: [],
          preservedDissent: []
        }),
        usage: { input_tokens: 120, output_tokens: 60 }
      });
    }
    if (input.includes("Final Composer")) {
      return jsonResponse({ output_text: "## Review Verdict\n结论：有条件通过", usage: { input_tokens: 150, output_tokens: 80 } });
    }
    return jsonResponse({ output_text: "unexpected" });
  };
}

async function writeTempPrd() {
  const dir = await mkdtemp(join(tmpdir(), "gdr-cli-"));
  const file = join(dir, "prd.md");
  await writeFile(file, "# PRD\nA sufficiently detailed PRD body with a CTR metric and AB experiment.", "utf8");
  return file;
}

test("CLI prints the two-axis verdict and NO artifacts by default", async () => {
  const file = await writeTempPrd();
  const res = await runCli({
    argv: ["--file", file, "--mode", "deep", "--depth", "p0"],
    env: { OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://api.openai.com/v1" },
    fetchImpl: mockFetch()
  });
  assert.equal(res.code, 0);
  assert.match(res.stdout, /## 组内准入/);
  assert.match(res.stdout, /## 模拟评审结果/);
  // artifacts (internal fields) must NOT leak into default output
  assert.doesNotMatch(res.stdout, /factLedger|judgeDecision|reviewerFindings|p0GateDecisions|sourceRef/);
});

test("CLI --json hides artifacts unless --artifacts is also passed", async () => {
  const file = await writeTempPrd();
  const env = { OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://api.openai.com/v1" };

  const plain = await runCli({ argv: ["--file", file, "--mode", "deep", "--depth", "p0", "--json"], env, fetchImpl: mockFetch() });
  const plainObj = JSON.parse(plain.stdout);
  assert.ok(plainObj.review && plainObj.usage);
  assert.equal(plainObj.artifacts, undefined);

  const withArt = await runCli({ argv: ["--file", file, "--mode", "deep", "--depth", "p0", "--json", "--artifacts"], env, fetchImpl: mockFetch() });
  const artObj = JSON.parse(withArt.stdout);
  assert.ok(artObj.artifacts && Array.isArray(artObj.artifacts.reviewerFindings));
});

test("CLI reads PRD from STDIN when --file is omitted", async () => {
  const res = await runCli({
    argv: ["--mode", "standard", "--depth", "p0"],
    env: { OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://api.openai.com/v1" },
    fetchImpl: mockFetch(),
    readStdin: async () => "# PRD\nA detailed PRD body for a stdin review with metrics."
  });
  assert.equal(res.code, 0);
  assert.match(res.stdout, /## 模拟评审结果/);
});

test("CLI exits non-zero with usage on no PRD and on missing key", async () => {
  const noPrd = await runCli({ argv: ["--mode", "standard"], env: { OPENAI_API_KEY: "k" }, fetchImpl: mockFetch(), readStdin: async () => "" });
  assert.equal(noPrd.code, 2);
  assert.match(noPrd.stderr, /No PRD content/);

  const file = await writeTempPrd();
  const noKey = await runCli({ argv: ["--file", file], env: {}, fetchImpl: mockFetch() });
  assert.equal(noKey.code, 2);
  assert.match(noKey.stderr, /OPENAI_API_KEY/);
});

test("parseArgs rejects invalid enum values", () => {
  assert.throws(() => parseArgs(["--mode", "nope"]), /Invalid --mode/);
  assert.throws(() => parseArgs(["--frobnicate"]), /Unknown argument/);
  const ok = parseArgs(["--file", "x.md", "--lang", "en", "--json"]);
  assert.equal(ok.lang, "en");
  assert.equal(ok.json, true);
});

test("resolveConfig defaults: bearer+OpenAI when no base url, query when a gateway base url is set", () => {
  const openai = resolveConfig({ OPENAI_API_KEY: "k" });
  assert.equal(openai.baseUrl, "https://api.openai.com/v1");
  assert.equal(openai.authStyle, "bearer");

  const gateway = resolveConfig({ OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://gw.example/api" });
  assert.equal(gateway.authStyle, "query");

  const forced = resolveConfig({ OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://gw.example/api", OPENAI_AUTH_STYLE: "bearer" });
  assert.equal(forced.authStyle, "bearer");
});
