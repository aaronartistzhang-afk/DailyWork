import { buildFeedbackContextPrompt, hasFeedbackContext } from "./feedbackPrompt.mjs";

export function buildFinalReviewPrompt({
  judgeDecision = {},
  outputDepth = "full",
  outputLanguage = "zh",
  feedbackContext = null
} = {}) {
  const language = outputLanguage === "en" ? "English" : "Simplified Chinese";
  const hasFeedback = hasFeedbackContext(feedbackContext);
  const reviewabilityHeading = headingFor("reviewability", outputLanguage);
  const verdictHeading = headingFor("verdict", outputLanguage);
  const depthInstruction = outputDepth === "p0"
    ? `Output ${reviewabilityHeading}, ${verdictHeading}, and P0 Blockers only.`
    : `Output ${reviewabilityHeading}, ${verdictHeading}, P0 Blockers, P1 Questions, P2 Questions, and P1/P2 Improvement Suggestions.`;
  const optionalLine = outputDepth === "p0" ? "" : "\nOptional deeper questions should stay concise and clearly separated by severity.";
  const headingLines = outputDepth === "p0"
    ? [`## ${reviewabilityHeading}`, `## ${verdictHeading}`, "## P0 Blockers"]
    : [`## ${reviewabilityHeading}`, `## ${verdictHeading}`, "## P0 Blockers", "## P1 Questions", "## P2 Questions", "## P1/P2 Improvement Suggestions"];
  const feedbackHeading = hasFeedback ? "\n## Feedback Decisions" : "";
  const feedbackInstruction = buildFeedbackContextPrompt(feedbackContext);
  const reviewabilityLine = outputLanguage === "en"
    ? "Group Admission: Yes / No"
    : "组内准入：是 / 否";
  const verdictLine = outputLanguage === "en"
    ? "Simulated Review Result: Pass / Conditional Pass / Fail"
    : "模拟评审结果：通过 / 有条件通过 / 不通过";

  return `# Final Composer

Output language: ${language}
${depthInstruction}${optionalLine}

Rules:
- Do not add new issues beyond the Judge decision.
- 不要新增 Judge 没有裁决的问题.
- Keep questions direct and product-review oriented.
- For every P0 blocker, include a concrete PRD revision suggestion.
- Keep P1/P2 suggestions in a separate section so users can scan blockers first.
- If Judge decision includes downgraded P0 or p0GateDecisions, do not present downgraded items as blockers. Mention them only as non-blocking P1/P2 follow-ups when outputDepth allows.
- If a candidate P0 was downgraded, briefly explain why it is not a hard blocker instead of hiding the decision.
- If the simulated review result is not "不通过" / "Fail", the P0 Blockers section must say there are no P0 blockers. Do not list downgraded candidate P0 items under P0.
- Never expose internal machine fields in user output: issue_id, finding_id, evidenceRefs, chunk_*, fact_*, missing_*, p0Category, snake_case reason codes, or category labels such as measurement_failure.
- Do not write "被降级" / "downgraded" diagnostics into the final review. Rewrite the product-facing concern as a concise P1/P2 follow-up instead.
- For P1/P2, avoid blocker wording such as "Blocked", "blocking", "阻断", "上线阻塞项", or "上线门控". Use follow-up/readiness language instead.
- First output ## ${reviewabilityHeading} as the group-admission gate. It decides only whether the PRD is concrete enough to enter group discussion, not whether the simulated group review passes.
- 组内准入只判断是否具备进入组会讨论的信息基础；模拟评审结果才判断本次组会模拟是否通过。
- In ## ${reviewabilityHeading}, start with exactly one admission line: ${reviewabilityLine}
- Use "否" / "No" only when the PRD lacks enough concrete context for meaningful group discussion. A PRD can be "是" / "Yes" and still have a simulated review result of "不通过" / "Fail".
- Then output ## ${verdictHeading} to decide whether the simulated group review would pass, conditionally pass, or fail.
- In ## ${verdictHeading}, start with exactly one result line: ${verdictLine}
- Do not mix group-admission wording into the simulated review result line.

Required headings:
${headingLines.join("\n")}${feedbackHeading}

${feedbackInstruction}

[JUDGE DECISION]
${JSON.stringify(judgeDecision || {}, null, 2)}`;
}

