import { buildFinalReviewPrompt, normalizeFinalReviewVerdict } from "./finalReviewComposer.mjs";
import { buildFactLedgerPrompt, parseFactLedgerResponse } from "./prdFactLedger.mjs";
import { chunkPrdContent, mergeFactLedgers } from "./prdChunking.mjs";
import { calculateResponseCostUsd, estimateMultiReviewerRequestCostUsd } from "./reviewCost.mjs";
import { P0_CATEGORIES } from "./reviewRubric.mjs";
import { buildJudgePrompt, parseJudgeResponse, validateJudgeDecision } from "./reviewJudge.mjs";
import { buildRoleReviewPrompt, parseRoleReviewResponse, selectReviewerRoles } from "./reviewerRoles.mjs";
import { detectScenarioSignals } from "./scenarioSignals.mjs";
import { callLlmGateway } from "./llmGatewayClient.mjs";

const FACT_LEDGER_CHUNK_CHAR_LIMIT = 80_000;

export async function runMultiReviewerPipeline({
  config,
  prdContent,
  outputDepth = "full",
  outputLanguage = "zh",
  reviewMode = "challenge",
  previousReview,
  feedbackItems = [],
  estimatedCostUsd,
  fetchImpl = fetch
} = {}) {
  const feedbackContext = feedbackItems.length ? {
    previousReview,
    items: feedbackItems
  } : null;
  const { factLedger, usage: factLedgerUsage } = await buildPipelineFactLedger({
    config,
    prdContent,
    outputLanguage,
    fetchImpl
  });
  const scenarioSignals = detectScenarioSignals(factLedger);
  const reviewerRoles = selectReviewerRoles({ reviewMode, scenarioSignals });

  const roleResults = await mapWithConcurrency(reviewerRoles, 3, async (role) => {
    const prompt = buildRoleReviewPrompt({
      role,
      factLedger,
      scenarioSignals,
      reviewMode,
      outputLanguage
    });
    try {
      const result = await callAndParseStructuredJson({
        config,
        input: prompt,
        parse: parseRoleReviewResponse,
        maxOutputTokens: 4200,
        retryMaxOutputTokens: 5200,
        retryInstruction: "Hard limits: findings max 2; each text field under 140 characters; include only the highest approval-risk findings.",
        fetchImpl
      });
      return {
        role,
        parsed: result.parsed,
        usage: result.usage
      };
    } catch (error) {
      throw withPhaseContext(error, { phase: "reviewer", reviewerId: role.id });
    }
  });

  const reviewerFindings = roleResults.flatMap(({ parsed }) => parsed.findings || []);
  let judgeUsage;
  let judgeDecision;
  try {
    const judgeResult = await callAndParseStructuredJson({
      config,
      input: buildJudgePrompt({
        reviewerFindings,
        factLedger,
        rubric: P0_CATEGORIES,
        outputLanguage,
        feedbackContext
      }),
      parse: parseJudgeResponse,
      maxOutputTokens: 5200,
      retryMaxOutputTokens: 7000,
      retryInstruction: "Hard limits: issues max 6; downgradedFindings max 6; preservedDissent max 2; each text field under 140 characters. Prefer dropping low-value items over long output.",
      fetchImpl
    });
    judgeUsage = judgeResult.usage;
    judgeDecision = validateJudgeDecision({
      judgeDecision: judgeResult.parsed,
      reviewerFindings,
      factLedger
    });
  } catch (error) {
    throw withPhaseContext(error, { phase: "judge" });
  }

  const finalPayload = await callResponsesApi({
    config,
    input: buildFinalReviewPrompt({
      judgeDecision,
      outputDepth,
      outputLanguage,
      feedbackContext
    }),
    maxOutputTokens: outputDepth === "p0" ? 1800 : 3600,
    fetchImpl
  }).catch((error) => {
    throw withPhaseContext(error, { phase: "final_composer" });
  });
  const composedReview = extractOutputText(finalPayload);
  if (!composedReview) {
    throw Object.assign(new Error("OpenAI response did not contain review text"), { statusCode: 502, payload: finalPayload });
  }
  const review = normalizeFinalReviewVerdict(composedReview, {
    judgeDecision,
    outputLanguage
  });

  const usage = sumUsage([
    factLedgerUsage,
    ...roleResults.map((result) => result.usage),
    judgeUsage,
    finalPayload.usage
  ]);

  return {
    review,
    usage,
    costUsd: calculateResponseCostUsd({
      model: config.model,
      usage,
      fallbackCostUsd: estimatedCostUsd ?? estimateMultiReviewerRequestCostUsd({
        model: config.model,
        prdContent,
        outputDepth,
        reviewMode,
        extraInputChars: 8_000
      })
    }),
    artifacts: {
      factLedger,
      scenarioSignals,
      reviewerRoles: reviewerRoles.map((role) => role.id),
      reviewerFindings,
      judgeDecision,
      p0GateDecisions: judgeDecision.p0GateDecisions || []
    }
  };
}

