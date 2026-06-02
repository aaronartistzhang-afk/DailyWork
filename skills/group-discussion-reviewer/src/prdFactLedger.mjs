export function buildFactLedgerPrompt({
  prdContent,
  outputLanguage = "zh",
  chunkMeta = null
} = {}) {
  const language = outputLanguage === "en" ? "English" : "Simplified Chinese";
  const chunkLine = chunkMeta
    ? `Chunk: ${chunkMeta.chunkId} (${chunkMeta.startChar}-${chunkMeta.endChar})`
    : "Chunk: full_prd";

  return `You are building a PRD Fact Ledger for a product group-discussion review.

Output language for claims: ${language}.
${chunkLine}

Return valid JSON only. Do not wrap the JSON in markdown.

Schema:
{
  "facts": [
    {
      "factId": "fact_1",
      "category": "objective | target_population | metric | experiment | workflow | rollout | risk | ai | reward | dashboard | localization | dependency | other",
      "claim": "A concise fact from the PRD.",
      "sourceExcerpt": "Short direct excerpt from the PRD, or null if inferred.",
      "sourceRef": "Optional source reference such as resource_id when the fact comes from an expanded embedded resource.",
      "evidenceStrength": "direct | inferred",
      "confidence": "low | medium | high"
    }
  ],
  "approvalBlockingMissingFacts": [
    {
      "missingFactId": "missing_1",
      "category": "measurement | workflow | rollout | risk | dependency | other",
      "claim": "A missing fact that blocks approval or launch/ramp decision-making.",
      "sourceRef": "Optional source reference if the gap is tied to a resource.",
      "approvalImpact": "approval_blocking",
      "evidenceStrength": "missing",
      "confidence": "low | medium | high"
    }
  ],
  "followUpMissingFacts": [
    {
      "missingFactId": "followup_1",
      "category": "measurement | workflow | rollout | risk | dependency | other",
      "claim": "A useful follow-up gap that should not block approval by itself.",
      "sourceRef": "Optional source reference if the gap is tied to a resource.",
      "approvalImpact": "follow_up",
      "evidenceStrength": "missing",
      "confidence": "low | medium | high"
    }
  ],
  "coverageMap": [
    {
      "chunkId": "${chunkMeta?.chunkId || "full_prd"}",
      "startChar": ${Number.isInteger(chunkMeta?.startChar) ? chunkMeta.startChar : 0},
      "endChar": ${Number.isInteger(chunkMeta?.endChar) ? chunkMeta.endChar : String(prdContent || "").length}
    }
  ],
  "resourceCoverage": [
    {
      "resourceId": "sheet:<sheet_id_or_token>",
      "type": "sheet | bitable | cite | other",
      "status": "expanded | partial | not_expanded | referenced",
      "summary": "What content was available from this resource."
    }
  ],
  "unexpandedResources": [
    {
      "resourceId": "sheet:<sheet_id_or_token>",
      "type": "sheet | bitable | cite | other",
      "status": "not_expanded | referenced",
      "reason": "Why the resource content is not available in the Fact Ledger."
    }
  ]
}

Rules:
- Extract only what is present or clearly missing from the PRD.
- At most 12 facts. Keep only approval-relevant facts.
- At most 4 approvalBlockingMissingFacts. Use only when the absence prevents approval, safe launch, measurable success, correct direction, or delivery viability.
- At most 8 followUpMissingFacts. Use for useful review follow-ups that should not block approval by themselves.
- Use sourceExcerpt for direct facts.
- Use sourceRef when a fact or missing fact is based on an embedded resource appendix.
- If a critical answer may exist in an unexpanded resource, do not mark the missing fact approval_blocking unless the PRD body itself makes the launch/approval blocker explicit.
- Do not treat "not written" as approval blocking by default. Most missing details belong in followUpMissingFacts.
- For monitoring or recap dashboard PRDs with an expanded metric table, missing core acceptance metric convergence, baseline comparison formula, aggregation dimension, or attribution window should normally be followUpMissingFacts, not approvalBlockingMissingFacts, unless the PRD explicitly makes the dashboard a launch, ramp, settlement, SOT, or resource decision gate.
- For decision-critical dashboards used as launch/ramp/settlement/SOT/resource/traffic/budget allocation or approval gates, missing primary metric, baseline, attribution window, or pass threshold can be approvalBlockingMissingFacts.
- Keep facts product-review oriented; avoid implementation trivia.
- Keep each claim and sourceExcerpt short enough that the whole response remains valid, complete JSON.

PRD:
${prdContent || ""}`;
}

