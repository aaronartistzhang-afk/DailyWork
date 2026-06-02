export const CORE_SIGNAL_IDS = ["business_strategy", "measurement", "workflow", "risk_governance"];

const SIGNAL_RULES = [
  {
    signalId: "measurement",
    categories: ["metric", "measurement"],
    patterns: [/metric/i, /denominator/i, /attribution/i, /ctr/i, /revenue/i, /口径/, /分母/, /归因/]
  },
  {
    signalId: "experiment",
    categories: ["experiment", "ab", "aa"],
    patterns: [/\bab\b/i, /\baa\b/i, /control/i, /treatment/i, /random/i, /实验/, /对照组/]
  },
  {
    signalId: "workflow",
    categories: ["workflow", "operator", "user_journey"],
    patterns: [/workflow/i, /operator/i, /approve/i, /handoff/i, /流程/, /运营/, /审核/]
  },
  {
    signalId: "ai_capability",
    categories: ["ai", "model", "prompt"],
    patterns: [/\bai\b/i, /model/i, /prompt/i, /人工审核/, /模型/]
  },
  {
    signalId: "incentive",
    categories: ["reward", "incentive", "task"],
    patterns: [/reward/i, /incentive/i, /odds/i, /task/i, /奖励/, /抽奖/, /任务/]
  },
  {
    signalId: "data_product",
    categories: ["dashboard", "data_product", "report"],
    patterns: [/dashboard/i, /report/i, /source of truth/i, /看板/, /报表/]
  },
  {
    signalId: "risk_governance",
    categories: ["risk", "governance", "rollout", "privacy", "dependency"],
    patterns: [/risk/i, /rollback/i, /whitelist/i, /privacy/i, /dependency/i, /风险/, /回滚/, /白名单/, /依赖/]
  }
];

export function detectScenarioSignals(factLedger = {}) {
  const signals = [];
  const items = [
    ...(factLedger.facts || []).map((fact) => ({ ...fact, source: "fact" })),
    ...(factLedger.missingFacts || []).map((fact) => ({ ...fact, source: "missing_fact" }))
  ];

  for (const rule of SIGNAL_RULES) {
    const match = items.find((item) => matchesRule(item, rule));
    if (!match) continue;
    signals.push({
      signalId: rule.signalId,
      confidence: normalizeConfidence(match.confidence),
      source: match.source,
      evidence: match.factId || match.missingFactId || match.claim || null
    });
  }

  if (!signals.length || signals.every((signal) => signal.confidence === "low")) {
    return CORE_SIGNAL_IDS.map((signalId) => ({
      signalId,
      confidence: "medium",
      source: "fallback",
      evidence: null
    }));
  }

  return signals;
}

function matchesRule(item, rule) {
  const category = String(item.category || "").toLowerCase();
  const claim = String(item.claim || "");
  if (rule.categories.includes(category)) return true;
  return rule.patterns.some((pattern) => pattern.test(claim));
}

function normalizeConfidence(value) {
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}
