import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  PRODUCT_REVIEW_CALIBRATION_PROMPT,
  calibrateIssueSeverity,
  isLikelyStatisticalAuditFollowup,
  isLikelyTechnicalExecutionDetail
} from "../src/productReviewCalibration.mjs";

const GOLD_SET = JSON.parse(fs.readFileSync(new URL("./fixtures/productReviewCalibrationGoldSet.json", import.meta.url), "utf8"));

test("product review calibration prompt favors product blockers over technical audit items", () => {
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /metric口径|metric definition/);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /formal A\/B launch\/ramp decisions/);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /statistical follow-ups by default/);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /SLA|QPS|runbook|on-call/);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /default to P1\/P2/i);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /monitoring or recap dashboards/i);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /launch, ramp, settlement, SOT, or resource decision gate/i);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /pass with Todo/i);
  assert.match(PRODUCT_REVIEW_CALIBRATION_PROMPT, /trigger timing, frequency cap, exit rule/i);
});

test("isLikelyTechnicalExecutionDetail detects execution-only review items", () => {
  assert.equal(isLikelyTechnicalExecutionDetail({
    question: "实时生成服务的 QPS、延迟 SLA、告警阈值和 on-call runbook 是否明确？",
    severityReason: "这些技术配置缺失会影响服务稳定性。",
    recommendedRevision: "补充 QPS、延迟、超时重试、监控告警、on-call 和 runbook。"
  }), true);
});

test("isLikelyTechnicalExecutionDetail does not treat metric口径 or experiment design as technical drift", () => {
  assert.equal(isLikelyTechnicalExecutionDetail({
    question: "活动中心 DAU 增长口径、活动后留存和叠加 AB 实验剔除方式是什么？",
    severityReason: "如果口径不清，无法判断活动是否真的带来增长。",
    recommendedRevision: "补充大盘指标、活动期 AA 增长、活动后留存和叠加实验剔除规则。"
  }), false);
});

test("isLikelyStatisticalAuditFollowup detects significance-only experiment audit items", () => {
  assert.equal(isLikelyStatisticalAuditFollowup({
    question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
    severityReason: "没有这些统计参数会影响实验分析。",
    recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
  }), true);
});

test("calibrateIssueSeverity downgrades significance-only measurement P0 to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_stats",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
    severityReason: "没有这些统计参数会影响实验分析。",
    recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
  assert.match(calibrated.calibrationReason, /statistical audit/i);
});

test("calibrateIssueSeverity downgrades experiment statistics matrix without explicit formal gate", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_stats_audit",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "缺少 AB/实验判定矩阵（主指标口径、显著性、MDE、最小样本量、最短窗口与停止规则），何时判定成功并推进放量？",
    severityReason: "PRD 提到 AB 与灰度，但统计判定细节未完整展开。",
    recommendedRevision: "补充主指标口径、alpha、MDE、样本量、观察窗口和停止规则。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades technical execution-only P0 to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_ai_ops",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "ML 服务延迟、QPS、告警和 runbook 是否明确？",
    severityReason: "PRD 未写 SLA 和 on-call。",
    recommendedRevision: "补充延迟 SLA、QPS 成本上限、监控告警、自动重试和 runbook。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
  assert.match(calibrated.calibrationReason, /technical execution detail/i);
});

test("calibrateIssueSeverity downgrades tracking schema gaps to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_tracking_schema",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "完整埋点规范是否明确，包括弹窗曝光、点击、订阅和 toast 事件清单？",
    severityReason: "缺少事件清单、属性和目标表会影响数据验收，但不等于核心业务口径缺失。",
    recommendedRevision: "补充事件名、触发时机、必填属性、目标表、owner、验收 SQL 和上报异常监控。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
  assert.match(calibrated.calibrationReason, /tracking implementation/i);
});