async function buildPipelineFactLedger({
  config,
  prdContent,
  outputLanguage,
  fetchImpl
}) {
  const chunks = chunkPrdContent(String(prdContent || "").trim(), FACT_LEDGER_CHUNK_CHAR_LIMIT);
  const ledgers = await mapWithConcurrency(chunks, 2, async (chunk) => {
    try {
      const result = await callAndParseStructuredJson({
        config,
        input: buildFactLedgerPrompt({
          prdContent: chunk.text,
          outputLanguage,
          chunkMeta: {
            chunkId: chunk.chunkId,
            startChar: chunk.startChar,
            endChar: chunk.endChar
          }
        }),
        parse: parseFactLedgerResponse,
        maxOutputTokens: 8000,
        retryMaxOutputTokens: 9000,
        retryInstruction: "Hard limits: facts max 8; missingFacts max 6; each claim under 140 characters. Preserve only decision-critical facts.",
        fetchImpl
      });
      return {
        ledger: result.parsed,
        usage: result.usage
      };
    } catch (error) {
      throw withPhaseContext(error, { phase: "fact_ledger", chunkId: chunk.chunkId });
    }
  });

  return {
    factLedger: mergeFactLedgers(ledgers.map((item) => item.ledger)),
    usage: sumUsage(ledgers.map((item) => item.usage))
  };
}

async function callAndParseStructuredJson({
  config,
  input,
  parse,
  maxOutputTokens,
  retryMaxOutputTokens = maxOutputTokens,
  retryInstruction = "",
  fetchImpl
}) {
  const attempts = [];
  const firstPayload = await callResponsesApi({
    config,
    input,
    maxOutputTokens,
    jsonMode: true,
    fetchImpl
  });
  attempts.push(firstPayload);
  try {
    return {
      payload: firstPayload,
      parsed: parse(extractOutputText(firstPayload)),
      usage: sumUsage(attempts.map((payload) => payload.usage))
    };
  } catch (firstError) {
    const retryPayload = await callResponsesApi({
      config,
      input: appendStructuredRetryInstruction(input, retryInstruction),
      maxOutputTokens: retryMaxOutputTokens,
      jsonMode: true,
      fetchImpl
    });
    attempts.push(retryPayload);
    try {
      return {
        payload: retryPayload,
        parsed: parse(extractOutputText(retryPayload)),
        usage: sumUsage(attempts.map((payload) => payload.usage))
      };
    } catch (retryError) {
      retryError.cause = firstError;
      throw retryError;
    }
  }
}

function appendStructuredRetryInstruction(input, retryInstruction) {
  return `${input}

[Structured JSON retry]
Previous structured output was invalid or incomplete. Return exactly one complete JSON object only.
Do not include markdown, comments, explanation, or trailing text.
${retryInstruction}`;
}

async function callResponsesApi({
  config,
  input,
  maxOutputTokens,
  jsonMode = false,
  fetchImpl
}) {
  return callLlmGateway({ config, input, maxOutputTokens, jsonMode, fetchImpl });
}

function sumUsage(usages = []) {
  const usageItems = usages.filter(Boolean);
  if (!usageItems.length) return null;
  return usageItems.reduce((sum, usage) => ({
    input_tokens: (sum.input_tokens || 0) + (usage.input_tokens || 0),
    output_tokens: (sum.output_tokens || 0) + (usage.output_tokens || 0),
    total_tokens: (sum.total_tokens || 0) + (usage.total_tokens || 0)
  }), {});
}

function extractOutputText(payload) {
  if (payload.output_text) return payload.output_text;
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

function withPhaseContext(error, context = {}) {
  const contextText = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  const wrapped = new Error(`[${contextText}] ${error.message}`);
  wrapped.statusCode = error.statusCode;
  wrapped.payload = error.payload;
  wrapped.cause = error;
  return wrapped;
}
