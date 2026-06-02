const TECHNICAL_DETAIL_PATTERNS = [
  /\bQPS\b/i,
  /\bSLA\b/i,
  /\bAPI\b/i,
  /\bSDK\b/i,
  /\bETL\b/i,
  /\brunbook\b/i,
  /\bon-?call\b/i,
  /pipeline|数仓|表结构|字段映射|埋点字段|缓存|刷新频率|补数|回填|迁移|版本|发布|发版/,
  /监控|告警|报警|看板|SOT|日志|压测|容量|并发|延迟|超时|重试|熔断|限流/,
  /命名|信息标准|ICON|icon|badge|尺寸|未来扩展|扩展性/
];

const PRODUCT_BRIDGE_PATTERNS = [
  /无法上线|不能上线|不可上线|上线门禁|不可交付|核心链路|主链路|核心路径|核心触达/,
  /无法生成|无法发送|不可用|中断|失败后无法恢复|fallback|兜底/,
  /用户|主播|运营|触达|活动创建|活动发布|入口|资源位|排序|流量/,
  /合规|隐私|法务|TnS|内容安全|审核|人审|审批|跨境|风控|反作弊/,
  /回滚|不可回滚|停止触达|全量|灰度|直接触达/,
  /口径|分母|基线|归因|A\/?B|AA|实验污染|留存|成败|无法解释|无法判断|不能衡量/,
  /目标|人群|问题定义|方向|收益|负向影响|退出规则|guardrail|护栏/
];

const STATISTICAL_AUDIT_PATTERNS = [
  /样本量|显著性|显著水平|MDE|p-?value|p 值|统计功效|power|置信区间|confidence interval/i
];

const FORMAL_EXPERIMENT_DECISION_PATTERNS = [
  /正式.*(A\/?B|AB|实验).*(上线|放量|替代|决策|门槛)/i,
  /(上线|放量|替代|决策|门槛).*(A\/?B|AB|实验)/i,
  /primary metric|主指标|随机化单位|实验单位|分流单位|分流口径|污染|归因窗口|决策门槛|放量门槛|替代旧策略/i
];

const DASHBOARD_IMPLEMENTATION_FOLLOWUP_PATTERNS = [
  /看板|dashboard|报表|数据集/i,
  /数据源|SQL|刷新频率|owner|负责人|验收样例|示例|SLA|字段映射/i,
  /已列出|已经列出|指标列表|指标.*已|嵌入表格|表格中给出|指标.*给出/i
];

const DASHBOARD_DECISION_CRITICAL_PATTERNS = [
  /放量|结算|战情|决策|门槛|上线门禁|launch[- ]?gate|ramp|settlement|decision gate|approval gate|SOT|单一事实来源|single source of truth|source of truth|资源分配|流量分配|预算分配|resource allocation|traffic allocation|budget allocation/i,
  /成败|核心口径|主指标|primary metric|分母|基线|baseline|归因|attribution window|pass threshold|无法解释|无法判断|营收口径|指标口径/i
];

const DASHBOARD_MONITORING_METRIC_CONVERGENCE_PATTERNS = [
  /看板|dashboard|报表|数据集/i,
  /日常监控|活动监控|监控看板|复盘|recap|daily monitoring|campaign monitoring|monitoring dashboard/i,
  /核心验收|验收指标|主验收|core acceptance|baseline|基线|MOY|归因窗口|聚合维度|对比口径|attribution window|aggregation dimension/i
];

const TRACKING_IMPLEMENTATION_FOLLOWUP_PATTERNS = [
  /埋点|tracking|event|事件/i,
  /曝光|点击|订阅|toast|事件名|事件清单|触发时机|属性|properties|schema|上报|目标表|数据表|验收\s*SQL|owner|负责人/i
];

const DATA_TABLE_IMPLEMENTATION_FOLLOWUP_PATTERNS = [
  /SQL|数据表|源表|目标表|字段映射|表结构|数据源|dataset|table/i,
  /owner|负责人|验收|样例|示例|刷新频率|SLA|同步|回填|补数|字段|schema|交付|数仓/i
];