test("calibrateIssueSeverity downgrades channel integration readiness P0 to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_channel_integration_ready",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "TikTok LIVE 官方商业账号是否已完成对接并具备向所列渠道发信的技术集成、权限与测试凭证？若未完成，有无可执行回退方案？",
    severityReason: "若关键渠道未集成或无权限，核心触达能力不可交付，无法实现自动识别并触达未参与主播。",
    recommendedRevision: "补充官方账号、渠道权限、测试凭证、集成 owner、排期和 fallback。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades release rollout checklist gaps to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_0528_new_release_rollout",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "发布范围、灰度分阶段计划、回滚触发条件和责任人是否明确？",
    severityReason: "PRD 标注 ASAP，但未给出灰度步骤和回滚 owner，存在上线管理风险。",
    recommendedRevision: "补充首发范围、灰度步骤、观测窗口、回滚阈值和责任人。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades launch date and material owner readiness to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_0528_tw_ranking_readiness",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "最终上线日期、关键素材交付责任、接口验收与回退机制是否统一锁定？",
    severityReason: "缺少上线日期、素材 owner、接口 owner 和验收安排会影响排期管理，但尚未证明核心 MIX 规则不可交付。",
    recommendedRevision: "补充上线日期、素材/接口 owner、验收标准和回退方案。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity keeps product timing and frequency strategy contradictions as P0", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_0528_popup_strategy",
    severity: "P0",
    p0Category: "direction_failure",
    question: "首次进入活动中心就弹窗、每 30 天触达和累计 3 次退出策略之间的业务逻辑是什么？",
    severityReason: "触发时机没有绑定用户看到活动价值的场景，且 30 天品控与 3 次永久退出逻辑冲突，无法判断方案是否合理。",
    recommendedRevision: "重写弹窗触发策略：基于浏览 banner、reward、signup 等价值感知行为触发，并明确频控与退出规则。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "direction_failure");
});

test("calibrateIssueSeverity downgrades message template and fallback readiness P0 to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_template_fallback_ready",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "消息模板、文案审批和发送失败 fallback 是否明确？",
    severityReason: "缺少模板和 fallback 会影响消息发送。",
    recommendedRevision: "补充模板、审批和 fallback。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades readiness-section-only P0 to P1", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_readiness_sections",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "PRD 是否补充验收标准、风险依赖和上线 checklist owner？",
    severityReason: "缺少这些章节会影响文档完整度。",
    recommendedRevision: "补充验收标准、风险依赖和 checklist owner。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
  assert.match(calibrated.calibrationReason, /readiness/i);
});

test("calibrateIssueSeverity downgrades monitoring and runbook P0 even when generic launch words appear", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_monitoring",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "谁负责实时监控与告警？缺少关键看板、SOT、告警阈值与值班/应急流程。",
    severityReason: "无明确监控/告警与责任会影响灰度放量、归因与上线决策。",
    recommendedRevision: "补充监控章：定义单一事实来源、必备看板、刷新频率、告警阈值、on-call 人员与 runbook。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity keeps launch safety P0 when user-facing risk is explicit", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_safety",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "AI 文案是否有人审与合规门禁，避免不当内容直接触达主播？",
    severityReason: "没有人工审核与合规门禁会导致不安全内容上线触达用户。",
    recommendedRevision: "补充人工审核、合规审批、违规内容拦截和回滚机制。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "launch_safety_failure");
});

test("calibrateIssueSeverity downgrades Legal Ticket blanks without explicit safety gate", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_legal_checklist",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "Legal/合规审批与具体审查要求未列明（Legal Ticket 空），何时满足合规可开始灰度/放量？",
    severityReason: "Legal Ticket 为空，需要补充审批状态。",
    recommendedRevision: "补充 Legal Ticket、检查清单、签署人和 SLA。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades cross-border opt-in approval follow-ups without explicit unsafe launch", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_cross_border_opt_in",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "各目标地区（含日本）是否已取得使用官方账号主动触达、数据跨境与创作者同意等合规批准？",
    severityReason: "缺少逐地区合规批准时，跨区主动外呼与跨境数据使用可能被限制发送或招致法律/监管处罚。",
    recommendedRevision: "补充各地区合规批准、opt-in 证据与数据跨境审批记录。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity keeps legal TnS and cross-border approval risks as launch safety P0", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_legal_tns",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "法务/内容安全与跨境部署审批（Legal Ticket、TnS SLA）是否已完成？",
    severityReason: "没有 Legal 与 TnS 审批结论会导致上线门禁缺失。",
    recommendedRevision: "补充 Legal Ticket 状态、TnS SLA、跨境托管审查结果与负责人。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "launch_safety_failure");
});

