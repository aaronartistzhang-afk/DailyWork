import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  applyP0Gatekeeper,
  evaluateP0Gate
} from "../src/p0Gatekeeper.mjs";

const REVIEW_LEVEL_GOLD_SET = JSON.parse(fs.readFileSync(
  new URL("./fixtures/p0GatekeeperReviewLevelGoldSet.json", import.meta.url),
  "utf8"
));

test("evaluateP0Gate keeps metric口径 and attribution ambiguity as measurement P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_metric",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "活动参与率的分母、基线、AB 归因和活动后留存窗口是什么？",
    evidenceRefs: ["missing_metric"],
    severityReason: "没有口径和归因规则，活动成败无法解释。",
    recommendedRevision: "补充分母、基线、AB 剔除和留存窗口。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_metric", category: "measurement", claim: "Metric denominator and attribution are missing." }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "measurement_success_uninterpretable");
});

test("evaluateP0Gate downgrades significance-only measurement details to P1", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_stats",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "AB 实验的样本量、显著性水平和 MDE 是否明确？",
    evidenceRefs: ["missing_stats"],
    severityReason: "没有这些统计参数会导致实验成败无法判断。",
    recommendedRevision: "补充样本量、显著性水平、MDE 和功效分析。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_stats", category: "measurement", claim: "Sample size and significance level are missing." }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "statistical_audit_without_decision_blocker");
});

test("evaluateP0Gate keeps formal experiment decision blockers as measurement P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_formal_experiment",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "正式 AB 放量决策缺少主指标、随机化单位、污染处理和归因窗口，怎么判断是否替代旧策略？",
    evidenceRefs: ["missing_experiment_decision"],
    severityReason: "实验结论作为放量门槛，但缺少分流和归因口径会让成败无法解释。",
    recommendedRevision: "补充 primary metric、随机化单位、污染处理、归因窗口和放量门槛。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_experiment_decision", category: "measurement", claim: "Formal experiment launch decision lacks primary metric and randomization unit.", approvalImpact: "approval_blocking" }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "measurement_success_uninterpretable");
});

test("evaluateP0Gate downgrades experiment statistics when evidence is not approval-blocking", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_stats_audit",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "缺少 AB/实验判定矩阵（主指标口径、显著性、MDE、最小样本量、最短窗口与停止规则），何时判定成功并推进放量？",
    evidenceRefs: ["missing_stats"],
    severityReason: "PRD 提到 AB 与灰度，但统计判定细节未完整展开。",
    recommendedRevision: "补充主指标口径、alpha、MDE、样本量、观察窗口和停止规则。"
  }, {
    factLedger: factLedgerWith({
      facts: [{ factId: "fact_ab", category: "experiment", claim: "The PRD mentions AB testing and staged rollout." }],
      missingFacts: [{ missingFactId: "missing_stats", category: "measurement", claim: "Experiment statistics are not specified.", approvalImpact: "follow_up" }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "statistical_audit_without_approval_blocking_evidence");
});

test("evaluateP0Gate downgrades technical details even when wrapped as measurement failure", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_pipeline",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "数仓 pipeline、字段映射、缓存刷新频率和补数 runbook 是否明确？",
    evidenceRefs: ["missing_pipeline"],
    severityReason: "没有这些技术细节会影响数据维护。",
    recommendedRevision: "补充 pipeline、字段映射、缓存刷新和补数 runbook。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_pipeline", category: "data", claim: "Pipeline and field mapping are missing." }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "technical_detail_without_product_blocker");
});

test("evaluateP0Gate downgrades tracking schema gaps even when wrapped as conversion measurement failure", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_tracking_schema",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "PRD 缺少完整埋点规范（曝光/点击/订阅/toast 等），是否会导致弹窗到订阅的转化链路不可核验？",
    evidenceRefs: ["missing_tracking_schema"],
    severityReason: "缺少事件清单、属性和目标表会影响转化验收，但属于上线前实现与数据验收细节。",
    recommendedRevision: "补充事件名、触发时机、必填属性、目标表、owner、验收 SQL 和上报异常监控。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_tracking_schema",
        category: "measurement",
        claim: "Tracking event schema, properties, target table, owner, and acceptance SQL are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "tracking_implementation_followup");
});