const CORE_MEASUREMENT_GATE_PATTERNS = [
  /主指标|primary metric|北极星|核心指标|指标口径|目标口径/i,
  /分子|分母|基线|大盘|活动后留存|留存窗口|成功阈值|决策单元/i,
  /\bA\/?B\b|\bAA\b|正式.*(实验|放量|上线|替代|决策)|随机化|分流单位|污染/i,
  /营收口径|参与率口径|增量口径|归因窗口.*(成败|放量|决策|替代|上线)/i
];

const RANKING_BOUNDARY_FOLLOWUP_PATTERNS = [
  /榜单|ranking|复活赛|晋级|Top\s*3|名单|奖励/i,
  /同分|并列|去重|异常纠错|人工修正|结算时点|触发时点|日志|对账|回滚/i
];

const RANKING_CORE_PRESENT_PATTERNS = [
  /复赛.*淘汰|淘汰.*主播|金木水火土|各复活\s*3|Top\s*3.*决赛|核心.*明确|规则已经明确|revive top 3|semifinal eliminated|five lists/i
];

const RANKING_OUTCOME_CHANGING_PATTERNS = [
  /改变.{0,16}(Top\s*3|获奖|晋级名单|晋级结果|奖励归属|名单结果)|影响.{0,16}(Top\s*3|获奖|晋级名单|晋级结果|奖励归属|名单结果)/i,
  /缺少.*(排序指标|参与资格|晋级名额|奖励规则|核心规则)|排序指标.*缺失|规则缺失.*(获奖|晋级|奖励)/i,
  /公开榜单.*(不可信|公平)|奖励归属|获奖结果/
];

const LEGAL_CHECKLIST_PATTERNS = [
  /Legal Ticket|Legal|法务|合规审批|合规.*审查|合规.*批准|合规.*批|签署人|审批.*SLA/i,
  /opt-?in|consent|创作者.*同意|用户.*同意|主播.*同意|数据跨境|跨境数据|官方账号.*主动触达/i
];

const RELEASE_READINESS_FOLLOWUP_PATTERNS = [
  /发布范围|首发范围|发布计划|灰度|放量|rollout|ramp|上线计划|上线日期|上线时间|go-?live/i,
  /回滚触发|回滚阈值|回滚.*(owner|负责人|责任人)|回退.*(owner|负责人|责任人|方案|机制)|观测窗口|owner|负责人|责任人/i
];

const DIRECT_UNSAFE_LAUNCH_PATTERNS = [
  /直接触达|无人工审核|没有人工审核|缺少.*人审|未经.*人审/i,
  /不当内容|内容安全|文化敏感|敏感内容|合规门禁|上线门禁|硬性门禁/i,
  /不可回滚|停止触达|无可用.*(fallback|兜底|替代|人工)|没有可用.*(fallback|兜底|替代|人工)/i,
  /全量触达.*效果异常|效果异常.*全量触达|唯一.*(不可用|无法|不能)/i
];

const HARD_LAUNCH_SAFETY_PATTERNS = [
  /\bTnS\b|内容安全|隐私|跨境|不当内容|文化敏感|敏感内容|监管/i,
  /直接触达|无人工审核|没有人工审核|缺少.*人审|未经.*人审|不可回滚|停止触达|回滚机制/
];

const EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS = [
  /未经.*(同意|授权|许可).*(发送|触达|外呼|使用)/,
  /没有.*(同意|授权|许可).*(仍|直接).*(发送|触达|外呼|使用)/,
  /(绕过|不需要|无需).*(合规|法务|审批|同意|授权)/,
  /(法律|监管).*(禁止|不允许|不得).*(发送|触达|外呼|使用)/,
  /(违规|违法).*(发送|触达|外呼|使用|数据)/
];

const CHANNEL_INTEGRATION_READINESS_PATTERNS = [
  /官方.*(账号|帐号)|商业账号|商业帐号|渠道.*(对接|接入|集成)|对接状态|测试凭证|发信权限|发送权限/i,
  /WhatsApp|Discord|Telegram|\bLINE\b|外部渠道|对外触达|主动外呼/i
];

const READINESS_FOLLOWUP_PATTERNS = [
  /是否|有无|若|如果|未明确|未列明|未记录|未说明|待确认|not documented|status/i,
  /是否已完成|是否具备|是否可用|是否已验证|若未完成|如未完成/
];

