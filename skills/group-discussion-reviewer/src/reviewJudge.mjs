import { P0_CATEGORIES } from "./reviewRubric.mjs";
import { buildFeedbackContextPrompt } from "./feedbackPrompt.mjs";
import { applyP0Gatekeeper } from "./p0Gatekeeper.mjs";
import {
  PRODUCT_GTM_READINESS_CALIBRATION_PROMPT,
  PRODUCT_REVIEW_CALIBRATION_PROMPT,
  calibrateIssueSeverity
} from "./productReviewCalibration.mjs";

export function buildJudgePrompt({
  reviewerFindings = [],
  factLedger = {},
  rubric = P0_CATEGORIES,
  outputLanguage = "zh",
  feedbackContext = null
} = {}) {
  const language = outputLanguage === "en" ? "English" : "Simplified Chinese";
  const feedbackInstruction = buildFeedbackContextPrompt(feedbackContext);

  return `# Judge / Arbiter

Output language: ${language}

Your job is to merge independent reviewer findings into one product review decision.

Rules:
- You must not create new findings.
- Every issue must cite sourceFindingIds from the reviewer findings.
- At most 8 issues total. Prefer fewer merged, approval-critical issues over exhaustive coverage.
- downgradedFindings max 8, and only include excluded or downgraded P0 proposals.
- preservedDissent max 3.
- Keep question, severityReason, and recommendedRevision concise, each under 180 characters.
- Upgrade to P0 only when the issue blocks approval, safe launch, measurable success, right problem/population, or delivery viability.
- Downgrade role-specific or technical-only findings when they do not affect product approval.
- P0 burden of proof: treat reviewer-proposed P0s as candidate P0 until they prove blockedOutcome, affectedPath, direct evidence, and why a Conditional Pass is impossible.
- For every P0, fill blockedOutcome, affectedPath, bridgeEvidenceRefs, and whyReviewCannotPass. Technical or statistical audit details cannot be P0 without a concrete product decision bridge.
- Preserve meaningful disagreement in preservedDissent instead of forcing false consensus.
- Separately assess 组内准入 (group admission / meeting readiness): whether the PRD has enough concrete context — a clear objective, a defined scope, and at least one measurable success or acceptance signal — for a meaningful group discussion. This is independent of verdictRisk. Set groupAdmission to "needs pre-review fix" ONLY when the PRD lacks such core concrete context; otherwise "ready". A PRD can be admitted ("ready") and still be Blocked.
- Return valid JSON only. Do not wrap JSON in markdown.

${PRODUCT_REVIEW_CALIBRATION_PROMPT}

${PRODUCT_GTM_READINESS_CALIBRATION_PROMPT}

${feedbackInstruction}

Schema:
{
  "verdictRisk": "Pass | Conditional Pass | Blocked",
  "groupAdmission": "ready | needs pre-review fix",
  "issues": [
    {
      "issueId": "issue_1",
      "sourceFindingIds": ["source_finding_id"],
      "severity": "P0 | P1 | P2",
      "p0Category": "direction_failure | measurement_failure | launch_safety_failure | delivery_viability_failure | null",
      "question": "Merged review question.",
      "evidenceRefs": ["fact_id", "missing_fact_id", "context_fact_id"],
      "severityReason": "Why this severity is justified.",
      "recommendedRevision": "Concrete PRD revision suggestion.",
      "blockedOutcome": "For P0 only: what approval-critical outcome is blocked.",
      "affectedPath": "For P0 only: affected user/operator/business path.",
      "bridgeEvidenceRefs": ["For P0 only: evidence refs proving the product bridge."],
      "whyReviewCannotPass": "For P0 only: why group review cannot pass without fixing it."
    }
  ],
  "downgradedFindings": [
    {
      "findingId": "source_finding_id",
      "reason": "Why the severity was lowered or excluded."
    }
  ],
  "preservedDissent": [
    {
      "sourceFindingIds": ["source_finding_id"],
      "reason": "Why dissent is preserved."
    }
  ]
}

[P0 RUBRIC]
${JSON.stringify(rubric, null, 2)}

[EXTRACTED FACT LEDGER]
${JSON.stringify(factLedger || {}, null, 2)}

[INDEPENDENT REVIEWER FINDINGS]
${JSON.stringify(reviewerFindings || [], null, 2)}`;
}