test("evaluateP0Gate downgrades SQL and data table implementation details with a stable reason", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_sql_table_details",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "SQL 样例、数据表、字段映射、刷新频率、owner 和验收样例是否明确？",
    evidenceRefs: ["missing_sql_table_details"],
    severityReason: "缺少这些数据表交付细节会影响后续数仓验收，但不等于核心业务指标口径缺失。",
    recommendedRevision: "补充源表/目标表、字段映射、示例 SQL、刷新频率、owner 和验收样例。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_sql_table_details",
        category: "data",
        claim: "Source table, target table, SQL sample, field mapping, refresh cadence, owner, and acceptance sample are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "data_table_sql_implementation_followup");
});

test("evaluateP0Gate does not accept reviewer wording as a product bridge", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_ops_worded_as_launch_blocker",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "SOT 看板、告警阈值、runbook 和 fallback 是否明确？",
    evidenceRefs: ["missing_ops"],
    severityReason: "缺少这些会影响用户触达核心链路，导致无法上线。",
    recommendedRevision: "补充 SOT 看板、告警阈值、runbook 和 fallback。",
    blockedOutcome: "无法上线",
    affectedPath: "用户触达核心链路",
    whyReviewCannotPass: "fallback 和 runbook 未明确。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_ops",
        category: "ops",
        claim: "SOT dashboard, alert thresholds, runbook, and fallback are not documented."
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "technical_detail_without_product_blocker");
});

test("evaluateP0Gate keeps direct user rollback and compliance risk as launch safety P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_launch_safety",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "AI 文案直接触达主播前是否有人审、合规拦截和回滚机制？",
    evidenceRefs: ["missing_safety"],
    severityReason: "缺少审核和回滚会让不当内容直接触达用户。",
    recommendedRevision: "补充人审、合规拦截、停止触达和回滚机制。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_safety", category: "safety", claim: "Human review and rollback are missing." }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "launch_safety_user_risk");
});

test("evaluateP0Gate downgrades Legal ticket blanks when evidence is only a launch checklist follow-up", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_legal_checklist",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "Legal/合规审批与具体审查要求未列明（Legal Ticket 空），何时满足合规可开始灰度/放量？",
    evidenceRefs: ["missing_legal"],
    severityReason: "Legal Ticket 为空，需要补充审批状态。",
    recommendedRevision: "补充 Legal Ticket、检查清单、签署人和 SLA。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_legal", category: "governance", claim: "Legal Ticket is empty.", approvalImpact: "follow_up" }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "legal_checklist_without_launch_gate");
});

test("evaluateP0Gate downgrades cross-border opt-in approval questions without approval-blocking evidence", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_cross_border_opt_in",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "各目标地区（含日本）是否已取得使用官方账号主动触达、数据跨境与创作者同意等合规批准？",
    evidenceRefs: ["missing_cross_border_approval"],
    severityReason: "缺少逐地区合规批准时，跨区主动外呼与跨境数据使用可能被限制发送或招致法律/监管处罚。",
    recommendedRevision: "补充各地区合规批准、opt-in 证据与数据跨境审批记录。",
    blockedOutcome: "缺乏逐地区合规证据会导致区域性禁发、下线或法律制裁，项目无法安全上线。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_cross_border_approval",
        category: "compliance",
        claim: "Regional compliance approval and creator opt-in evidence are not documented."
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "legal_checklist_without_launch_gate");
});

test("evaluateP0Gate downgrades rollout and rollback checklist gaps without direct unsafe launch evidence", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_0528_new_release_rollout",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "发布范围、灰度分阶段计划、回滚触发条件和责任人是否明确？",
    evidenceRefs: ["missing_rollout_checklist"],
    severityReason: "PRD 标注 ASAP，但未给出灰度步骤和回滚 owner，存在上线管理风险。",
    recommendedRevision: "补充首发范围、灰度步骤、观测窗口、回滚阈值和责任人。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_rollout_checklist",
        category: "launch",
        claim: "Rollout scope, staged gray release plan, rollback threshold, and owner are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "release_readiness_without_direct_unsafe_launch");
});

