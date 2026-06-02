const MODEL_PRICES = {
  "gpt-5-mini": {
    inputUsdPerMillion: 0.25,
    outputUsdPerMillion: 2
  },
  "gpt-4.1-mini": {
    inputUsdPerMillion: 0.4,
    outputUsdPerMillion: 1.6
  }
};

const FACT_LEDGER_OVERHEAD_CHARS = 5_000;
const FACT_LEDGER_CHUNK_CHARS = 80_000;
const REVIEW_MODE_REVIEWER_COUNTS = {
  standard: 4,
  deep: 7,
  challenge: 11
};

export function estimateReviewRequestCostUsd({ model, prdContent, outputDepth = "full", extraInputChars = 0 }) {
  const prices = getModelPrices(model);
  const sourceLength = prdContent?.length || 0;
  const estimatedInputTokens = Math.ceil((sourceLength + Math.max(0, Number(extraInputChars) || 0) + FACT_LEDGER_OVERHEAD_CHARS) / 4);
  const estimatedOutputTokens = outputDepth === "p0" ? 1_800 : 3_600;
  return calculateTokenCostUsd({
    prices,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens
  });
}

export function estimateMultiReviewerRequestCostUsd({
  model,
  prdContent,
  outputDepth = "full",
  reviewMode = "challenge",
  extraInputChars = 0
}) {
  const prices = getModelPrices(model);
  const sourceLength = prdContent?.length || 0;
  const chunkCount = Math.max(1, Math.ceil(sourceLength / FACT_LEDGER_CHUNK_CHARS));
  const reviewerCount = REVIEW_MODE_REVIEWER_COUNTS[reviewMode] || REVIEW_MODE_REVIEWER_COUNTS.challenge;
  const estimatedLedgerChars = Math.min(Math.max(Math.ceil(sourceLength * 0.08), 3_000), 45_000);
  const factLedgerInputChars = sourceLength + chunkCount * FACT_LEDGER_OVERHEAD_CHARS;
  const reviewerInputChars = reviewerCount * (estimatedLedgerChars + 3_500);
  const judgeInputChars = estimatedLedgerChars + reviewerCount * 2_500 + 4_000;
  const composerInputChars = 6_000;
  const estimatedInputTokens = Math.ceil((
    factLedgerInputChars +
    reviewerInputChars +
    judgeInputChars +
    composerInputChars +
    Math.max(0, Number(extraInputChars) || 0)
  ) / 4);
  const estimatedOutputTokens = (
    chunkCount * 2_400 +
    reviewerCount * 1_800 +
    2_600 +
    (outputDepth === "p0" ? 1_800 : 3_600)
  );

  return calculateTokenCostUsd({
    prices,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens
  });
}

export function calculateResponseCostUsd({ model, usage, fallbackCostUsd }) {
  const inputTokens = usage?.input_tokens ?? usage?.prompt_tokens;
  const outputTokens = usage?.output_tokens ?? usage?.completion_tokens;
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) {
    return fallbackCostUsd;
  }

  return calculateTokenCostUsd({
    prices: getModelPrices(model),
    inputTokens,
    outputTokens
  });
}

function calculateTokenCostUsd({ prices, inputTokens, outputTokens }) {
  return (
    (inputTokens / 1_000_000) * prices.inputUsdPerMillion +
    (outputTokens / 1_000_000) * prices.outputUsdPerMillion
  );
}

function getModelPrices(model) {
  return MODEL_PRICES[model] || MODEL_PRICES["gpt-5-mini"];
}
