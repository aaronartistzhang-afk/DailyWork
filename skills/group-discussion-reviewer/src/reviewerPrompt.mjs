import { PRODUCT_REVIEW_CALIBRATION_PROMPT } from "./productReviewCalibration.mjs";

const TYPE_HINTS = {
  auto: "Pick the angle that matches the PRD's main proposal.",
  workflow: "Focus on who acts, where they confirm, what state changes, and where handoff breaks.",
  experiment: "Focus on what is being compared, who is in the test, what counts as a win, and what could confound the result. Avoid pipeline-level jargon.",
  data: "Focus on whether the metric reflects the business goal, whether stakeholders can interpret it consistently, and whether the baseline is real. Leave pipeline details to data engineering.",
  gtm: "Start with opened population, segmented baseline, absolute lift, penetration lift, and spike versus retained habit.",
  placement: "Focus on the current rule, what changes, who gets in, and what could go wrong for users outside the change.",
  ai: "Focus on where the human still decides, what the model can and cannot do, how mistakes surface, and who owns review.",
  growth: "Focus on target population, baseline, desired behavior, and whether the reward maps to that behavior.",
  incentive: "Focus on task fairness, reward odds, user experience, and whether the same score requires comparable effort within comparable cohorts.",
  monitoring: "Focus on protected population, whitelist/allowlist boundary, inspection and removal rules, alert tiers, alert volume, and whether this belongs in campaign or account-support navigation."
};

const REVIEW_MODE_INSTRUCTIONS = {
  standard: {
    label: "Standard Review",
    instruction: [
      "Standard Review: act like a typical product group review, not a tech or data audit.",
      "Pass the PRD if the proposal is understandable, has a plausible execution path, and the team can tell whether it worked after launch.",
      "Only raise P0 when something would block safe launch, make success unmeasurable, aim at the wrong problem, or make delivery non-viable.",
      "Do not flag undefined engineering details as issues at this level.",
      "P0 has no quota. Typical output is 0 P0; use at most 1 hard blocker unless the PRD has multiple independent approval blockers."
    ].join("\n")
  },
  deep: {
    label: "Deep Review",
    instruction: [
      "Deep Review: systematically check business goal, user/operator journey, metric definition, ownership/handoff, and rollout plan.",
      "Still a product review: speak in product language, not data-engineering or release-engineering language.",
      "P0 only when the PRD's core logic, measurability, launch safety, or delivery viability actually breaks. Missing-but-easy-to-add details are P1, not P0.",
      "Cover completeness via P1/P2 instead of inflating P0.",
      "P0 has no quota. Use a maximum of 2 P0 hard blockers, and zero P0 is valid for a coherent PRD."
    ].join("\n")
  },
  challenge: {
    label: "Challenge Review",
    instruction: [
      "Challenge Review: stress-test the direction itself, not the paperwork.",
      "Ask whether this is the right problem, the right population, the right time, and whether the expected outcome is worth the cost.",
      "Push back on assumptions about user demand, market timing, business value, and opportunity cost, not on whether every field is filled in.",
      "P0 is reserved for wrong target, unverifiable success, unsafe launch, or non-viable delivery. Unclear ownership, vague metric, or missing fallback default to P1 unless they directly cause one of the four.",
      "Be direct and adversarial about the proposal, not nitpicky about the document.",
      "P0 has no quota. Challenge mode may surface sharper candidate blockers, but only proven hard blockers should remain P0."
    ].join("\n")
  }
};

