import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFinalReviewPrompt,
  normalizeFinalReviewVerdict
} from "../src/finalReviewComposer.mjs";

test("buildFinalReviewPrompt requests stable Chinese review sections", () => {
  const prompt = buildFinalReviewPrompt({
    judgeDecision: {
      verdictRisk: "Conditional Pass",
      issues: [{
        issueId: "issue_1",
        severity: "P0",
        question: "分母是什么？",
        recommendedRevision: "补充分母。"
      }]
    },
    outputDepth: "full",
    outputLanguage: "zh"
  });

  assert.match(prompt, /Final Composer/);
  assert.match(prompt, /Simplified Chinese/);
  assert.match(prompt, /## 组内准入/);
  assert.match(prompt, /只判断是否具备进入组会讨论的信息基础/);
  assert.match(prompt, /组内准入：是 \/ 否/);
  assert.match(prompt, /## 模拟评审结果/);
  assert.match(prompt, /模拟评审结果：通过 \/ 有条件通过 \/ 不通过/);
  assert.match(prompt, /## P0 Blockers/);
  assert.match(prompt, /## P1 Questions/);
  assert.match(prompt, /## P2 Questions/);
  assert.match(prompt, /## P1\/P2 Improvement Suggestions/);
  assert.match(prompt, /不要新增 Judge 没有裁决的问题/);
  assert.match(prompt, /candidate P0/i);
  assert.match(prompt, /hard blocker/i);
  assert.doesNotMatch(prompt, /## Readiness Check/);
  assert.doesNotMatch(prompt, /do not create a separate readiness heading/i);
});

test("buildFinalReviewPrompt supports P0-only English output", () => {
  const prompt = buildFinalReviewPrompt({
    judgeDecision: { verdictRisk: "blocked", issues: [] },
    outputDepth: "p0",
    outputLanguage: "en"
  });

  assert.match(prompt, /English/);
  assert.match(prompt, /Output Group Admission, Simulated Review Result, and P0 Blockers only/);
  assert.match(prompt, /Group Admission: Yes \/ No/);
  assert.match(prompt, /## Group Admission/);
  assert.match(prompt, /## Simulated Review Result/);
  assert.doesNotMatch(prompt, /Optional deeper questions/);
  assert.doesNotMatch(prompt, /## P1 Questions/);
  assert.doesNotMatch(prompt, /## P2 Questions/);
});

test("normalizeFinalReviewVerdict inserts missing Chinese reviewability check", () => {
  const review = normalizeFinalReviewVerdict(`## Review Verdict
结论：可以通过

## P0 Blockers
无。`, {
    judgeDecision: { verdictRisk: "Conditional Pass" },
    outputLanguage: "zh"
  });

  assert.match(review, /^## 组内准入\n组内准入：是/m);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：有条件通过/);
});

test("normalizeFinalReviewVerdict normalizes legacy headings and lines to new wording", () => {
  const review = normalizeFinalReviewVerdict(`## 上会状态
上会结论：可上会

## 上线建议
上线建议：可以上线/放量`, {
    judgeDecision: { verdictRisk: "pass" },
    outputLanguage: "zh"
  });

  assert.match(review, /^## 组内准入\n组内准入：是/m);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：通过/);
  assert.doesNotMatch(review, /## 上会状态|## 上线建议/);
});

test("normalizeFinalReviewVerdict does not derive admission rejection from blocked verdict", () => {
  const review = normalizeFinalReviewVerdict(`## Review Verdict
结论：可以通过

## P0 Blockers
存在 P0。`, {
    judgeDecision: { verdictRisk: "blocked" },
    outputLanguage: "zh"
  });

  assert.match(review, /^## 组内准入\n组内准入：是/m);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：不通过/);
  assert.doesNotMatch(review, /组内准入：否|准入结论：需先补齐|准入结论：打回/);
});

test("normalizeFinalReviewVerdict honors explicit admission rejection", () => {
  const review = normalizeFinalReviewVerdict(`## 上会状态
上会结论：可上会

## 上线建议
上线建议：可以上线/放量`, {
    judgeDecision: { verdictRisk: "Conditional Pass", admissionRisk: "return" },
    outputLanguage: "zh"
  });

  assert.match(review, /^## 组内准入\n组内准入：否/m);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：有条件通过/);
});

test("normalizeFinalReviewVerdict inserts missing English group admission", () => {
  const review = normalizeFinalReviewVerdict(`## Review Verdict
Verdict: Pass

## P0 Blockers
None.`, {
    judgeDecision: { verdictRisk: "blocked" },
    outputLanguage: "en"
  });

  assert.match(review, /^## Group Admission\nGroup Admission: Yes/m);
  assert.match(review, /## Simulated Review Result\nSimulated Review Result: Fail/);
});

test("normalizeFinalReviewVerdict separates glued admission and verdict headings", () => {
  const review = normalizeFinalReviewVerdict(`## Reviewability Check
准入结论：准入## Review Verdict
结论：可以通过

## P0 Blockers
存在 P0。`, {
    judgeDecision: { verdictRisk: "blocked" },
    outputLanguage: "zh"
  });

  assert.match(review, /^## 组内准入\n组内准入：是/m);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：不通过/);
  assert.doesNotMatch(review, /准入##|可上会##|Review Verdict/);
});

test("normalizeFinalReviewVerdict softens blocker language in non-blocking P1 sections", () => {
  const review = normalizeFinalReviewVerdict(`## Review Verdict
结论：有条件通过

## P0 Blockers
无。

## P1 Questions
1. 若无明确埋点/metric ID 则无法验证、监控或提供回滚信号，阻断审批与上线决策。

## P1/P2 Improvement Suggestions
- 将该交付列为上线阻塞项，直到至少有兼容方案与验证路径。`, {
    judgeDecision: { verdictRisk: "Conditional Pass" },
    outputLanguage: "zh"
  });

  assert.match(review, /模拟评审结果：有条件通过/);
  assert.doesNotMatch(review, /阻断审批与上线决策/);
  assert.doesNotMatch(review, /上线阻塞项/);
  assert.match(review, /影响后续验收与上线判断/);
  assert.match(review, /上线前需确认项/);
});

test("normalizeFinalReviewVerdict hides downgraded candidate P0 diagnostics from user output", () => {
  const review = normalizeFinalReviewVerdict(`## 上会状态
准入结论：准入
说明：PRD 可以进入组内讨论。## Review Verdict
结论：有条件通过

## P0 Blockers
issue_1 (measurement_failure) 被降级，理由：相关嵌入式仪表盘或指标资源未展开，因而缺失指标定义尚不足以证明为审批门控 (dashboard_metric_may_exist_in_unexpanded_resource)。
- issue_1 (measurement_failure) 被降级。
证据引用：chunk_1_missing_1, chunk_1_fact_10

issue_2 (delivery_viability_failure) 被降级，理由：该问题未能证明属于会直接阻止组内通过的 P0 类别 (category_specific_blocker_not_proven)。

## P1 Questions
PRD 未明确主成功度量、基线与量化通过/回滚阈值，如何判定上线成功？

证据引用：chunk_1_missing_1, chunk_1_fact_10
影响说明：缺少 primary KPI、基线与埋点口径，会影响后续验收与上线判断。`, {
    judgeDecision: { verdictRisk: "Conditional Pass" },
    outputLanguage: "zh"
  });

  assert.match(review, /## 组内准入\n组内准入：是/);
  assert.match(review, /## 模拟评审结果\n模拟评审结果：有条件通过/);
  assert.match(review, /## P0 Blockers\n无 P0 阻断问题/);
  assert.match(review, /PRD 未明确主成功度量/);
  assert.doesNotMatch(review, /Review Verdict|准入结论：准入/);
  assert.doesNotMatch(review, /issue_\d|chunk_\d|measurement_failure|delivery_viability_failure/);
  assert.doesNotMatch(review, /dashboard_metric_may_exist_in_unexpanded_resource|category_specific_blocker_not_proven|证据引用/);
});
