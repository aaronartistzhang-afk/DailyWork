const MULTI_REVIEWER_DEFAULT_MODES = new Set(["standard", "deep", "challenge"]);

export function shouldUseMultiReviewerPipeline({ config = {}, reviewMode = "challenge" } = {}) {
  if (config?.multiReviewerPipelineEnabled) return true;
  return MULTI_REVIEWER_DEFAULT_MODES.has(normalizeReviewMode(reviewMode));
}

function normalizeReviewMode(reviewMode) {
  return String(reviewMode || "challenge").trim().toLowerCase();
}