export function normalizeFinalReviewVerdict(reviewText, {
  judgeDecision = {},
  outputLanguage = "zh"
} = {}) {
  const verdict = verdictLabelForJudgeRisk(judgeDecision.verdictRisk, outputLanguage);
  let normalized = canonicalizeReviewHeadings(reviewText, outputLanguage);
  if (!verdict) {
    normalized = ensureReviewabilityCheck(normalized, { judgeDecision, outputLanguage });
    normalized = enforceP0SectionForVerdict(normalized, { judgeDecision, outputLanguage });
    normalized = stripInternalDiagnostics(normalized);
    return softenNonBlockingSeverityLanguage(normalized, { judgeDecision, outputLanguage });
  }

  const verdictLine = lineFor("verdict", verdict, outputLanguage);
  const verdictPattern = verdictLinePattern();

  if (verdictPattern.test(normalized)) {
    normalized = normalized.replace(verdictPattern, verdictLine);
  } else {
    const headingPattern = new RegExp(`^(##\\s+${escapeRegExp(headingFor("verdict", outputLanguage))}\\s*)$`, "im");
    if (headingPattern.test(normalized)) {
      normalized = normalized.replace(headingPattern, `$1\n${verdictLine}`);
    } else {
      normalized = `## ${headingFor("verdict", outputLanguage)}\n${verdictLine}\n\n${normalized}`;
    }
  }

  normalized = ensureReviewabilityCheck(normalized, { judgeDecision, outputLanguage });
  normalized = enforceP0SectionForVerdict(normalized, { judgeDecision, outputLanguage });
  normalized = stripInternalDiagnostics(normalized);
  return softenNonBlockingSeverityLanguage(normalized, { judgeDecision, outputLanguage });
}

function verdictLabelForJudgeRisk(verdictRisk, outputLanguage) {
  const risk = String(verdictRisk || "").trim().toLowerCase();
  const isEnglish = outputLanguage === "en";
  if (risk === "blocked") return isEnglish ? "Fail" : "不通过";
  if (risk === "pass") return isEnglish ? "Pass" : "通过";
  if (risk === "conditional pass") return isEnglish ? "Conditional Pass" : "有条件通过";
  return "";
}

function admissionLabelForJudgeRisk(verdictRisk, outputLanguage) {
  const risk = String(verdictRisk || "").trim().toLowerCase();
  const isEnglish = outputLanguage === "en";
  if (["return", "returned", "reject", "rejected", "not reviewable", "needs pre-review fix", "打回", "不建议进入评审"].includes(risk)) {
    return isEnglish ? "No" : "否";
  }
  return isEnglish ? "Yes" : "是";
}

