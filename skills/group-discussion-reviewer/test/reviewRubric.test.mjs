import test from "node:test";
import assert from "node:assert/strict";

import {
  CONDITIONAL_REVIEWER_ROLES,
  CORE_REVIEWER_ROLES,
  P0_CATEGORIES,
  getReviewerRole,
  isP0Category
} from "../src/reviewRubric.mjs";

test("review rubric exports the four approval-critical P0 categories", () => {
  assert.deepEqual(Object.keys(P0_CATEGORIES), [
    "direction_failure",
    "measurement_failure",
    "launch_safety_failure",
    "delivery_viability_failure"
  ]);
  assert.equal(P0_CATEGORIES.direction_failure.label, "Direction failure");
  assert.equal(P0_CATEGORIES.measurement_failure.label, "Measurement failure");
  assert.equal(P0_CATEGORIES.launch_safety_failure.label, "Launch safety failure");
  assert.equal(P0_CATEGORIES.delivery_viability_failure.label, "Delivery viability failure");
  assert.equal(isP0Category("measurement_failure"), true);
  assert.equal(isP0Category("implementation_detail"), false);
});

test("review rubric defines core product reviewer roles", () => {
  assert.deepEqual(Object.keys(CORE_REVIEWER_ROLES), [
    "business_strategy",
    "measurement",
    "workflow_ux",
    "risk_governance"
  ]);

  assert.match(CORE_REVIEWER_ROLES.business_strategy.focus, /problem framing/);
  assert.match(CORE_REVIEWER_ROLES.measurement.focus, /denominator/);
  assert.match(CORE_REVIEWER_ROLES.workflow_ux.focus, /operator path/);
  assert.match(CORE_REVIEWER_ROLES.risk_governance.focus, /rollback/);
});

test("review rubric defines conditional reviewer roles without making technical feasibility default", () => {
  assert.deepEqual(Object.keys(CONDITIONAL_REVIEWER_ROLES), [
    "experiment_design",
    "incentive_economy",
    "ai_quality_human_control",
    "data_product",
    "localization",
    "technical_feasibility"
  ]);

  assert.equal(CORE_REVIEWER_ROLES.technical_feasibility, undefined);
  assert.match(CONDITIONAL_REVIEWER_ROLES.technical_feasibility.nonGoal, /general engineering audit/);
});

test("getReviewerRole returns core and conditional roles by id", () => {
  assert.equal(getReviewerRole("measurement").id, "measurement");
  assert.equal(getReviewerRole("ai_quality_human_control").id, "ai_quality_human_control");
  assert.equal(getReviewerRole("unknown"), null);
});