test("calibrateIssueSeverity downgrades dashboard implementation gaps when metrics are already listed", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_dashboard_details",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "看板已列出圈选主播UV、触达主播UV和营收收入等指标，但数据源、SQL、刷新频率、owner 和验收样例是否明确？",
    severityReason: "这些信息影响数据交付效率，但指标列表和业务定义已在嵌入表格中给出。",
    recommendedRevision: "补充数据源表、示例 SQL、刷新频率、owner 和验收样例。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity downgrades monitoring dashboard metric convergence gaps when metrics are already listed", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_dashboard_monitoring_metric_convergence",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "日常监控看板已列出圈选主播UV、触达主播UV、营收收入和组件曝光点击等指标，但核心验收指标、MOY baseline 对比口径和归因窗口是否收敛？",
    severityReason: "这些口径会影响复盘解释一致性，但 PRD 已有指标表，且未说明该看板是放量、结算或上线门禁。",
    recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
  assert.match(calibrated.calibrationReason, /dashboard monitoring metric convergence/i);
});

test("calibrateIssueSeverity keeps dashboard decision gates found in bridge fields as P0", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_dashboard_bridge_decision_gate",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "日常监控看板已列出圈选主播UV、触达主播UV和营收收入等指标，但核心验收指标、baseline 对比口径和归因窗口是否收敛？",
    severityReason: "这些口径会影响复盘解释一致性。",
    recommendedRevision: "补充主验收指标、baseline 对比公式、聚合维度和归因窗口。",
    blockedOutcome: "上线门禁无法判断是否允许上线。",
    affectedPath: "SOT / single source of truth 看板用于资源分配决策。",
    whyReviewCannotPass: "approval gate 依赖该看板，主指标缺失会阻断审批。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "measurement_failure");
});

test("calibrateIssueSeverity keeps decision-critical dashboard metric ambiguity as P0", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_dashboard_decision_metric",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "战情看板用于放量和结算决策，但核心营收口径、分母、基线和归因窗口缺失，如何判断成败？",
    severityReason: "看板是放量/结算门槛，核心口径缺失会让决策无法解释。",
    recommendedRevision: "补充核心营收口径、分母、基线、归因窗口和放量决策阈值。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "measurement_failure");
});

test("calibrateIssueSeverity downgrades ranking boundary-rule followups when core rules are present", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_revival_boundary",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "复活赛已明确复赛淘汰主播、金木水火土榜、各复活3人和Top3写入决赛，但同分、跨榜去重、异常纠错和结算时点是否明确？",
    severityReason: "这些边界会影响对账和运营处理，但核心晋级规则已经明确。",
    recommendedRevision: "补充同分、跨榜去重、异常纠错、结算时点和人工修正规则。"
  });

  assert.equal(calibrated.severity, "P1");
  assert.equal(calibrated.p0Category, null);
});

test("calibrateIssueSeverity keeps ranking rules that change winners or rewards as P0", () => {
  const calibrated = calibrateIssueSeverity({
    issueId: "issue_revival_winner_change",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "复活赛缺少排序指标和同分规则，且同分会直接改变Top3、晋级名单和奖励归属，如何保证公开榜单公平？",
    severityReason: "规则缺失会改变获奖/晋级结果，导致公开榜单不可信。",
    recommendedRevision: "补充排序指标、同分规则、奖励归属规则和可复现名单生成逻辑。"
  });

  assert.equal(calibrated.severity, "P0");
  assert.equal(calibrated.p0Category, "launch_safety_failure");
});

for (const item of GOLD_SET) {
  test(`product review calibration gold set: ${item.caseId}`, () => {
    const calibrated = calibrateIssueSeverity(item.issue);
    assert.equal(calibrated.severity, item.expectedSeverity);
  });
}