test("evaluateP0Gate downgrades launch date and material owner readiness without proven blocked delivery", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_0528_tw_ranking_readiness",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "最终上线日期、关键素材交付责任、接口验收与回退机制是否统一锁定？",
    evidenceRefs: ["missing_delivery_plan"],
    severityReason: "缺少上线日期、素材 owner、接口 owner 和验收安排会影响排期管理，但尚未证明核心 MIX 规则不可交付。",
    recommendedRevision: "补充上线日期、素材/接口 owner、验收标准和回退方案。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_core_mix_rules",
        category: "rule",
        claim: "The MIX rules specify opening animation and revival Top3 list writing logic."
      }],
      missingFacts: [{
        missingFactId: "missing_delivery_plan",
        category: "delivery",
        claim: "Launch date, material owner, interface acceptance, and rollback plan are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "delivery_readiness_without_proven_blocked_launch");
});

test("evaluateP0Gate keeps product timing and frequency strategy contradictions as direction P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_0528_popup_strategy",
    severity: "P0",
    p0Category: "direction_failure",
    question: "首次进入活动中心就弹窗、每 30 天触达和累计 3 次退出策略之间的业务逻辑是什么？",
    evidenceRefs: ["missing_popup_strategy"],
    severityReason: "触发时机没有绑定用户看到活动价值的场景，且 30 天品控与 3 次永久退出逻辑冲突，无法判断方案是否合理。",
    recommendedRevision: "重写弹窗触发策略：基于浏览 banner、reward、signup 等价值感知行为触发，并明确频控与退出规则。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_popup_strategy",
        category: "strategy",
        claim: "Popup trigger timing and exit strategy logic are not coherent."
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "direction_resource_guardrail_missing");
});

test("evaluateP0Gate keeps traffic and resource exceptions without guardrails as direction P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_resource",
    severity: "P0",
    p0Category: "direction_failure",
    question: "申请活动中心资源位和额外流量时，收益目标、负向影响和退出规则是什么？",
    evidenceRefs: ["missing_guardrail"],
    severityReason: "没有资源例外护栏，无法判断方向是否合理。",
    recommendedRevision: "补充资源准入、收益目标、guardrail 和退出规则。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_guardrail", category: "strategy", claim: "Resource guardrail is missing." }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "direction_resource_guardrail_missing");
});

test("evaluateP0Gate downgrades unconfirmed core dependency when blocked launch is not proven", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_core_path",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "核心通知生成依赖未确认，是否会导致运营创建活动后无法生成并发送通知？",
    evidenceRefs: ["missing_dependency"],
    severityReason: "如果依赖不可用，运营核心触达链路无法上线。",
    recommendedRevision: "补充核心依赖 owner、不可用 fallback 和上线门禁。",
    blockedOutcome: "运营无法生成和发送活动通知",
    affectedPath: "活动创建到主播触达的核心链路",
    bridgeEvidenceRefs: ["missing_dependency"],
    whyReviewCannotPass: "核心触达链路不可用时方案不能上线"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{ missingFactId: "missing_dependency", category: "dependency", claim: "Core notification generation dependency is not confirmed." }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "delivery_readiness_without_proven_blocked_launch");
});

test("evaluateP0Gate keeps delivery P0 only when the launch path is proven blocked", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_core_path_blocked",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "唯一触达链路已确认不可用且没有可用 fallback，如何上线？",
    evidenceRefs: ["blocked_dependency"],
    severityReason: "唯一触达链路不可用且没有 fallback，运营无法生成和发送活动通知。",
    recommendedRevision: "补充可用替代链路或推迟上线。",
    blockedOutcome: "唯一触达链路不可用且无可用 fallback",
    affectedPath: "活动创建到主播触达的核心链路",
    bridgeEvidenceRefs: ["blocked_dependency"],
    whyReviewCannotPass: "没有可用 fallback 时核心触达链路无法上线"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "blocked_dependency",
        category: "dependency",
        claim: "The only launch path is unavailable and no fallback is documented.",
        approvalImpact: "approval_blocking"
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "delivery_core_path_blocked");
});

