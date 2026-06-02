export const P0_CATEGORIES = {
  direction_failure: {
    id: "direction_failure",
    label: "Direction failure",
    description: "The PRD targets the wrong problem, wrong population, or an unjustified business outcome."
  },
  measurement_failure: {
    id: "measurement_failure",
    label: "Measurement failure",
    description: "Success cannot be measured or interpreted consistently after launch."
  },
  launch_safety_failure: {
    id: "launch_safety_failure",
    label: "Launch safety failure",
    description: "User experience, compliance, governance, privacy, or rollback risk makes launch unsafe."
  },
  delivery_viability_failure: {
    id: "delivery_viability_failure",
    label: "Delivery viability failure",
    description: "Dependency, cost, ownership, or operational loop makes the proposal not realistically deliverable."
  }
};

export const CORE_REVIEWER_ROLES = {
  business_strategy: {
    id: "business_strategy",
    label: "Business & Strategy",
    focus: "problem framing, target population, business value, opportunity cost",
    nonGoal: "document polish or implementation trivia"
  },
  measurement: {
    id: "measurement",
    label: "Outcome & Metric",
    focus: "business outcome, metric definition, denominator, attribution, AA/AB/large-market interpretation, success threshold",
    nonGoal: "statistical implementation audit unless formal experiment decisions depend on it"
  },
  workflow_ux: {
    id: "workflow_ux",
    label: "Workflow & UX",
    focus: "operator path, user path, decision points, handoff breaks, confusing or unsafe experience",
    nonGoal: "pixel-level UI critique"
  },
  risk_governance: {
    id: "risk_governance",
    label: "Risk & Governance",
    focus: "rollout, rollback, policy, compliance, dependency, ownership, cost, irreversible failure",
    nonGoal: "general release checklist expansion"
  }
};

export const CONDITIONAL_REVIEWER_ROLES = {
  experiment_design: {
    id: "experiment_design",
    label: "Experiment Design",
    focus: "treatment/control definition, decision unit, contamination, attribution, guardrails",
    nonGoal: "raising experiment issues when the PRD is not making an experimental claim"
  },
  incentive_economy: {
    id: "incentive_economy",
    label: "Incentive Economy",
    focus: "fairness, task difficulty, reward odds, repeated-loss experience, budget control",
    nonGoal: "optimizing reward copy"
  },
  ai_quality_human_control: {
    id: "ai_quality_human_control",
    label: "AI Quality & Human Control",
    focus: "model boundary, human review, failure mode, edited output attribution",
    nonGoal: "generic model architecture review"
  },
  data_product: {
    id: "data_product",
    label: "Data Product",
    focus: "dashboard semantics, source of truth, metric interpretation, actionability",
    nonGoal: "warehouse implementation details"
  },
  localization: {
    id: "localization",
    label: "Localization",
    focus: "target language, cultural sensitivity, market-specific assumptions",
    nonGoal: "copy editing for style only"
  },
  technical_feasibility: {
    id: "technical_feasibility",
    label: "Technical Feasibility",
    focus: "delivery feasibility only when it is a product approval risk",
    nonGoal: "general engineering audit"
  }
};

export function isP0Category(categoryId) {
  return Boolean(P0_CATEGORIES[categoryId]);
}

export function getReviewerRole(roleId) {
  return CORE_REVIEWER_ROLES[roleId] || CONDITIONAL_REVIEWER_ROLES[roleId] || null;
}
