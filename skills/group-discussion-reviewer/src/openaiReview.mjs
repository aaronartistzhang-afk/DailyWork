import { buildReviewerPrompt } from "./reviewerPrompt.mjs";
import { buildFactLedgerPrompt, parseFactLedgerResponse, serializeFactLedgerForReview } from "./prdFactLedger.mjs";
import { chunkPrdContent, mergeFactLedgers } from "./prdChunking.mjs";
import { detectScenarioSignals } from "./scenarioSignals.mjs";
import { calculateResponseCostUsd, estimateReviewRequestCostUsd } from "./reviewCost.mjs";
import { runMultiReviewerPipeline } from "./multiReviewerPipeline.mjs";
import { shouldUseMultiReviewerPipeline } from "./reviewPipelineMode.mjs";
import { callLlmGateway } from "./llmGatewayClient.mjs";

const DIRECT_PRD_CHAR_LIMIT = 120_000;
const FACT_LEDGER_CHUNK_CHAR_LIMIT = 80_000;

export async function generateReview({
  config,
  prdContent,
  prdType,
  outputDepth,
  outputLanguage,
  reviewMode,
  previousReview,
  feedbackItems = [],
  estimatedCostUsd,
  fetchImpl = fetch
}) {
  if (!prdContent || prdContent.trim().length < 20) {
    throw Object.assign(new Error("PRD content is too short to review"), { statusCode: 400 });
  }

  if (shouldUseMultiReviewerPipeline({ config, reviewMode })) {
    return runMultiReviewerPipeline({
      config,
      prdContent,
      outputDepth,
      outputLanguage,
      reviewMode,
      previousReview,
      feedbackItems,
      estimatedCostUsd,
      fetchImpl
    });
  }

  const { factLedger, usage: factLedgerUsage } = await buildPrdFactLedger({
    config,
    prdContent,
    outputLanguage,
    fetchImpl
  });
  const scenarioSignals = detectScenarioSignals(factLedger);
  const preparedPrd = preparePrdForReview(prdContent);
  const reviewInput = [
    serializeFactLedgerForReview(factLedger),
    "",
    "[SCENARIO SIGNALS]",
    JSON.stringify(scenarioSignals, null, 2)
  ].join("\n");
  const prompt = buildReviewerPrompt({
    prdContent: reviewInput,
    prdType,
    outputDepth,
    outputLanguage,
    reviewMode,
    feedbackContext: feedbackItems.length ? {
      previousReview,
      items: feedbackItems
    } : null
  });
  const payload = await callResponsesApi({
    config,
    input: prompt,
    maxOutputTokens: outputDepth === "p0" ? 1800 : 3600,
    fetchImpl
  });

  const output = extractOutputText(payload);
  if (!output) {
    throw Object.assign(new Error("OpenAI response did not contain review text"), { statusCode: 502, payload });
  }

  const fallbackCostUsd = estimatedCostUsd ?? estimateReviewRequestCostUsd({
    model: config.model,
      prdContent: preparedPrd.content || prdContent,
      outputDepth,
      extraInputChars: estimateFeedbackContextChars({ previousReview, feedbackItems })
    });
  const combinedUsage = sumUsage([factLedgerUsage, payload.usage]);

  return {
    review: output,
    usage: combinedUsage,
    costUsd: calculateResponseCostUsd({
      model: config.model,
      usage: combinedUsage,
      fallbackCostUsd
    })
  };
}

function estimateFeedbackContextChars({ previousReview, feedbackItems = [] }) {
  if (!feedbackItems.length) return 0;
  return String(previousReview || "").length + JSON.stringify(feedbackItems).length + 2_000;
}

export function preparePrdForReview(prdContent) {
  const source = String(prdContent || "").trim();
  const chunks = chunkPrdContent(source, FACT_LEDGER_CHUNK_CHAR_LIMIT);
  if (source.length <= DIRECT_PRD_CHAR_LIMIT) {
    return {
      content: source,
      condensed: false,
      chunked: false,
      originalLength: source.length,
      reviewLength: source.length,
      chunks
    };
  }

  return {
    content: source,
    condensed: false,
    chunked: true,
    originalLength: source.length,
    reviewLength: source.length,
    chunks
  };
}

async function buildPrdFactLedger({
  config,
  prdContent,
  outputLanguage,
  fetchImpl
}) {
  const prepared = preparePrdForReview(prdContent);
  const ledgers = await Promise.all(prepared.chunks.map(async (chunk) => {
    const prompt = buildFactLedgerPrompt({
      prdContent: chunk.text,
      outputLanguage,
      chunkMeta: {
        chunkId: chunk.chunkId,
        startChar: chunk.startChar,
        endChar: chunk.endChar
      }
    });
    const result = await callAndParseStructuredJson({
      config,
      input: prompt,
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
  }));

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

export function extractOutputText(payload) {
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
