import test from "node:test";
import assert from "node:assert/strict";

import { shouldUseMultiReviewerPipeline } from "../src/reviewPipelineMode.mjs";

test("shouldUseMultiReviewerPipeline routes Standard Review to multi reviewer by default", () => {
  assert.equal(shouldUseMultiReviewerPipeline({
    config: {},
    reviewMode: "standard"
  }), true);
});

test("shouldUseMultiReviewerPipeline routes Deep Review to multi reviewer by default", () => {
  assert.equal(shouldUseMultiReviewerPipeline({
    config: {},
    reviewMode: "deep"
  }), true);
});

test("shouldUseMultiReviewerPipeline routes Challenge Review to multi reviewer by default", () => {
  assert.equal(shouldUseMultiReviewerPipeline({
    config: {},
    reviewMode: "challenge"
  }), true);
});

test("shouldUseMultiReviewerPipeline lets the feature flag force multi reviewer for Standard Review", () => {
  assert.equal(shouldUseMultiReviewerPipeline({
    config: { multiReviewerPipelineEnabled: true },
    reviewMode: "standard"
  }), true);
});

test("shouldUseMultiReviewerPipeline treats missing review mode as Challenge Review", () => {
  assert.equal(shouldUseMultiReviewerPipeline({
    config: {}
  }), true);
});