function ensureReviewabilityCheck(reviewText, {
  judgeDecision = {},
  outputLanguage = "zh"
} = {}) {
  const source = canonicalizeReviewHeadings(reviewText, outputLanguage);
  const admissionRisk = judgeDecision.admissionRisk ??
    judgeDecision.reviewabilityRisk ??
    judgeDecision.groupAdmission ??
    judgeDecision.admission;
  const admission = admissionLabelForJudgeRisk(admissionRisk, outputLanguage);
  if (!admission) return source;

  const admissionLine = lineFor("reviewability", admission, outputLanguage);
  const reviewabilityHeadingText = headingFor("reviewability", outputLanguage);
  const verdictHeadingText = headingFor("verdict", outputLanguage);
  const section = `## ${reviewabilityHeadingText}\n${admissionLine}`;
  const reviewabilityHeading = new RegExp(`^##\\s+${escapeRegExp(reviewabilityHeadingText)}\\s*$`, "im");
  const existingHeading = reviewabilityHeading.exec(source);
  if (existingHeading) {
    const bodyStart = existingHeading.index + existingHeading[0].length;
    const rest = source.slice(bodyStart);
    const nextHeadingMatch = /^##\s+/m.exec(rest);
    const bodyEnd = nextHeadingMatch ? bodyStart + nextHeadingMatch.index : source.length;
    const body = source.slice(bodyStart, bodyEnd).trim();
    const normalizedBody = reviewabilityLinePattern().test(body)
      ? body.replace(reviewabilityLinePattern(), admissionLine)
      : `${admissionLine}${body ? `\n${body}` : ""}`;
    return [
      source.slice(0, existingHeading.index),
      `## ${reviewabilityHeadingText}\n${normalizedBody}`,
      sectionTail(source.slice(bodyEnd))
    ].join("");
  }

  const verdictHeading = new RegExp(`^##\\s+${escapeRegExp(verdictHeadingText)}\\s*$`, "im");
  if (verdictHeading.test(source)) {
    return source.replace(verdictHeading, `${section}\n\n## ${verdictHeadingText}`);
  }
  return `${section}\n\n${source}`;
}

function sectionTail(tail) {
  const value = String(tail || "");
  if (!value) return "";
  return value.trimStart().startsWith("##") ? `\n\n${value.trimStart()}` : value;
}

function enforceP0SectionForVerdict(reviewText, { judgeDecision = {}, outputLanguage = "zh" } = {}) {
  const risk = String(judgeDecision.verdictRisk || "").trim().toLowerCase();
  if (risk === "blocked") return reviewText;

  const source = String(reviewText || "");
  const headingMatch = /^##\s+P0 Blockers\s*$/im.exec(source);
  if (!headingMatch) return source;

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const rest = source.slice(bodyStart);
  const nextHeadingMatch = /^##\s+/m.exec(rest);
  const bodyEnd = nextHeadingMatch ? bodyStart + nextHeadingMatch.index : source.length;
  const noP0Line = outputLanguage === "en"
    ? "No P0 blockers. Downgraded items are P1/P2 follow-ups when relevant."
    : "无 P0 阻断问题。已降级的问题会作为 P1/P2 跟进项处理。";

  return [
    source.slice(0, bodyStart),
    `\n${noP0Line}`,
    sectionTail(source.slice(bodyEnd))
  ].join("");
}

