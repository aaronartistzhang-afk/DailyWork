import { CONDITIONAL_REVIEWER_ROLES, CORE_REVIEWER_ROLES } from "./reviewRubric.mjs";
import {
  PRODUCT_GTM_READINESS_CALIBRATION_PROMPT,
  PRODUCT_REVIEW_CALIBRATION_PROMPT
} from "./productReviewCalibration.mjs";

const SIGNAL_ROLE_MAP = {
  experiment: "experiment_design",
  incentive: "incentive_economy",
  ai_capability: "ai_quality_human_control",
  data_product: "data_product",
  localization: "localization",
  technical_feasibility: "technical_feasibility",
  delivery_viability: "technical_feasibility",
  dependency: "technical_feasibility"
};

export const CONTRARIAN_REVIEWER_ROLE = {
  id: "contrarian_product_review",
  label: "Contrarian Product Review",
  focus: "challenge hidden assumptions, approval shortcuts, and optimistic interpretations",
  nonGoal: "creating speculative blockers without evidence from the Fact Ledger"
};

export function selectReviewerRoles({
  reviewMode = "challenge",
  scenarioSignals = []
} = {}) {
  const roles = new Map();
  for (const role of Object.values(CORE_REVIEWER_ROLES)) {
    roles.set(role.id, role);
  }

  const normalizedMode = normalizeReviewMode(reviewMode);
  if (normalizedMode !== "standard") {
    for (const signal of scenarioSignals || []) {
      const roleId = SIGNAL_ROLE_MAP[signal.signalId];
      if (!roleId) continue;
      if (!shouldIncludeConditionalRole(normalizedMode, signal.confidence)) continue;
      const role = CONDITIONAL_REVIEWER_ROLES[roleId];
      if (role) roles.set(role.id, role);
    }
  }

  if (normalizedMode === "challenge") {
    roles.set(CONTRARIAN_REVIEWER_ROLE.id, CONTRARIAN_REVIEWER_ROLE);
  }

  return [...roles.values()];
}

export function buildRoleReviewPrompt({
  role,
  factLedger,
  scenarioSignals = [],
  reviewMode = "challenge",
  outputLanguage = "zh"
} = {}) {
  const language = outputLanguage === "en" ? "English" : "Simplified Chinese";
  const roleId = role?.id || "unknown_reviewer";

  return `# Independent Reviewer Pass

Reviewer role ID: ${roleId}
Reviewer role label: ${role?.label || roleId}
Review mode: ${reviewMode}
Output language: ${language}

Focus:
${role?.focus || ""}

Non-goal:
${role?.nonGoal || ""}

Rules:
- Do not use other reviewers' outputs. You are seeing only the extracted fact ledger and scenario signals.
- Ground every finding in at least one evidence reference: fact_id, missing_fact_id, or context_fact_id.
- At most 3 findings. Prioritize approval-critical product risks over secondary observations.
- Keep each field concise so the whole response remains valid, complete JSON.
- A P0 is allowed only when the issue blocks approval, safe launch, measurable success, right problem/population, or delivery viability.
- Do not raise technical implementation details unless they create a product approval risk.
- Return valid JSON only. Do not wrap JSON in markdown.

${PRODUCT_REVIEW_CALIBRATION_PROMPT}

${PRODUCT_GTM_READINESS_CALIBRATION_PROMPT}

Schema:
{
  "reviewerId": "${roleId}",
  "findings": [
    {
      "findingId": "finding_1",
      "question": "Question to ask in review.",
      "severityProposed": "P0 | P1 | P2",
      "p0Category": "direction_failure | measurement_failure | launch_safety_failure | delivery_viability_failure | null",
      "evidenceRefs": ["fact_id", "missing_fact_id", "context_fact_id"],
      "impactReason": "Why this matters for product approval.",
      "recommendedRevision": "Concrete PRD change if this is P0, or useful improvement if P1/P2."
    }
  ]
}

[SCENARIO SIGNALS]
${JSON.stringify(scenarioSignals || [], null, 2)}

[PRD FACT LEDGER]
${JSON.stringify(factLedger || {}, null, 2)}`;
}

export function parseRoleReviewResponse(payloadText) {
  const parsed = parseJsonPayload(payloadText, "Role reviewer response");
  const reviewerId = safeText(parsed.reviewerId || parsed.reviewer_id, 100) || "unknown_reviewer";
  return {
    reviewerId,
    findings: Array.isArray(parsed.findings)
      ? parsed.findings.map((finding, index) => normalizeFinding(finding, reviewerId, index))
      : []
  };
}

function shouldIncludeConditionalRole(reviewMode, confidence) {
  if (reviewMode === "deep") return confidence === "high";
  if (reviewMode === "challenge") return confidence === "high" || confidence === "medium";
  return false;
}

function normalizeReviewMode(reviewMode) {
  return ["standard", "deep", "challenge"].includes(reviewMode) ? reviewMode : "challenge";
}

function normalizeFinding(finding = {}, reviewerId, index) {
  return {
    findingId: safeText(finding.findingId || finding.finding_id, 120) || `${reviewerId}_finding_${index + 1}`,
    reviewerId,
    question: safeText(finding.question, 2_000) || "",
    severityProposed: normalizeEnum(finding.severityProposed || finding.severity_proposed, ["P0", "P1", "P2"], "P1"),
    p0Category: safeText(finding.p0Category || finding.p0_category, 120),
    evidenceRefs: normalizeStringArray(finding.evidenceRefs || finding.evidence_refs),
    impactReason: safeText(finding.impactReason || finding.impact_reason, 2_000) || "",
    recommendedRevision: safeText(finding.recommendedRevision || finding.recommended_revision, 2_000) || ""
  };
}

function parseJsonPayload(payloadText, label) {
  const source = stripJsonFence(payloadText);
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} was not valid JSON: ${error.message}`);
  }
}

function stripJsonFence(text) {
  const source = String(text || "").trim();
  const match = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : source;
}

function normalizeEnum(value, allowed, fallback) {
  const text = safeText(value, 40);
  return allowed.includes(text) ? text : fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, 200)).filter(Boolean);
}

function safeText(value, limit) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, limit);
}