test("evaluateP0Gate downgrades channel integration readiness questions without proven blocked launch", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_channel_integration_ready",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "平台官方商业账号是否已完成对接并具备向所列渠道发信的技术集成、权限与测试凭证？若未完成，有无可执行回退方案？",
    evidenceRefs: ["missing_channel_integration_status"],
    severityReason: "若关键渠道未集成或无权限，核心触达能力不可交付，无法实现自动识别并触达未参与主播，项目目标/指标无法达成。",
    recommendedRevision: "补充官方账号、渠道权限、测试凭证、集成 owner、排期和 fallback。",
    blockedOutcome: "若关键渠道未集成或无权限，核心触达能力不可交付。",
    affectedPath: "外部渠道触达链路",
    bridgeEvidenceRefs: ["missing_channel_integration_status"],
    whyReviewCannotPass: "无法证明自动触达链路可以按期交付。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_channel_integration_status",
        category: "delivery",
        claim: "Official business account integration, channel permissions, and test credentials are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "integration_readiness_without_proven_blocked_launch");
});

test("evaluateP0Gate downgrades message template and fallback readiness without proven blocked launch", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_template_fallback_ready",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "消息模板、文案审批和发送失败 fallback 是否明确？",
    evidenceRefs: ["missing_template_fallback"],
    severityReason: "缺少模板和 fallback 会影响消息发送。",
    recommendedRevision: "补充模板、审批和 fallback。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_template_fallback",
        category: "delivery",
        claim: "Message template and fallback are not documented.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "delivery_readiness_without_proven_blocked_launch");
});

test("evaluateP0Gate downgrades acceptance or risk section gaps without product blocker", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_acceptance",
    severity: "P0",
    p0Category: "delivery_viability_failure",
    question: "验收标准、风险依赖和上线 checklist 是否完整？",
    evidenceRefs: ["missing_acceptance"],
    severityReason: "缺少验收章节会影响文档完整度。",
    recommendedRevision: "补充验收标准和风险依赖。",
    blockedOutcome: "文档不完整。",
    affectedPath: "评审材料。",
    bridgeEvidenceRefs: ["missing_acceptance"],
    whyReviewCannotPass: "缺少验收章节。"
  }, {
    factLedger: factLedgerWith({
      facts: [{ factId: "fact_goal", category: "objective", claim: "Goal and launch path are present." }],
      missingFacts: [{
        missingFactId: "missing_acceptance",
        category: "risk",
        claim: "Acceptance criteria and risk dependency section are missing.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "readiness_section_without_product_blocker");
});

test("evaluateP0Gate downgrades dashboard data implementation gaps when embedded metrics are covered", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_dashboard_details",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "看板已列出圈选主播UV、触达主播UV和营收收入等指标，但数据源、SQL、刷新频率、owner 和验收样例是否明确？",
    evidenceRefs: ["fact_embedded_metrics", "missing_dashboard_details"],
    severityReason: "这些信息影响数据交付效率，但指标列表和业务定义已在嵌入表格中给出。",
    recommendedRevision: "补充数据源表、示例 SQL、刷新频率、owner 和验收样例。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_embedded_metrics",
        category: "dashboard",
        claim: "Embedded Sheet lists selected creator UV, reached creator UV, revenue USD, and metric definitions.",
        sourceRef: "sheet:e9LMNf"
      }],
      missingFacts: [{
        missingFactId: "missing_dashboard_details",
        category: "dashboard",
        claim: "Data source, SQL, refresh cadence, owner, and acceptance sample are not specified.",
        approvalImpact: "follow_up"
      }],
      resourceCoverage: [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded", summary: "Metric table expanded." }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "dashboard_implementation_followup");
});

test("evaluateP0Gate downgrades dashboard metric gaps when a relevant embedded sheet was not expanded", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_unexpanded_dashboard_metrics",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "看板核心指标口径缺失，如何判断营收、触达和转化成败？",
    evidenceRefs: ["missing_dashboard_metrics"],
    severityReason: "缺少核心指标口径会导致看板成败无法判断。",
    recommendedRevision: "补充核心指标表、分母、基线、归因窗口和示例 SQL。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_dashboard_metrics",
        category: "measurement",
        claim: "Dashboard metric definitions are not available in the extracted text.",
        approvalImpact: "approval_blocking"
      }],
      unexpandedResources: [{
        resourceId: "sheet:e9LMNf",
        type: "sheet",
        status: "not_expanded",
        reason: "Embedded sheet near Metrics section was not expanded."
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "dashboard_metric_may_exist_in_unexpanded_resource");
});