const PROVEN_BLOCKED_INTEGRATION_PATTERNS = [
  /已确认.*(不可用|无法|不能|无权限|无账号|无帐号|未获批|被拒)/,
  /(唯一|必须).*(渠道|链路|方式).*(不可用|无法|不能|无权限|未获批)/,
  /无可用.*(fallback|兜底|替代|人工)|没有可用.*(fallback|兜底|替代|人工)/i,
  /上线门禁|硬性门禁/
];

const DELIVERY_READINESS_FOLLOWUP_PATTERNS = [
  /是否|有无|若|如果|未明确|未列明|未记录|未说明|待确认|not documented|status|缺少|补充/i,
  /owner|负责人|排期|联调|验收|环境|账号|帐号|权限|凭证|模板|文案审批|配置|白名单|开关|依赖|fallback|兜底|上线日期|上线时间|素材|接口|回退|go-?live/i
];

const READINESS_SECTION_FOLLOWUP_PATTERNS = [
  /验收标准|成功标准|上线标准|acceptance criteria|success criteria|launch criteria/i,
  /风险依赖|风险\/依赖|风险.*依赖|依赖.*风险|risk dependency|risk\/dependency/i,
  /checklist owner|上线\s*checklist|检查清单|文档完整度|模板完整度|缺失章节|格式标准/i
];

const CATEGORY_CHECKS = {
  measurement_failure: {
    reasonCode: "measurement_success_uninterpretable",
    test: isMeasurementBlocker
  },
  direction_failure: {
    reasonCode: "direction_resource_guardrail_missing",
    test: isDirectionBlocker
  },
  launch_safety_failure: {
    reasonCode: "launch_safety_user_risk",
    test: isLaunchSafetyBlocker
  },
  delivery_viability_failure: {
    reasonCode: "delivery_core_path_blocked",
    test: isDeliveryBlocker
  }
};

