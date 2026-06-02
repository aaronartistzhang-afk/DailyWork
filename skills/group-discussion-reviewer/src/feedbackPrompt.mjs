export function buildFeedbackContextPrompt(feedbackContext = null) {
  const items = Array.isArray(feedbackContext?.items) ? feedbackContext.items : [];
  if (!items.length) return "";

  const previousReview = truncateForPrompt(feedbackContext.previousReview || "", 12_000);
  const feedbackLines = items.map((item, index) => [
    `${index + 1}. feedbackId: ${item.feedbackId || "unknown"}`,
    `   target: ${item.target || "unknown"}`,
    `   feedbackType: ${item.feedbackType || "general"}`,
    `   tags: ${(item.tags || []).join(", ") || "none"}`,
    `   comment: ${truncateForPrompt(item.comment || "", 1_000)}`
  ].join("\n"));

  return `Regeneration with feedback:
- You are regenerating a review after user feedback on the previous output.
- Independently re-read the PRD evidence. Feedback can be correct, partially correct, or wrong.
- Important: do not comply by default. Accept feedback only when the PRD evidence supports it.
- For every feedback item, adjudicate it as exactly one of: accepted / rejected / partial, with a short reason.
- If feedback items conflict, call out the conflict in ## Feedback Decisions and prioritize PRD evidence over user preference.
- If feedback asks to make the review less strict but the PRD still has a true blocker, keep the blocker and explain why in ## Feedback Decisions.
- If feedback correctly identifies over-technical, non-product, or unsupported criticism, revise the review accordingly.

Previous review:
${previousReview || "(empty)"}

Feedback items:
${feedbackLines.join("\n")}`;
}

export function hasFeedbackContext(feedbackContext = null) {
  return Array.isArray(feedbackContext?.items) && feedbackContext.items.length > 0;
}

function truncateForPrompt(value, limit) {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