test("evaluateP0Gate downgrades monitoring dashboard metric convergence when expanded metric sheet exists", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_live_moment_dashboard_metrics",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "Campaign 日常监控看板已有指标表，但核心验收指标、MOY baseline 对比口径和归因窗口未完全收敛，如何判断营收、触达和转化成败？",
    evidenceRefs: ["fact_embedded_metrics", "fact_monitoring_dashboard", "missing_metric_convergence"],
    severityReason: "缺少这些收敛口径会影响复盘解释一致性，但不等于看板不可上线。",
    recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。",
    blockedOutcome: "复盘解释一致性不足",
    affectedPath: "运营查看活动监控和复盘看板",
    bridgeEvidenceRefs: ["missing_metric_convergence"],
    whyReviewCannotPass: "需要补充口径后才能解释成败。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_embedded_metrics",
        category: "dashboard",
        claim: "Expanded embedded sheet lists selected creator UV, reached creator UV, registration UV, revenue USD, ARPPU, paid conversion, component exposure PV/UV, click PV/UV, priorities, dimensions, and definitions."
      }, {
        factId: "fact_monitoring_dashboard",
        category: "dashboard",
        claim: "The PRD says the dashboard supports daily campaign monitoring and recap comparison with MOY baseline."
      }],
      missingFacts: [{
        missingFactId: "missing_metric_convergence",
        category: "measurement",
        claim: "Core acceptance metric, MOY baseline comparison formula, aggregation dimension, and attribution window need convergence.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "dashboard_monitoring_metric_convergence_followup");
});

test("evaluateP0Gate recognizes Chinese expanded metric table evidence for monitoring dashboard followups", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_live_moment_dashboard_cn_metrics",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "Campaign 日常监控看板已有指标表，但核心验收指标、MOY baseline 对比口径和归因窗口未完全收敛，如何判断营收、触达和转化成败？",
    evidenceRefs: ["fact_cn_embedded_metrics", "fact_monitoring_dashboard", "missing_metric_convergence"],
    severityReason: "缺少这些收敛口径会影响复盘解释一致性，但不等于看板不可上线。",
    recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_cn_embedded_metrics",
        category: "dashboard",
        claim: "嵌入表格中给出了圈选主播UV、触达主播UV、营收收入、组件曝光点击等指标定义和优先级。"
      }, {
        factId: "fact_monitoring_dashboard",
        category: "dashboard",
        claim: "PRD 说明该看板用于活动效果日常监控与 MOY baseline 复盘对比。"
      }],
      missingFacts: [{
        missingFactId: "missing_metric_convergence",
        category: "measurement",
        claim: "Core acceptance metric, MOY baseline comparison formula, aggregation dimension, and attribution window need convergence.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "dashboard_monitoring_metric_convergence_followup");
});

