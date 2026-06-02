import test from "node:test";
import assert from "node:assert/strict";

import {
  CORE_SIGNAL_IDS,
  detectScenarioSignals
} from "../src/scenarioSignals.mjs";

test("detectScenarioSignals detects review concerns from Fact Ledger categories and claims", () => {
  const signals = detectScenarioSignals({
    facts: [
      { category: "metric", claim: "CTR denominator and attribution need definition.", confidence: "high" },
      { category: "experiment", claim: "AB test compares treatment and control.", confidence: "high" },
      { category: "workflow", claim: "Operator approves the campaign.", confidence: "medium" },
      { category: "ai", claim: "AI generates notification copy.", confidence: "high" },
      { category: "reward", claim: "Task reward odds are shown to users.", confidence: "high" },
      { category: "dashboard", claim: "Dashboard shows campaign revenue.", confidence: "medium" },
      { category: "risk", claim: "Rollback and whitelist are required.", confidence: "medium" }
    ],
    missingFacts: []
  });

  assert.deepEqual(signals.map((signal) => signal.signalId), [
    "measurement",
    "experiment",
    "workflow",
    "ai_capability",
    "incentive",
    "data_product",
    "risk_governance"
  ]);
  assert.equal(signals.find((signal) => signal.signalId === "measurement").confidence, "high");
});

test("detectScenarioSignals uses fallback core signals when evidence is weak", () => {
  const signals = detectScenarioSignals({
    facts: [{ category: "other", claim: "Small wording change.", confidence: "low" }],
    missingFacts: []
  });

  assert.deepEqual(signals.map((signal) => signal.signalId), CORE_SIGNAL_IDS);
  assert.ok(signals.every((signal) => signal.source === "fallback"));
});

test("detectScenarioSignals treats missing metric facts as measurement evidence", () => {
  const signals = detectScenarioSignals({
    facts: [],
    missingFacts: [{ category: "measurement", claim: "Denominator missing.", confidence: "high" }]
  });

  assert.equal(signals[0].signalId, "measurement");
  assert.equal(signals[0].source, "missing_fact");
});