function stripInternalDiagnostics(reviewText) {
  return String(reviewText || "")
    .split("\n")
    .map(cleanInternalDiagnosticLine)
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInternalDiagnosticLine(line) {
  const source = String(line || "");
  const trimmed = source.trim();
  if (!trimmed) return source;
  if (/^(证据引用|Evidence refs?|evidenceRefs?)\s*[:：]/i.test(trimmed)) return null;
  if (/\b(issue|finding|chunk|fact|missing)_\d+\b/i.test(trimmed) && /被降级|downgraded|evidence|证据引用|reason|理由/i.test(trimmed)) return null;
  if (/^[-*]?\s*(issue|finding)_\d+\b/i.test(trimmed)) return null;

  const cleaned = source
    .replace(/\b(?:issue|finding|chunk|fact|missing)_\d+(?:_(?:fact|missing)_\d+)?\b/gi, "")
    .replace(/\s*\(([a-z][a-z0-9]+(?:_[a-z0-9]+){1,})\)\s*/g, " ")
    .replace(/\b(?:p0Category|evidenceRefs?|sourceFindingIds|severityProposed|severityReason|recommendedRevision)\b\s*[:：]?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([，。；：、,.])/g, "$1")
    .trimEnd();

  return cleaned.trim() ? cleaned : null;
}

function headingFor(kind, outputLanguage) {
  if (kind === "reviewability") {
    return outputLanguage === "en" ? "Group Admission" : "组内准入";
  }
  if (kind === "verdict") {
    return outputLanguage === "en" ? "Simulated Review Result" : "模拟评审结果";
  }
  return "";
}

function lineFor(kind, value, outputLanguage) {
  if (kind === "reviewability") {
    return outputLanguage === "en" ? `Group Admission: ${value}` : `组内准入：${value}`;
  }
  if (kind === "verdict") {
    return outputLanguage === "en" ? `Simulated Review Result: ${value}` : `模拟评审结果：${value}`;
  }
  return String(value || "");
}

function canonicalizeReviewHeadings(reviewText, outputLanguage) {
  return String(reviewText || "")
    .replace(/([^\n#])\s*(##\s+)/g, "$1\n\n$2")
    .split("\n")
    .map((line) => {
      const heading = line.match(/^(##)\s+(.+?)\s*$/);
      if (!heading) return line;
      const normalized = normalizeHeading(heading[2]);
      if (REVIEWABILITY_HEADINGS.has(normalized)) return `## ${headingFor("reviewability", outputLanguage)}`;
      if (VERDICT_HEADINGS.has(normalized)) return `## ${headingFor("verdict", outputLanguage)}`;
      return line;
    })
    .join("\n");
}

function reviewabilityLinePattern() {
  return /^(组内准入|上会结论|准入结论|Group Admission|Readiness|Admission)\s*[:：].*$/im;
}

function verdictLinePattern() {
  return /^(模拟评审结果|上线建议|结论|Simulated Review Result|Recommendation|Verdict)\s*[:：].*$/im;
}

function normalizeHeading(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[*`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REVIEWABILITY_HEADINGS = new Set([
  "reviewability check",
  "group admission",
  "meeting readiness",
  "组内准入",
  "可评审标准",
  "评审准入",
  "上会状态",
  "上会准入"
]);

const VERDICT_HEADINGS = new Set([
  "simulated review result",
  "review verdict",
  "launch recommendation",
  "模拟评审结果",
  "上线建议",
  "评审结论",
  "组会模拟结论"
]);

function softenNonBlockingSeverityLanguage(reviewText, { judgeDecision = {}, outputLanguage = "zh" } = {}) {
  const risk = String(judgeDecision.verdictRisk || "").trim().toLowerCase();
  if (risk === "blocked") return reviewText;

  let inNonBlockingSection = false;
  return String(reviewText || "").split("\n").map((line) => {
    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (heading) {
      const headingText = heading[1].toLowerCase();
      inNonBlockingSection = /p1|p2|improvement|suggestion|优化|建议|追问/.test(headingText) &&
        !/p0|blocker/.test(headingText);
      if (/reviewability check|group admission|meeting readiness|simulated review result|review verdict|launch recommendation|组内准入|上会状态|上会准入|评审准入|可评审标准|模拟评审结果|评审结论|上线建议|组会模拟结论|p0/.test(headingText)) inNonBlockingSection = false;
    }
    return inNonBlockingSection ? softenLine(line, outputLanguage) : line;
  }).join("\n");
}

function softenLine(line, outputLanguage) {
  if (outputLanguage === "en") {
    return line
      .replace(/\bBlocked\b/g, "Needs follow-up")
      .replace(/\bblocking item\b/gi, "follow-up item")
      .replace(/\bblocks approval and launch decisions\b/gi, "may affect later validation and launch decisions")
      .replace(/\blaunch blocker\b/gi, "pre-launch follow-up")
      .replace(/\bblocking\b/gi, "follow-up");
  }
  return line
    .replace(/阻断审批与上线决策/g, "影响后续验收与上线判断")
    .replace(/阻碍审批与上线决策/g, "影响后续验收与上线判断")
    .replace(/上线阻塞项/g, "上线前需确认项")
    .replace(/上线门控|上线门禁/g, "上线前确认项")
    .replace(/硬阻塞/g, "高优先级跟进项")
    .replace(/阻塞项/g, "需确认项")
    .replace(/不能上线或验证/g, "会影响上线验证")
    .replace(/无法上线/g, "会影响上线准备")
    .replace(/阻断/g, "影响")
    .replace(/\bBlocked\b/g, "需跟进");
}