export function evaluateP0Gate(issue = {}, { factLedger = {} } = {}) {
  if (issue.severity !== "P0") {
    return gateDecision(issue, true, "not_p0", "Issue is not a P0 candidate.");
  }

  const evidence = evidenceForIssue(issue, factLedger);
  const text = issueText(issue, evidence);
  const category = issue.p0Category;
  const categoryCheck = CATEGORY_CHECKS[category];
  if (!categoryCheck) {
    return gateDecision(issue, false, "unsupported_p0_category", "P0 category is not one of the approval-critical categories.");
  }

  const statisticalAuditDowngradeReason = getStatisticalAuditDowngradeReason(text, evidence);
  if (category === "measurement_failure" && statisticalAuditDowngradeReason) {
    return gateDecision(issue, false, statisticalAuditDowngradeReason.code, statisticalAuditDowngradeReason.reason);
  }

  if (category === "measurement_failure" && hasRelevantUnexpandedDashboardResource(text, factLedger)) {
    return gateDecision(issue, false, "dashboard_metric_may_exist_in_unexpanded_resource", "A relevant embedded dashboard or metric resource was not expanded, so missing metric definitions are not proven approval-blocking.");
  }

  if (category === "measurement_failure" && isDashboardImplementationFollowup(text, evidence)) {
    return gateDecision(issue, false, "dashboard_implementation_followup", "Dashboard metrics are present; data source, SQL, refresh, owner, or acceptance samples are implementation-readiness follow-ups.");
  }

  if (category === "measurement_failure" && isDashboardMonitoringMetricConvergenceFollowup(text, evidence, factLedger)) {
    return gateDecision(issue, false, "dashboard_monitoring_metric_convergence_followup", "Monitoring or recap dashboards with expanded metric coverage should treat core acceptance, baseline comparison, and attribution convergence as P1 unless the PRD makes the dashboard a launch, ramp, settlement, SOT, or resource decision gate.");
  }

  if (category === "measurement_failure" && isTrackingImplementationFollowup(text, evidence)) {
    return gateDecision(issue, false, "tracking_implementation_followup", "Tracking event schema, properties, target tables, owner, validation SQL, and reporting details are implementation-readiness follow-ups unless core metric decision criteria are missing.");
  }

  if (category === "measurement_failure" && isDataTableImplementationFollowup(text, evidence)) {
    return gateDecision(issue, false, "data_table_sql_implementation_followup", "SQL, source/target tables, field mapping, owner, refresh cadence, and validation samples are implementation-readiness follow-ups unless core metric decision criteria are missing.");
  }

  if (category === "launch_safety_failure" && isLegalChecklistWithoutLaunchGate(text, evidence)) {
    return gateDecision(issue, false, "legal_checklist_without_launch_gate", "Legal or compliance checklist detail without explicit approval-blocking launch gate or direct user safety risk.");
  }

  if (category === "launch_safety_failure" && isReleaseReadinessWithoutDirectUnsafeLaunch(text, evidence)) {
    return gateDecision(issue, false, "release_readiness_without_direct_unsafe_launch", "Launch scope, gray/ramp steps, observation windows, rollback thresholds, and release owners are readiness follow-ups unless direct unsafe launch, approval-blocking evidence, or no viable fallback is proven.");
  }

  if (category === "launch_safety_failure" && isRankingBoundaryWithoutCoreRuleBlocker(text, evidence)) {
    return gateDecision(issue, false, "ranking_boundary_without_core_rule_blocker", "Ranking core rules are present; tie-break, dedupe, correction, and settlement details are follow-ups unless they change winners, qualification, or rewards.");
  }

  if (category === "delivery_viability_failure" && isIntegrationReadinessWithoutProvenBlockedLaunch(text, evidence)) {
    return gateDecision(issue, false, "integration_readiness_without_proven_blocked_launch", "Channel/account integration readiness follow-up without evidence that launch is already blocked or has no fallback.");
  }

  if (category === "delivery_viability_failure" && isDeliveryReadinessWithoutProvenBlockedLaunch(text, evidence)) {
    return gateDecision(issue, false, "delivery_readiness_without_proven_blocked_launch", "Delivery readiness follow-up without evidence that the required launch path is already blocked or has no viable fallback.");
  }

  if (isReadinessSectionWithoutProductBlocker(text, evidence)) {
    return gateDecision(issue, false, "readiness_section_without_product_blocker", "Section completeness, acceptance criteria, checklist owner, or risk/dependency gaps are readiness follow-ups unless they prove a concrete product approval blocker.");
  }

  if (isTechnicalDetail(text) && !hasConcreteProductBridge(issue, text, evidence)) {
    return gateDecision(issue, false, "technical_detail_without_product_blocker", "Technical or implementation detail without a concrete product approval blocker.");
  }

  if (!categoryCheck.test(issue, text, evidence)) {
    return gateDecision(issue, false, "category_specific_blocker_not_proven", "The issue does not prove why this P0 category blocks group review approval.");
  }

  return gateDecision(issue, true, categoryCheck.reasonCode, "The issue matches a category-specific product approval blocker.");
}

export function applyP0Gatekeeper({ issues = [], factLedger = {} } = {}) {
  const decisions = [];
  const gatedIssues = issues.map((issue) => {
    if (issue.severity !== "P0") return issue;
    const decision = evaluateP0Gate(issue, { factLedger });
    decisions.push(decision);
    if (decision.kept) {
      return {
        ...issue,
        p0GateDecision: decision
      };
    }
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      p0GateDecision: decision
    };
  });

  return {
    issues: gatedIssues,
    decisions,
    verdictRisk: gatedIssues.some((issue) => issue.severity === "P0") ? "Blocked" : "Conditional Pass"
  };
}

function isMeasurementBlocker(issue, text, evidence) {
  return (
    /口径|分母|基线|归因|A\/?B|AA|实验|污染|留存|指标|参与率|转化|营收|ROI|CTR|DAU/i.test(text) &&
    /无法解释|不可解释|无法判断|不能判断|不能衡量|无法衡量|成败|阻断审批|上线门禁|允许上线|success|measure|interpret/i.test(text) &&
    hasDecisionRelevantEvidence(evidence)
  );
}

function isDirectionBlocker(issue, text, evidence) {
  return (
    /目标|人群|问题|方向|资源位|额外流量|流量|排序|ranking|placement|收益|负向影响|退出规则|guardrail|护栏|准入/i.test(text) &&
    /无法判断|不合理|无护栏|缺少.*护栏|没有.*退出|没有.*收益|机会成本|方向/i.test(text) &&
    hasDecisionRelevantEvidence(evidence)
  );
}