export function parseJudgeResponse(payloadText) {
  const parsed = parseJsonPayload(payloadText);
  return {
    verdictRisk: safeText(parsed.verdictRisk || parsed.verdict_risk, 80) || "Conditional Pass",
    admissionRisk: normalizeAdmission(parsed.groupAdmission ?? parsed.group_admission ?? parsed.admissionRisk ?? parsed.reviewabilityRisk),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(normalizeIssue) : [],
    downgradedFindings: Array.isArray(parsed.downgradedFindings || parsed.downgraded_findings)
      ? (parsed.downgradedFindings || parsed.downgraded_findings).map(normalizeDowngradedFinding)
      : [],
    preservedDissent: Array.isArray(parsed.preservedDissent || parsed.preserved_dissent)
      ? (parsed.preservedDissent || parsed.preserved_dissent).map(normalizeDissent)
      : []
  };
}

export function validateJudgeDecision({
  judgeDecision = {},
  reviewerFindings = [],
  factLedger = {}
} = {}) {
  const sourceFindingIds = new Set((reviewerFindings || []).map((finding) => finding.findingId).filter(Boolean));
  const validEvidenceRefs = new Set([
    ...(factLedger.facts || []).map((fact) => fact.factId),
    ...(factLedger.missingFacts || []).map((fact) => fact.missingFactId)
  ].filter(Boolean));
  const downgradedFindings = [...(judgeDecision.downgradedFindings || [])];
  const issues = [];

  for (const issue of judgeDecision.issues || []) {
    const validSourceFindingIds = (issue.sourceFindingIds || []).filter((findingId) => sourceFindingIds.has(findingId));
    if (!validSourceFindingIds.length) {
      downgradedFindings.push({
        findingId: (issue.sourceFindingIds || [])[0] || issue.issueId || "",
        reason: "Dropped because the Judge issue did not cite a valid source finding."
      });
      continue;
    }

    let normalizedIssue = {
      ...issue,
      sourceFindingIds: validSourceFindingIds
    };
    if (normalizedIssue.severity === "P0" && !isSupportedP0Issue(normalizedIssue, validEvidenceRefs)) {
      normalizedIssue.severity = "P1";
      normalizedIssue.p0Category = null;
      downgradedFindings.push({
        findingId: validSourceFindingIds[0],
        reason: "Downgraded because the P0 lacked a valid category, evidence reference, or concrete PRD revision."
      });
    }
    if (!shouldDeferP0CalibrationToEvidenceGate(normalizedIssue, factLedger)) {
      const calibratedIssue = calibrateIssueSeverity(normalizedIssue);
      if (calibratedIssue !== normalizedIssue) {
        downgradedFindings.push({
          findingId: validSourceFindingIds[0],
          reason: calibratedIssue.calibrationReason
        });
        normalizedIssue = calibratedIssue;
      }
    }
    issues.push(normalizedIssue);
  }
  const gated = applyP0Gatekeeper({ issues, factLedger });
  for (const decision of gated.decisions) {
    if (!decision.kept) {
      const downgradedIssue = gated.issues.find((issue) => issue.issueId === decision.issueId);
      downgradedFindings.push({
        findingId: (downgradedIssue?.sourceFindingIds || [])[0] || decision.issueId,
        reason: `${decision.reasonCode}: ${decision.reason}`
      });
    }
  }

  return {
    ...judgeDecision,
    admissionRisk: judgeDecision.admissionRisk || "ready",
    verdictRisk: gated.issues.some((issue) => issue.severity === "P0")
      ? "Blocked"
      : normalizeNonBlockingVerdict(judgeDecision.verdictRisk),
    issues: gated.issues,
    downgradedFindings,
    p0GateDecisions: gated.decisions
  };
}