test("evaluateP0Gate uses expanded metric resource coverage when metric fact is not cited", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_live_moment_dashboard_resource_coverage",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "Campaign 日常监控看板的核心验收指标、MOY baseline 对比口径和归因窗口未完全收敛，如何判断营收、触达和转化成败？",
    evidenceRefs: ["fact_monitoring_dashboard", "missing_metric_convergence"],
    severityReason: "缺少这些收敛口径会影响复盘解释一致性，但不等于看板不可上线。",
    recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_monitoring_dashboard",
        category: "dashboard",
        claim: "PRD 说明该看板用于活动效果日常监控与 MOY baseline 复盘对比。"
      }],
      missingFacts: [{
        missingFactId: "missing_metric_convergence",
        category: "measurement",
        claim: "Core acceptance metric, MOY baseline comparison formula, aggregation dimension, and attribution window need convergence.",
        approvalImpact: "follow_up"
      }],
      resourceCoverage: [{
        resourceId: "sheet:metrics",
        type: "sheet",
        status: "expanded",
        summary: "嵌入指标表已展开，给出了圈选主播UV、触达主播UV、营收收入、组件曝光点击等指标定义。"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "dashboard_monitoring_metric_convergence_followup");
});

test("evaluateP0Gate does not treat unrelated expanded resources as metric coverage", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_live_moment_dashboard_unrelated_resource",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "Campaign 日常监控看板的核心验收指标、MOY baseline 对比口径和归因窗口未完全收敛，如何判断营收、触达和转化成败？",
    evidenceRefs: ["fact_monitoring_dashboard", "missing_metric_convergence"],
    severityReason: "缺少这些收敛口径会影响复盘解释一致性，但不等于看板不可上线。",
    recommendedRevision: "补充主验收指标、MOY baseline 对比公式、聚合维度和归因窗口。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_monitoring_dashboard",
        category: "dashboard",
        claim: "PRD 说明该看板用于活动效果日常监控与 MOY baseline 复盘对比。"
      }],
      missingFacts: [{
        missingFactId: "missing_metric_convergence",
        category: "measurement",
        claim: "Core acceptance metric, MOY baseline comparison formula, aggregation dimension, and attribution window need convergence.",
        approvalImpact: "follow_up"
      }],
      resourceCoverage: [{
        resourceId: "sheet:metrics",
        type: "sheet",
        status: "expanded",
        summary: "附件已展开，内容是项目排期与运营动作记录。"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "technical_detail_without_product_blocker");
});

test("evaluateP0Gate keeps decision-critical dashboard metric ambiguity as measurement P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_dashboard_decision_metric",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "战情看板用于放量和结算决策，但核心营收口径、分母、基线和归因窗口缺失，如何判断成败？",
    evidenceRefs: ["missing_decision_metric"],
    severityReason: "看板是放量/结算门槛，核心口径缺失会让决策无法解释。",
    recommendedRevision: "补充核心营收口径、分母、基线、归因窗口和放量决策阈值。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_decision_metric",
        category: "measurement",
        claim: "Decision-critical dashboard lacks revenue denominator, baseline, and attribution window.",
        approvalImpact: "approval_blocking"
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "measurement_success_uninterpretable");
});

test("evaluateP0Gate keeps SOT dashboard metric ambiguity as P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_sot_dashboard_metric",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "该看板作为 SOT / single source of truth 用于资源分配决策，但主指标、baseline 和归因窗口缺失，如何判断投放与资源倾斜？",
    evidenceRefs: ["fact_sot_gate", "missing_sot_metric"],
    severityReason: "SOT 看板直接影响资源分配，核心口径缺失会让决策无法解释。",
    recommendedRevision: "补充主指标、baseline、归因窗口和资源分配决策阈值。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_sot_gate",
        category: "dashboard",
        claim: "Dashboard is the source of truth for campaign resource allocation decisions."
      }],
      missingFacts: [{
        missingFactId: "missing_sot_metric",
        category: "measurement",
        claim: "Primary metric, baseline, and attribution window are missing for a source-of-truth decision dashboard.",
        approvalImpact: "approval_blocking"
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "measurement_success_uninterpretable");
});

