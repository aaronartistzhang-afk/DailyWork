import test from "node:test";
import assert from "node:assert/strict";

import { buildReviewerPrompt } from "../src/reviewerPrompt.mjs";

// Regression guard: the reviewer prompt is built from calibration notes taken
// off real review sessions. It must come out generic — no reviewer identity,
// no source-PRD titles, no internal codenames carried through.
//
// The blocklist deliberately does not live in this repo: writing the very
// strings you are scrubbing into a public file defeats the scrub. Point
// REVIEW_PROMPT_BLOCKLIST at a pipe-separated regex to enforce it locally or
// in a private CI run.
//
//   REVIEW_PROMPT_BLOCKLIST='SomeName|SOME-CODENAME' npm test
//
// The positive assertions below carry the rest of the weight: they check the
// prompt states the calibration lessons in their generalized form.
function assertNoCalibrationLeak(prompt) {
  const blocklist = process.env.REVIEW_PROMPT_BLOCKLIST;
  if (!blocklist) return;
  assert.doesNotMatch(prompt, new RegExp(blocklist, "i"));
}

test("reviewer prompt is generic and does not expose personal profile labels", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes an activity banner ranking rule.",
    prdType: "placement",
    outputDepth: "full"
  });

  assert.match(prompt, /senior product review simulator/);
  assert.match(prompt, /Ask questions only/);
  assertNoCalibrationLeak(prompt);
});

test("reviewer prompt defaults to Chinese output", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    prdType: "workflow",
    outputDepth: "p0"
  });

  assert.match(prompt, /Output language: Simplified Chinese/);
});

test("reviewer prompt supports English output", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    prdType: "workflow",
    outputDepth: "p0",
    outputLanguage: "en"
  });

  assert.match(prompt, /Output language: English/);
});

test("reviewer prompt requires verdict and blocker suggestions", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    prdType: "workflow",
    outputDepth: "full"
  });

  assert.match(prompt, /Review Verdict/);
  assert.match(prompt, /是否可以通过组内评审/);
  assert.match(prompt, /P0 Blockers/);
  assert.match(prompt, /修改建议/);
  assert.match(prompt, /P1\/P2 Improvement Suggestions/);
});

test("reviewer prompt supports standard, deep, and challenge review modes", () => {
  const standard = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    reviewMode: "standard"
  });
  const deep = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    reviewMode: "deep"
  });
  const challenge = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    reviewMode: "challenge"
  });

  assert.match(standard, /Standard Review/);
  assert.match(standard, /typical product group review/);
  assert.match(standard, /P0 has no quota/);
  assert.match(deep, /Deep Review/);
  assert.match(deep, /business goal, user\/operator journey/);
  assert.match(challenge, /Challenge Review/);
  assert.match(challenge, /stress-test the direction itself/);
  assert.match(challenge, /P0 has no quota/i);
  assert.doesNotMatch(challenge, /Target shape: 1-3/i);
});

test("reviewer prompt stays product-focused instead of tech-audit focused", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes an experiment and related data reporting.",
    prdType: "data",
    reviewMode: "challenge"
  });

  assert.match(prompt, /product PRD review, not a code review, data pipeline review, or release engineering review/);
  assert.match(prompt, /can it launch safely, can success be measured, is it aimed at the right problem\/population, and is delivery viable/);
  assert.match(prompt, /Treat "not yet specified" as P1 unless/);
  assert.match(prompt, /SQL samples, source\/target tables/);
  assert.match(prompt, /data implementation follow-ups/);
  assert.doesNotMatch(prompt, /snapshot timing|version freeze|data freshness|migration consistency/);
});

test("reviewer prompt narrows P0 to approval-critical failures", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    reviewMode: "standard"
  });

  assert.match(prompt, /Only raise P0 when something would block safe launch, make success unmeasurable, aim at the wrong problem, or make delivery non-viable/);
  assert.match(prompt, /delivery viability/);
  assert.match(prompt, /如无 P0，明确写"无 P0"/);
  assert.match(prompt, /Do not flag the following as issues unless they actually cause a launch\/measurement\/direction\/delivery viability failure/);
  assert.match(prompt, /P0 has no quota/i);
});

test("reviewer prompt includes latest group calibration without personal labels", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a GTM activity with tasks, rewards, and account monitoring.",
    prdType: "monitoring",
    reviewMode: "challenge"
  });

  assert.match(prompt, /benchmark is comparable/);
  assert.match(prompt, /campaign-driven growth from natural movement/);
  assert.match(prompt, /same score should require comparable effort/);
  assert.match(prompt, /protected population, whitelist\/allowlist boundary/);
  assert.match(prompt, /which alerts are must-answer and which should be merged/);
  assertNoCalibrationLeak(prompt);
});

test("reviewer prompt adjudicates user feedback during regeneration", () => {
  const prompt = buildReviewerPrompt({
    prdContent: "This PRD changes a campaign workflow.",
    prdType: "workflow",
    outputDepth: "full",
    feedbackContext: {
      previousReview: "## P0 Blockers\n### P0-1: Old issue",
      items: [{
        feedbackId: "fb_1",
        target: "p0",
        feedbackType: "severity_disagreement",
        tags: ["too_strict"],
        comment: "P0-1 should be P1.",
        anchor: {
          reviewRevisionId: "rr_1",
          anchorType: "item",
          sectionKind: "p0",
          itemIndex: 0,
          itemLabel: "P0-1",
          contentHash: "clienthash:abc123"
        }
      }]
    }
  });

  assert.match(prompt, /Regeneration with feedback/);
  assert.match(prompt, /do not comply by default/i);
  assert.match(prompt, /accepted \/ rejected \/ partial/);
  assert.match(prompt, /## Feedback Decisions/);
  assert.match(prompt, /fb_1/);
  assert.match(prompt, /anchor: revision=rr_1 section=p0 type=item item=P0-1 hash=clienthash:abc123/);
  assert.match(prompt, /If feedback items conflict/i);
});