function isLaunchSafetyBlocker(issue, text, evidence) {
  return (
    /用户|主播|触达|合规|隐私|法务|TnS|内容安全|审核|人审|审批|跨境|风控|不当内容|直接触达|回滚|停止触达|不可回滚|全量|灰度|榜单|复活赛|晋级|奖励|获奖|名单|Top\s*3/i.test(text) &&
    /风险|不安全|缺少|没有|无法|不可|门禁|拦截|回滚|停止/i.test(text) &&
    hasDecisionRelevantEvidence(evidence)
  );
}

function isDeliveryBlocker(issue, text, evidence) {
  return (
    /核心链路|主链路|核心路径|核心触达|活动创建|活动发布|无法生成|无法发送|无法上线|不能上线|不可上线|不可交付|依赖|owner|fallback|兜底|成本失控/i.test(text) &&
    /无法|不能|不可|缺少|未确认|失败|中断|门禁|不可用|不可交付/i.test(text) &&
    hasConcreteProductBridge(issue, text, evidence) &&
    hasProvenDeliveryBlockingEvidence(evidence)
  );
}

function hasConcreteProductBridge(issue, text, evidence) {
  const structuredBridgeText = [
    issue.blockedOutcome,
    issue.affectedPath,
    issue.whyReviewCannotPass
  ].filter(Boolean).join("\n");
  const hasStructuredBridge = structuredBridgeText.length > 20 &&
    countMatches(structuredBridgeText, PRODUCT_BRIDGE_PATTERNS) >= 1 &&
    hasBridgeEvidence(issue, evidence);

  return hasStructuredBridge;
}

function hasBridgeEvidence(issue, evidence) {
  const bridgeRefs = new Set(Array.isArray(issue.bridgeEvidenceRefs) ? issue.bridgeEvidenceRefs : []);
  if (!bridgeRefs.size) return false;
  return evidence.some((item) => bridgeRefs.has(item.id));
}

function hasDecisionRelevantEvidence(evidence) {
  return evidence.some((item) => (
    item.kind === "fact" ||
    item.approvalImpact === "approval_blocking" ||
    (item.kind === "missing" && !item.approvalImpact)
  ));
}

function hasApprovalBlockingEvidence(evidence) {
  return evidence.some((item) => item.approvalImpact === "approval_blocking");
}

function evidenceForIssue(issue, factLedger) {
  const refs = new Set(Array.isArray(issue.evidenceRefs) ? issue.evidenceRefs : []);
  const facts = (factLedger.facts || []).map((fact) => ({
    id: fact.factId,
    kind: "fact",
    category: fact.category,
    text: fact.claim || fact.sourceExcerpt || ""
  }));
  const missingFacts = (factLedger.missingFacts || []).map((fact) => ({
    id: fact.missingFactId,
    kind: "missing",
    category: fact.category,
    text: fact.claim || "",
    approvalImpact: fact.approvalImpact || null
  }));
  return [...facts, ...missingFacts].filter((item) => refs.has(item.id));
}

function isTechnicalDetail(text) {
  if (isDecisionCriticalDashboardMeasurement(text)) return false;
  return countMatches(text, TECHNICAL_DETAIL_PATTERNS) > 0;
}

