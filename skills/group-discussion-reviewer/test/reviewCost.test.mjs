import test from "node:test";
import assert from "node:assert/strict";

import { calculateResponseCostUsd, estimateMultiReviewerRequestCostUsd, estimateReviewRequestCostUsd } from "../src/reviewCost.mjs";

test("estimateReviewRequestCostUsd estimates gpt-5-mini review cost", () => {
  const cost = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(20_000),
    outputDepth: "full"
  });

  assert.ok(cost > 0);
  assert.ok(cost < 1);
});

test("estimateReviewRequestCostUsd includes feedback context cost", () => {
  const base = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(20_000),
    outputDepth: "full"
  });
  const regenerated = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(20_000),
    outputDepth: "full",
    extraInputChars: 12_000
  });

  assert.ok(regenerated > base);
});

test("estimateReviewRequestCostUsd does not discount long PRDs as condensed excerpts", () => {
  const short = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(118_000),
    outputDepth: "p0"
  });
  const long = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(140_000),
    outputDepth: "p0"
  });

  assert.ok(long > short);
});

test("calculateResponseCostUsd uses OpenAI usage tokens", () => {
  const cost = calculateResponseCostUsd({
    model: "gpt-5-mini",
    usage: {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000
    },
    fallbackCostUsd: 0.01
  });

  assert.equal(cost, 2.25);
});

test("calculateResponseCostUsd falls back when usage is unavailable", () => {
  assert.equal(calculateResponseCostUsd({
    model: "gpt-5-mini",
    usage: null,
    fallbackCostUsd: 0.123
  }), 0.123);
});

test("estimateMultiReviewerRequestCostUsd accounts for repeated reviewer and judge calls", () => {
  const single = estimateReviewRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(60_000),
    outputDepth: "full"
  });
  const multi = estimateMultiReviewerRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(60_000),
    outputDepth: "full",
    reviewMode: "challenge"
  });

  assert.ok(multi > single);
});

test("estimateMultiReviewerRequestCostUsd scales by review mode", () => {
  const standard = estimateMultiReviewerRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(40_000),
    outputDepth: "p0",
    reviewMode: "standard"
  });
  const challenge = estimateMultiReviewerRequestCostUsd({
    model: "gpt-5-mini",
    prdContent: "x".repeat(40_000),
    outputDepth: "p0",
    reviewMode: "challenge"
  });

  assert.ok(challenge > standard);
});