export function parseFactLedgerResponse(payloadText) {
  const source = stripJsonFence(payloadText);
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Fact Ledger response was not valid JSON: ${error.message}`);
  }

  return {
    facts: Array.isArray(parsed.facts) ? parsed.facts.map(normalizeFact) : [],
    ...normalizeMissingFactTiers(parsed),
    coverageMap: Array.isArray(parsed.coverageMap) ? parsed.coverageMap.map(normalizeCoverage).filter(Boolean) : [],
    resourceCoverage: Array.isArray(parsed.resourceCoverage) ? parsed.resourceCoverage.map(normalizeResourceCoverage).filter(Boolean) : [],
    unexpandedResources: Array.isArray(parsed.unexpandedResources) ? parsed.unexpandedResources.map(normalizeUnexpandedResource).filter(Boolean) : []
  };
}

export function serializeFactLedgerForReview(factLedger = {}) {
  const { missingFacts, approvalBlockingMissingFacts, followUpMissingFacts } = splitMissingFacts(factLedger);
  return [
    "[PRD FACT LEDGER]",
    JSON.stringify({
      facts: factLedger.facts || [],
      missingFacts,
      approvalBlockingMissingFacts,
      followUpMissingFacts,
      coverageMap: factLedger.coverageMap || [],
      resourceCoverage: factLedger.resourceCoverage || [],
      unexpandedResources: factLedger.unexpandedResources || []
    }, null, 2)
  ].join("\n");
}

function normalizeFact(fact = {}, index) {
  return {
    factId: safeText(fact.factId || fact.fact_id || `fact_${index + 1}`, 80),
    category: safeText(fact.category, 80) || "other",
    claim: safeText(fact.claim, 1_000) || "",
    sourceExcerpt: safeText(fact.sourceExcerpt || fact.source_excerpt, 500),
    sourceRef: safeText(fact.sourceRef || fact.source_ref, 200),
    evidenceStrength: normalizeEnum(fact.evidenceStrength || fact.evidence_strength, ["direct", "inferred"], "inferred"),
    confidence: normalizeEnum(fact.confidence, ["low", "medium", "high"], "medium")
  };
}

function normalizeMissingFactTiers(parsed = {}) {
  const approvalBlockingMissingFacts = Array.isArray(parsed.approvalBlockingMissingFacts)
    ? parsed.approvalBlockingMissingFacts.map((fact, index) => normalizeMissingFact(fact, index, "approval_blocking"))
    : [];
  const followUpMissingFacts = Array.isArray(parsed.followUpMissingFacts)
    ? parsed.followUpMissingFacts.map((fact, index) => normalizeMissingFact(fact, index, "follow_up"))
    : [];
  const legacyMissingFacts = Array.isArray(parsed.missingFacts)
    ? parsed.missingFacts.map((fact, index) => normalizeMissingFact(fact, index, fact.approvalImpact || "approval_blocking"))
    : [];
  const missingFacts = legacyMissingFacts.length
    ? legacyMissingFacts
    : [...approvalBlockingMissingFacts, ...followUpMissingFacts];

  return {
    missingFacts,
    approvalBlockingMissingFacts: approvalBlockingMissingFacts.length
      ? approvalBlockingMissingFacts
      : missingFacts.filter((fact) => fact.approvalImpact === "approval_blocking"),
    followUpMissingFacts: followUpMissingFacts.length
      ? followUpMissingFacts
      : missingFacts.filter((fact) => fact.approvalImpact === "follow_up")
  };
}

function normalizeMissingFact(fact = {}, index, fallbackApprovalImpact = "follow_up") {
  return {
    missingFactId: safeText(fact.missingFactId || fact.missing_fact_id || `missing_${index + 1}`, 80),
    category: safeText(fact.category, 80) || "other",
    claim: safeText(fact.claim, 1_000) || "",
    sourceRef: safeText(fact.sourceRef || fact.source_ref, 200),
    approvalImpact: normalizeEnum(fact.approvalImpact || fact.approval_impact, ["approval_blocking", "follow_up"], fallbackApprovalImpact),
    evidenceStrength: "missing",
    confidence: normalizeEnum(fact.confidence, ["low", "medium", "high"], "medium")
  };
}

function splitMissingFacts(factLedger = {}) {
  const explicitApprovalBlocking = Array.isArray(factLedger.approvalBlockingMissingFacts) ? factLedger.approvalBlockingMissingFacts : [];
  const explicitFollowUp = Array.isArray(factLedger.followUpMissingFacts) ? factLedger.followUpMissingFacts : [];
  const merged = Array.isArray(factLedger.missingFacts) ? factLedger.missingFacts : [];
  const missingFacts = merged.length ? merged : [...explicitApprovalBlocking, ...explicitFollowUp];
  const approvalBlockingMissingFacts = explicitApprovalBlocking.length
    ? explicitApprovalBlocking
    : missingFacts.filter((fact) => fact.approvalImpact === "approval_blocking");
  const followUpMissingFacts = explicitFollowUp.length
    ? explicitFollowUp
    : missingFacts.filter((fact) => fact.approvalImpact === "follow_up");

  return {
    missingFacts,
    approvalBlockingMissingFacts,
    followUpMissingFacts
  };
}

function normalizeCoverage(coverage = {}) {
  const startChar = Number(coverage.startChar);
  const endChar = Number(coverage.endChar);
  const chunkId = safeText(coverage.chunkId, 80);
  if (!chunkId || !Number.isInteger(startChar) || !Number.isInteger(endChar)) return null;
  return { chunkId, startChar, endChar };
}

function normalizeResourceCoverage(resource = {}) {
  const resourceId = safeText(resource.resourceId || resource.resource_id, 200);
  if (!resourceId) return null;
  return {
    resourceId,
    type: safeText(resource.type, 80) || "other",
    status: normalizeEnum(resource.status, ["expanded", "partial", "not_expanded", "referenced"], "referenced"),
    summary: safeText(resource.summary, 1_000) || ""
  };
}

function normalizeUnexpandedResource(resource = {}) {
  const resourceId = safeText(resource.resourceId || resource.resource_id, 200);
  if (!resourceId) return null;
  return {
    resourceId,
    type: safeText(resource.type, 80) || "other",
    status: normalizeEnum(resource.status, ["not_expanded", "referenced"], "referenced"),
    reason: safeText(resource.reason, 1_000) || ""
  };
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

function safeText(value, limit) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, limit);
}