export function buildReviewerPrompt({
  prdContent,
  prdType = "auto",
  outputDepth = "full",
  outputLanguage = "zh",
  reviewMode = "challenge",
  feedbackContext = null
}) {
  const typeHint = TYPE_HINTS[prdType] || TYPE_HINTS.auto;
  const mode = REVIEW_MODE_INSTRUCTIONS[reviewMode] || REVIEW_MODE_INSTRUCTIONS.challenge;
  const isEnglish = outputLanguage === "en";
  const hasFeedback = Boolean(feedbackContext?.items?.length);
  const feedbackInstruction = buildFeedbackInstruction(feedbackContext);
  const feedbackOutputSection = hasFeedback
    ? `## Feedback Decisions
For each feedback item, write:
- feedbackId: accepted / rejected / partial - one short reason.
Do this before changing the review.`
    : "";
  const depthInstruction = outputDepth === "p0"
    ? "Output Review Verdict and P0 Blockers only. Follow the review mode's P0 threshold. Zero P0 is valid when there are no true blockers."
    : "Output Review Verdict, P0 Blockers, P1 Questions, P2 Questions, and P1/P2 Improvement Suggestions. Follow the review mode's P0 threshold. Do not inflate P0 to fill a quota.";
  const languageInstruction = isEnglish
    ? "Output language: English. Keep the section headings exactly as specified in Output format."
    : "Output language: Simplified Chinese. Keep the section headings exactly as specified in Output format; write all questions and suggestions in Chinese.";
  const outputFormat = isEnglish
    ? `${feedbackOutputSection ? `${feedbackOutputSection}\n\n` : ""}## Review Verdict
Verdict: Clearly judge whether the PRD can pass the group review. Choose exactly one: "Pass", "Conditional Pass", or "Do Not Pass".
Rationale: Explain in 1-3 sentences, based only on the PRD body.

## P0 Blockers
For each P0 blocker, use:
### P0-N: ...
Question:
Why this is a blocker: explain which of safe launch, measurable success, right problem/population, or delivery viability it breaks.
Suggested revision:
If there is no true P0, write "No P0 blockers."

${depthInstruction}

## P1 Questions
Follow-up questions after the first round is answered.

## P2 Questions
Optional deeper questions on rollout, edge cases, or long-term governance.

## P1/P2 Improvement Suggestions
Group all non-blocking improvement suggestions here. Do not mix them into P1/P2 question sections.`
    : `${feedbackOutputSection ? `${feedbackOutputSection}\n\n` : ""}## Review Verdict
结论：明确判断是否可以通过组内评审，只能选择「可以通过」「有条件通过」「不建议通过」之一。
原因：用 1-3 句话解释，必须基于 PRD 主体内容。

## P0 Blockers
每个 P0 blocker 使用：
### P0-N: ...
问题：
为什么是 blocker：说明它属于「安全上线 / 可衡量成败 / 目标问题或人群正确性 / 交付可行性」中的哪一类失败。
修改建议：
如无 P0，明确写"无 P0"。

${depthInstruction}

## P1 Questions
第一轮 P0 被回答后需要继续追问的问题。

## P2 Questions
关于 rollout、边界 case、长期治理的可选深入问题。

## P1/P2 Improvement Suggestions
把所有非 blocker 的优化建议集中放在这里，不要混入 P1/P2 question section。`;

  return `You are a senior product review simulator for product, GTM, and campaign-style PRDs.

Your job is to ask the questions a sharp group-discussion reviewer is most likely to ask in a real PRD review.

Mode:
- Blind Review by default.
- Use only the PRD main body below and the explicit options in this request.
- Do not use comments, resolved discussions, reviewer annotations, historical replies, or post-meeting explanations.
- Ask questions only. Do not answer the questions. Do not give solutions unless phrased as review questions.
- Exception: every P0 blocker must include a concise modification suggestion. P1/P2 suggestions must be grouped only in the final P1/P2 Improvement Suggestions section.
- Keep questions meeting-like, direct, and concrete.

Review principles:
- This is a product PRD review, not a code review, data pipeline review, or release engineering review. Speak in product language.
- First understand what is actually being proposed and why, before checking how it is written.
- Judge P0 against four approval-critical failures only: can it launch safely, can success be measured, is it aimed at the right problem/population, and is delivery viable.
- For metrics, ask whether the definition is unambiguous to the people who will use it and whether it maps to the business goal. Do not demand pipeline-level specs.
- Treat sample size, significance level, p-value, statistical power, and MDE as P1 statistical follow-ups unless the PRD is explicitly using a formal experiment result as the launch, ramp, or replacement decision gate.
- For workflows, walk the operator/user path once and flag only the steps where the chain actually breaks, not every undefined edge case.
- For experiments, ask what is compared, who is included, and what counts as a real win. Only raise attribution or confounding concerns when there is a concrete reason.
- For ranking, placement, or AI capability changes, ask what the user-visible change is and what could go wrong for users not in the change.
- For growth/GTM, separate one-off lift from retained behavior, and ask whether the target population is realistic.
- For growth/GTM, check whether the benchmark is comparable, the baseline is stable enough, and the PRD can separate campaign-driven growth from natural movement.
- For task/reward mechanics, treat fairness as a user-facing rule: the same score should require comparable effort within comparable cohorts. Also test win probability, repeated-loss experience, and cost control.
- For monitoring/protection tools, ask for protected population, whitelist/allowlist boundary, inspection/removal rules, alert tiers, and which alerts are must-answer and which should be merged.
- For long-lived user-visible labels or standards, ask whether downstream design, C-end, and foundation teams are aligned before B-end configuration becomes a standard.
- For navigation or entry placement, ask whether the module placement matches operator mental model; avoid P0 unless discovery or ownership blocks launch.
- Treat "not yet specified" as P1 unless its absence makes the PRD unlaunchable, unmeasurable, directionally wrong, or not viable to deliver.
- Prefer fewer, sharper issues over a long checklist. A clean PRD with 0 P0 is a valid review outcome.
- Do not flag the following as issues unless they actually cause a launch/measurement/direction/delivery viability failure: implementation versioning, pipeline update cadence, historical data repair plans, assignment-bucket naming, safety metric specifics, document structure, naming conventions, or future extensibility.

${PRODUCT_REVIEW_CALIBRATION_PROMPT}

${feedbackInstruction}

PRD type hint:
${typeHint}

Review mode:
${mode.instruction}

Language:
${languageInstruction}

Output format:
${outputFormat}

PRD:
${prdContent}`;
}