function normalizeIssue(issue = {}, index) {
  return {
    issueId: safeText(issue.issueId || issue.issue_id, 120) || `issue_${index + 1}`,
    sourceFindingIds: normalizeStringArray(issue.sourceFindingIds || issue.source_finding_ids),
    severity: normalizeEnum(issue.severity, ["P0", "P1", "P2"], "P1"),
    p0Category: normalizeNullableText(issue.p0Category || issue.p0_category, 120),
    question: safeText(issue.question, 2_000) || "",
    evidenceRefs: normalizeStringArray(issue.evidenceRefs || issue.evidence_refs),
    severityReason: safeText(issue.severityReason || issue.severity_reason, 2_000) || "",
    recommendedRevision: safeText(issue.recommendedRevision || issue.recommended_revision, 2_000) || "",
    blockedOutcome: safeText(issue.blockedOutcome || issue.blocked_outcome, 500) || "",
    affectedPath: safeText(issue.affectedPath || issue.affected_path, 500) || "",
    bridgeEvidenceRefs: normalizeStringArray(issue.bridgeEvidenceRefs || issue.bridge_evidence_refs),
    whyReviewCannotPass: safeText(issue.whyReviewCannotPass || issue.why_review_cannot_pass, 800) || ""
  };
}

function isSupportedP0Issue(issue, validEvidenceRefs) {
  const categoryId = issue.p0Category;
  const hasValidCategory = Boolean(P0_CATEGORIES[categoryId]);
  const hasValidEvidence = (issue.evidenceRefs || []).some((ref) => validEvidenceRefs.has(ref));
  const hasRevision = Boolean(safeText(issue.recommendedRevision, 2_000));
  return hasValidCategory && hasValidEvidence && hasRevision;
}

function shouldDeferP0CalibrationToEvidenceGate(issue, factLedger = {}) {
  if (issue.severity !== "P0") return false;
  const refs = new Set([
    ...(issue.evidenceRefs || []),
    ...(issue.bridgeEvidenceRefs || [])
  ]);
  if (!refs.size) return false;
  return [
    ...(factLedger.facts || []).map((fact) => ({
      id: fact.factId,
      approvalImpact: fact.approvalImpact
    })),
    ...(factLedger.missingFacts || []).map((fact) => ({
      id: fact.missingFactId,
      approvalImpact: fact.approvalImpact
    }))
  ].some((item) => refs.has(item.id) && item.approvalImpact === "approval_blocking");
}

function normalizeNonBlockingVerdict(verdictRisk) {
  return verdictRisk === "Blocked" ? "Conditional Pass" : verdictRisk;
}

function normalizeAdmission(value) {
  const text = String(value || "").trim().toLowerCase();
  const needsFix = [
    "needs pre-review fix", "needs pre review fix", "not reviewable", "return", "returned",
    "reject", "rejected", "打回", "不建议进入评审", "否", "no", "not ready", "needs fix"
  ];
  return needsFix.includes(text) ? "needs pre-review fix" : "ready";
}

function normalizeDowngradedFinding(item = {}) {
  return {
    findingId: safeText(item.findingId || item.finding_id, 120) || "",
    reason: safeText(item.reason, 1_000) || ""
  };
}

function normalizeDissent(item = {}) {
  return {
    findingId: safeText(item.findingId || item.finding_id, 120) || "",
    sourceFindingIds: normalizeStringArray(item.sourceFindingIds || item.source_finding_ids),
    reason: safeText(item.reason, 1_000) || ""
  };
}

function parseJsonPayload(payloadText) {
  const source = stripJsonFence(payloadText);
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Judge response was not valid JSON: ${error.message}`);
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

function normalizeNullableText(value, limit) {
  const text = safeText(value, limit);
  return text === "null" ? null : text;
}