function isDashboardImplementationFollowup(text, evidence) {
  if (!DASHBOARD_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (isDecisionCriticalDashboardMeasurement(text)) return false;
  return evidence.some((item) => /指标|metric|revenue|营收|UV|PV|看板|dashboard/i.test(item.text));
}

function isDashboardMonitoringMetricConvergenceFollowup(text, evidence, factLedger = {}) {
  if (!DASHBOARD_MONITORING_METRIC_CONVERGENCE_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (isDecisionCriticalDashboardMeasurement(text)) return false;
  if (hasApprovalBlockingEvidence(evidence)) return false;
  const evidenceText = evidence.map((item) => item.text).filter(Boolean).join("\n");
  if (hasDashboardDecisionGateSignal(`${text}\n${evidenceText}`)) return false;
  return hasExpandedDashboardMetricEvidence(evidence, factLedger) && hasMonitoringDashboardEvidence(`${text}\n${evidenceText}`);
}

function hasExpandedDashboardMetricEvidence(evidence, factLedger = {}) {
  return evidence.some((item) => (
    item.kind === "fact" &&
    /expanded|embedded sheet|嵌入表格|指标表|指标列表|指标.*(?:列出|给出)|给出.*指标|metric table|metric list|lists/i.test(item.text || "") &&
    /指标|metric|definition|定义|UV|PV|营收|revenue|conversion|转化/i.test(item.text || "")
  )) || hasExpandedDashboardMetricResourceCoverage(factLedger);
}

function hasExpandedDashboardMetricResourceCoverage(factLedger = {}) {
  return (factLedger.resourceCoverage || []).some((resource) => {
    const status = String(resource.status || "");
    const summary = String(resource.summary || "");
    return /^(expanded|已展开|展开完成)$/i.test(status) &&
      /看板|dashboard|报表|指标表|指标列表|metric table|metric list|embedded metric|嵌入指标表|嵌入表格/i.test(summary) &&
      /指标|metric|definition|定义|UV|PV|营收|revenue|conversion|转化|exposure|click|曝光|点击/i.test(summary);
  });
}

function hasMonitoringDashboardEvidence(text) {
  return /日常监控|活动监控|监控看板|复盘|recap|daily monitoring|campaign monitoring|monitoring dashboard/i.test(text);
}

function hasDashboardDecisionGateSignal(text) {
  return /放量|ramp|结算|settlement|战情|决策|decision|门槛|上线门禁|launch[- ]?gate|approval gate|SOT|单一事实来源|single source of truth|source of truth|资源分配|流量分配|预算分配|resource allocation|traffic allocation|budget allocation|pass threshold|通过阈值/i.test(stripNegatedDashboardDecisionWording(text));
}

function hasRelevantUnexpandedDashboardResource(text, factLedger = {}) {
  if (!/看板|dashboard|报表|数据集|指标|metric|营收|转化|触达|曝光/i.test(text)) return false;
  return (factLedger.unexpandedResources || []).some((resource) => {
    const resourceText = [
      resource.resourceId,
      resource.type,
      resource.status,
      resource.reason,
      resource.summary
    ].filter(Boolean).join("\n");
    return /sheet|指标|metric|metrics|维度|dashboard|看板|报表/i.test(resourceText);
  });
}

function isTrackingImplementationFollowup(text, evidence) {
  if (!TRACKING_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (hasCoreMeasurementGateSignal(text)) return false;
  return evidence.some((item) => {
    const evidenceText = item.text || "";
    return /埋点|tracking|event|事件|schema|属性|目标表|数据表|SQL|上报|owner|负责人/i.test(evidenceText) ||
      item.approvalImpact === "follow_up";
  });
}

function isDataTableImplementationFollowup(text, evidence) {
  if (!DATA_TABLE_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (hasCoreMeasurementGateSignal(text)) return false;
  return evidence.some((item) => {
    const evidenceText = item.text || "";
    return /SQL|数据表|源表|目标表|字段映射|表结构|数据源|dataset|table|owner|负责人|验收样例|刷新频率/i.test(evidenceText) ||
      item.approvalImpact === "follow_up";
  });
}

function hasCoreMeasurementGateSignal(text) {
  return CORE_MEASUREMENT_GATE_PATTERNS.some((pattern) => pattern.test(stripNegatedCoreMeasurementWording(text)));
}

function stripNegatedCoreMeasurementWording(text) {
  return text.replace(/不(?:等于|是|代表).{0,12}(?:核心)?(?:业务)?(?:指标)?口径(?:缺失|不清|未定义)?/g, "");
}

function stripNegatedDashboardDecisionWording(text) {
  return text.replace(/(?:未说明|未明确|未写明|没有说明|没有明确|不作为|不是|并非).{0,40}(?:放量|结算|上线门禁|上线|门禁|launch[- ]?gate|SOT|单一事实来源|source of truth|资源分配|流量分配|预算分配|resource allocation|traffic allocation|budget allocation|decision gate)/gi, "");
}

function isDecisionCriticalDashboardMeasurement(text) {
  const cleanText = stripNegatedDashboardDecisionWording(text);
  if (!/看板|dashboard|报表|数据集/i.test(cleanText)) return false;
  return DASHBOARD_DECISION_CRITICAL_PATTERNS.every((pattern) => pattern.test(cleanText));
}

function isRankingBoundaryWithoutCoreRuleBlocker(text, evidence) {
  if (!RANKING_BOUNDARY_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  const evidenceText = evidence.map((item) => item.text).filter(Boolean).join("\n");
  const hasCoreRules = RANKING_CORE_PRESENT_PATTERNS.some((pattern) => pattern.test(`${text}\n${evidenceText}`));
  const changesOutcome = RANKING_OUTCOME_CHANGING_PATTERNS.some((pattern) => pattern.test(text));
  return hasCoreRules && !changesOutcome;
}

function issueText(issue, evidence = []) {
  return [
    issue.question,
    issue.severityReason,
    issue.recommendedRevision,
    issue.blockedOutcome,
    issue.affectedPath,
    issue.whyReviewCannotPass,
    ...evidence.map((item) => item.text)
  ].filter(Boolean).join("\n");
}

function getStatisticalAuditDowngradeReason(text, evidence) {
  if (!STATISTICAL_AUDIT_PATTERNS.some((pattern) => pattern.test(text))) return null;
  if (!FORMAL_EXPERIMENT_DECISION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      code: "statistical_audit_without_decision_blocker",
      reason: "Statistical audit detail without a formal experiment launch, ramp, or replacement decision blocker."
    };
  }
  if (!hasApprovalBlockingEvidence(evidence)) {
    return {
      code: "statistical_audit_without_approval_blocking_evidence",
      reason: "Experiment statistical detail without approval-blocking evidence from the PRD body."
    };
  }
  return null;
}

function isLegalChecklistWithoutLaunchGate(text, evidence) {
  if (!LEGAL_CHECKLIST_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (hasApprovalBlockingEvidence(evidence)) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (isComplianceApprovalFollowup(text)) return true;
  return !HARD_LAUNCH_SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

function isReleaseReadinessWithoutDirectUnsafeLaunch(text, evidence) {
  if (!RELEASE_READINESS_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (hasApprovalBlockingEvidence(evidence)) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (DIRECT_UNSAFE_LAUNCH_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !hasProvenDeliveryBlockingEvidence(evidence);
}

function isComplianceApprovalFollowup(text) {
  return /合规.*(批准|批|审批|审查)|opt-?in|consent|同意|数据跨境|跨境数据|官方账号.*主动触达/i.test(text);
}

function isIntegrationReadinessWithoutProvenBlockedLaunch(text, evidence) {
  if (!CHANNEL_INTEGRATION_READINESS_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (!READINESS_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !hasProvenDeliveryBlockingEvidence(evidence);
}

function isDeliveryReadinessWithoutProvenBlockedLaunch(text, evidence) {
  if (!DELIVERY_READINESS_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (isReadinessSectionWithoutProductBlocker(text, evidence) && !hasSpecificDeliveryReadinessArtifact(text)) return false;
  return !hasProvenDeliveryBlockingEvidence(evidence);
}

function hasSpecificDeliveryReadinessArtifact(text) {
  const cleanText = text.replace(/风险[\/\s]*依赖|风险.*依赖|risk dependency|risk\/dependency|risk.*dependency/gi, "");
  return /上线日期|上线时间|素材|接口|API|联调|环境|账号|帐号|权限|凭证|模板|文案审批|配置|白名单|开关|依赖|fallback|兜底|回退|go-?live|渠道|owner|负责人|排期/i.test(cleanText);
}

function isReadinessSectionWithoutProductBlocker(text, evidence) {
  if (!READINESS_SECTION_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (hasApprovalBlockingEvidence(evidence)) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (HARD_LAUNCH_SAFETY_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/主指标|分母|基线|归因|成败无法|无法判断|无法衡量|唯一.*(不可用|无法|不能)|无可用.*(fallback|兜底)|没有可用.*(fallback|兜底)/i.test(text)) return false;
  return true;
}

function hasProvenDeliveryBlockingEvidence(evidence) {
  if (hasApprovalBlockingEvidence(evidence)) return true;
  const evidenceText = evidence.map((item) => item.text).filter(Boolean).join("\n");
  return PROVEN_BLOCKED_INTEGRATION_PATTERNS.some((pattern) => pattern.test(evidenceText));
}

function gateDecision(issue, kept, reasonCode, reason) {
  return {
    issueId: issue.issueId || "",
    category: issue.p0Category || null,
    kept,
    reasonCode,
    reason
  };
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