function buildFeedbackInstruction(feedbackContext) {
  const items = Array.isArray(feedbackContext?.items) ? feedbackContext.items : [];
  if (!items.length) return "";

  const previousReview = truncateForPrompt(feedbackContext.previousReview || "", 12_000);
  const feedbackLines = items.map((item, index) => {
    const tags = Array.isArray(item.tags) && item.tags.length ? item.tags.join(", ") : "none";
    return [
      `${index + 1}. feedbackId: ${item.feedbackId || "unknown"}`,
      `   target: ${item.target || "overall"}`,
      `   anchor: ${formatAnchor(item.anchor)}`,
      `   feedbackType: ${item.feedbackType || "general"}`,
      `   tags: ${tags}`,
      `   comment: ${truncateForPrompt(item.comment || "", 1_000)}`
    ].join("\n");
  }).join("\n");

  return `Regeneration with feedback:
- You are regenerating a review after user feedback on the previous output.
- Independently re-read the PRD. Feedback can be correct, partially correct, or wrong.
- Important: do not comply by default. Accept feedback only when the PRD evidence supports it.
- For every feedback item, adjudicate it as exactly one of: accepted / rejected / partial, with a short reason.
- If feedback items conflict, call out the conflict in ## Feedback Decisions and prioritize PRD evidence over user preference.
- If feedback asks to make the review less strict but the PRD still has a true blocker, keep the blocker and explain why in ## Feedback Decisions.
- If feedback correctly identifies over-technical, non-product, or unsupported criticism, revise the review accordingly.
- Keep the final review blind: do not mention comments, hidden context, or anything outside the PRD and feedback below.

Previous review for reference only:
${previousReview || "(empty)"}

Feedback items:
${feedbackLines}`;
}

function formatAnchor(anchor = {}) {
  if (!anchor || typeof anchor !== "object") return "none";
  const revision = anchor.reviewRevisionId || "unknown";
  const section = anchor.sectionKind || "overall";
  const type = anchor.anchorType || "section";
  const item = anchor.itemLabel || (Number.isInteger(anchor.itemIndex) ? String(anchor.itemIndex) : "-");
  const hash = anchor.contentHash || "none";
  return `revision=${revision} section=${section} type=${type} item=${item} hash=${hash}`;
}

function truncateForPrompt(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[TRUNCATED]`;
}