test("evaluateP0Gate keeps approval-blocking dashboard metric gaps even when metrics are expanded", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_dashboard_approval_blocking_metric",
    severity: "P0",
    p0Category: "measurement_failure",
    question: "看板已有指标表，但该看板是上线门禁，主指标、baseline 和归因窗口缺失，如何判断是否允许上线？",
    evidenceRefs: ["fact_expanded_metrics", "missing_approval_metric"],
    severityReason: "上线门禁依赖该看板，核心口径缺失会阻断审批。",
    recommendedRevision: "补充上线门禁主指标、baseline、归因窗口和通过阈值。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_expanded_metrics",
        category: "dashboard",
        claim: "Expanded embedded sheet lists dashboard metrics and definitions."
      }],
      missingFacts: [{
        missingFactId: "missing_approval_metric",
        category: "measurement",
        claim: "Launch-gate dashboard lacks primary metric, baseline, attribution window, and pass threshold.",
        approvalImpact: "approval_blocking"
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "measurement_success_uninterpretable");
});

test("evaluateP0Gate downgrades ranking boundary followups when core revival rules are present", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_revival_boundary",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "复活赛已明确复赛淘汰主播、金木水火土榜、各复活3人和Top3写入决赛，但同分、跨榜去重、异常纠错和结算时点是否明确？",
    evidenceRefs: ["fact_revival_core", "missing_revival_boundary"],
    severityReason: "这些边界会影响对账和运营处理，但核心晋级规则已经明确。",
    recommendedRevision: "补充同分、跨榜去重、异常纠错、结算时点和人工修正规则。"
  }, {
    factLedger: factLedgerWith({
      facts: [{
        factId: "fact_revival_core",
        category: "reward",
        claim: "Revival participants are semifinal eliminated creators; five lists revive top 3 into finals."
      }],
      missingFacts: [{
        missingFactId: "missing_revival_boundary",
        category: "risk",
        claim: "Tie-break, cross-list dedupe, exception correction, and settlement cutoff are not specified.",
        approvalImpact: "follow_up"
      }]
    })
  });

  assert.equal(decision.kept, false);
  assert.equal(decision.reasonCode, "ranking_boundary_without_core_rule_blocker");
});

test("evaluateP0Gate keeps ranking gaps that affect winners or rewards as launch safety P0", () => {
  const decision = evaluateP0Gate({
    issueId: "issue_revival_winner_change",
    severity: "P0",
    p0Category: "launch_safety_failure",
    question: "复活赛缺少排序指标和同分规则，且同分会直接改变Top3、晋级名单和奖励归属，如何保证公开榜单公平？",
    evidenceRefs: ["missing_revival_core"],
    severityReason: "规则缺失会改变获奖/晋级结果，导致公开榜单不可信。",
    recommendedRevision: "补充排序指标、同分规则、奖励归属规则和可复现名单生成逻辑。"
  }, {
    factLedger: factLedgerWith({
      missingFacts: [{
        missingFactId: "missing_revival_core",
        category: "risk",
        claim: "Ranking score and tie-break rules are missing and ties can change Top 3, qualification, and reward ownership.",
        approvalImpact: "approval_blocking"
      }]
    })
  });

  assert.equal(decision.kept, true);
  assert.equal(decision.reasonCode, "launch_safety_user_risk");
});

for (const item of REVIEW_LEVEL_GOLD_SET) {
  test(`p0 gatekeeper review-level gold set: ${item.caseId}`, () => {
    const result = applyP0Gatekeeper({
      issues: item.issues,
      factLedger: item.factLedger
    });

    assert.equal(result.verdictRisk, item.expectedVerdictRisk);
    assert.equal(result.issues.filter((issue) => issue.severity === "P0").length, item.expectedP0Count);
    for (const expected of item.expectedDecisions) {
      const actual = result.decisions.find((decision) => decision.issueId === expected.issueId);
      assert.equal(actual?.kept, expected.kept, expected.issueId);
      assert.equal(actual?.reasonCode, expected.reasonCode, expected.issueId);
    }
  });
}

function factLedgerWith({ facts = [], missingFacts = [], resourceCoverage = [], unexpandedResources = [] } = {}) {
  return {
    facts,
    missingFacts,
    resourceCoverage,
    unexpandedResources
  };
}
