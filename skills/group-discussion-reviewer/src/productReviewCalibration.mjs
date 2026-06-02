const TECHNICAL_EXECUTION_PATTERNS = [
  /\bSLA\b/i,
  /\bQPS\b/i,
  /\brunbook\b/i,
  /\bon-?call\b/i,
  /\bAPI\b/i,
  /\bSDK\b/i,
  /\bETL\b/i,
  /\bcron\b/i,
  /延迟|耗时|超时|重试|熔断|限流|降级|扩容|容量|压测|吞吐|并发/,
  /服务|接口|链路|管道|pipeline|数据仓库|数仓|表结构|字段映射/,
  /监控|告警|报警|看板|日志|埋点明细|埋点工单|刷新频率/,
  /部署|发版|版本|缓存|回填|补数|迁移|技术方案/
];

const PRODUCT_BLOCKING_PATTERNS = [
  /口径|分母|目标|基线|大盘|留存|复访|渗透|转化|参与率|营收|增量|ROI|CTR|DAU/,
  /\bA\/?B\b|\bAA\b|实验|对照|分流|随机|随机化|污染|归因|guardrail|护栏/,
  /人群|主播|用户|运营|区域|国家|分层|白名单|准入|入口|路径|玩法|奖励|任务|榜单|活动中心/,
  /合规|隐私|法务|内容安全|Legal|TnS|跨境|审批|审查|风控|反作弊|滥用|欺诈|不当内容|文化敏感|敏感/i,
  /无法上线|不能上线|上线不安全|直接触达|不可回滚|回滚|全量|灰度|预算|成本失控|资源挤占/,
  /方向|问题|假设|价值|为什么|差异|替代方案|机会成本/
];

const DIRECT_LAUNCH_GATE_PATTERNS = [
  /合规|隐私|法务|内容安全|Legal|TnS|跨境|审批|审查/i,
  /风控|反作弊|滥用|欺诈|不当内容|文化敏感|敏感/
];

const MONITORING_EXECUTION_PATTERNS = [
  /监控|告警|报警|看板|SOT|单一事实来源/,
  /on-?call|runbook|值班|应急流程/i
];

const CORE_PRODUCT_BLOCKING_PATTERNS = [
  /口径|分母|目标|基线|大盘|留存|复访|渗透|转化|参与率|营收|增量|ROI|CTR|DAU/,
  /\bA\/?B\b|\bAA\b|实验|对照|分流|随机|随机化|污染|归因|护栏/,
  /人群|主播|用户|运营|区域|国家|分层|准入|入口|路径|玩法|奖励|任务|榜单|活动中心/
];

const STATISTICAL_AUDIT_PATTERNS = [
  /样本量|显著性|显著水平|MDE|p-?value|p 值|统计功效|power|置信区间|confidence interval/i
];

const FORMAL_EXPERIMENT_DECISION_PATTERNS = [
  /正式.*(A\/?B|AB|实验).*(上线|放量|替代|决策|门槛)/i,
  /(实验结论|A\/?B 结果|AB 结果|实验结果).*(作为|是).*(上线|放量|替代|决策|门槛)/i,
  /替代旧策略|替换旧策略/i
];

const DASHBOARD_IMPLEMENTATION_FOLLOWUP_PATTERNS = [
  /看板|dashboard|报表|数据集/i,
  /数据源|SQL|刷新频率|owner|负责人|验收样例|示例|SLA|口径表|字段映射/i,
  /已列出|已经列出|指标列表|指标.*已|嵌入表格|表格中给出|指标.*给出/i
];

const DASHBOARD_DECISION_CRITICAL_PATTERNS = [
  /放量|结算|战情|决策|门槛|上线门禁|launch[- ]?gate|ramp|settlement|decision gate|approval gate|SOT|单一事实来源|single source of truth|source of truth|资源分配|流量分配|预算分配|resource allocation|traffic allocation|budget allocation/i,
  /成败|核心口径|主指标|primary metric|分母|基线|baseline|归因|attribution window|pass threshold|无法解释|无法判断|营收口径|指标口径/i
];

const DASHBOARD_MONITORING_METRIC_CONVERGENCE_PATTERNS = [
  /看板|dashboard|报表|数据集/i,
  /已列出|已经列出|指标列表|指标表|指标.*已|嵌入表格|表格中给出|指标.*给出|metric list|metric table|expanded.*metric/i,
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
  /同分|并列|去重|异常纠错|人工修正|结算时点|触发时点|日志|对账|回滚/i,
  /已明确|核心.*明确|规则已经明确|参与.*明确|各复活\s*3|写入决赛|复赛.*淘汰|淘汰.*主播/i
];

const RANKING_OUTCOME_CHANGING_PATTERNS = [
  /改变.{0,16}(Top\s*3|获奖|晋级名单|晋级结果|奖励归属|名单结果)|影响.{0,16}(Top\s*3|获奖|晋级名单|晋级结果|奖励归属|名单结果)/i,
  /缺少.*(排序指标|参与资格|晋级名额|奖励规则|核心规则)|排序指标.*缺失|规则缺失.*(获奖|晋级|奖励)/i,
  /公开榜单.*(不可信|公平)|奖励归属|获奖结果/
];

const LEGAL_CHECKLIST_FOLLOWUP_PATTERNS = [
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

const HARD_LEGAL_OR_USER_SAFETY_PATTERNS = [
  /\bTnS\b|内容安全|不当内容|文化敏感|敏感内容/i,
  /直接触达|无人工审核|没有人工审核|缺少.*人审|未经.*人审|不可回滚|停止触达|回滚机制|上线门禁|硬性门禁/
];

const EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS = [
  /未经.*(同意|授权|许可).*(发送|触达|外呼|使用)/,
  /没有.*(同意|授权|许可).*(仍|直接).*(发送|触达|外呼|使用)/,
  /(绕过|不需要|无需).*(合规|法务|审批|同意|授权)/,
  /(法律|监管).*(禁止|不允许|不得).*(发送|触达|外呼|使用)/,
  /(违规|违法).*(发送|触达|外呼|使用|数据)/
];

const INFO_STANDARD_FOLLOWUP_PATTERNS = [
  /badge|ICON|icon|图标|尺寸|样式|素材/,
  /信息标准|展示文案|文案规范|命名|字段|埋点字段|示例/
];

const CHANNEL_INTEGRATION_READINESS_PATTERNS = [
  /官方.*(账号|帐号)|商业账号|商业帐号|渠道.*(对接|接入|集成)|对接状态|测试凭证|发信权限|发送权限/i,
  /WhatsApp|Discord|Telegram|\bLINE\b|外部渠道|对外触达|主动外呼/i
];

const READINESS_FOLLOWUP_PATTERNS = [
  /是否|有无|若|如果|未明确|未列明|未记录|未说明|待确认|not documented|status/i,
  /是否已完成|是否具备|是否可用|是否已验证|若未完成|如未完成/
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

const PROVEN_BLOCKED_INTEGRATION_PATTERNS = [
  /已确认.*(不可用|无法|不能|无权限|无账号|无帐号|未获批|被拒)/,
  /(唯一|必须).*(渠道|链路|方式).*(不可用|无法|不能|无权限|未获批)/,
  /无可用.*(fallback|兜底|替代|人工)|没有可用.*(fallback|兜底|替代|人工)/i,
  /上线门禁|硬性门禁/
];

const PURE_EXECUTION_CATEGORIES = new Set([
  "delivery_viability_failure",
  "launch_safety_failure"
]);

export const PRODUCT_REVIEW_CALIBRATION_PROMPT = `Product review severity calibration, derived from recent group-discussion patterns:
- P0 examples: metric口径 / metric definition is ambiguous; formal A/B launch/ramp decisions lack primary metric, decision unit, contamination handling, or attribution window; the target population or business problem is wrong; launch creates direct user, compliance, privacy, incentive-abuse, or irreversible rollout risk.
- P0 examples: a proposal asks for extra traffic, ranking priority, rewards, or activity placement but lacks the business guardrail needed to decide whether the exception is acceptable.
- P1/P2 examples: sample size, significance level, p-value, statistical power, or MDE. These are statistical follow-ups by default, unless the PRD explicitly uses formal experiment results as the launch, ramp, or replacement decision gate.
- P1/P2 examples: SLA, QPS, latency, monitoring dashboard, alert thresholds, runbook, on-call, or ordinary engineering implementation details. These default to P1/P2 unless the PRD evidence shows they directly block safe launch, measurable success, the right target/problem, or delivery viability.
- P1/P2 examples: tracking schema details, event names, exposure/click/subscribe/toast event lists, trigger timing, event properties, target tables, owner, validation SQL, and reporting/alerting details. These are implementation-readiness follow-ups unless the primary metric definition, denominator, baseline, attribution window, or formal ramp/replacement decision unit is missing.
- P1/P2 examples: SQL samples, source/target tables, data source, field mapping, refresh cadence, data owner, acceptance samples, backfill, or warehouse validation details. These are data implementation follow-ups unless the core business metric definition or decision criteria are missing.
- P1/P2 examples: monitoring or recap dashboards that already include an expanded metric list/table but still need core acceptance metric convergence, baseline comparison formula, aggregation dimension, or attribution window. Treat these as follow-ups unless the PRD explicitly makes the dashboard a launch, ramp, settlement, SOT, or resource decision gate.
- P1/P2 examples: official account/channel integration status, send permission, API connection, test credentials, owner/timeline, message templates, copy approval, config/allowlist, or fallback readiness. Treat these as delivery-readiness follow-ups unless evidence proves the required launch path is already blocked, unavailable, or has no viable fallback.
- P1/P2 examples: launch scope, first-launch scope, gray/ramp steps, launch date, observation window, rollback threshold, rollback owner, material owner, interface owner, interface acceptance, or similar release checklist items. In actual group review these are usually "pass with Todo" follow-ups, not blockers, unless the PRD evidence shows direct unsafe launch, approval-blocking compliance risk, full rollout that cannot stop, or no viable fallback.
- P1/P2 examples: empty Legal Ticket, compliance checklist owner, review SLA, regional compliance approval, opt-in/creator consent proof, or cross-border data approval. Treat these as launch checklist follow-ups unless the PRD evidence says legal/compliance approval is the current approval-blocking gate, or the PRD explicitly plans unsafe behavior such as sending without consent, bypassing legal approval, no human review for sensitive content, or no rollback.
- P1/P2 examples: missing acceptance criteria, success criteria, launch checklist owner, risk/dependency section, or template completeness. These are readiness follow-ups unless the missing content directly blocks product approval, measurable success, launch safety, or delivery of the main path.
- P1/P2 examples: badge/icon sizing, copy display standards, naming, examples, tracking-field details, and similar information-standard cleanups. Do not mark them P0 unless they directly change user-facing safety, measurable success, or launch eligibility.
- Keep P0 for product strategy contradictions: trigger timing, frequency cap, exit rule, target population, resource guardrail, or incentive logic that makes the solution itself unreasonable or impossible for the group to approve.
- Do not convert a normal engineering follow-up into P0 just because it is missing. Ask it as a P1 implementation readiness question.`;

export const PRODUCT_GTM_READINESS_CALIBRATION_PROMPT = `Product/GTM readiness calibration:
- Use readiness thinking to prioritize review, not to create format blockers. Missing sections alone does not automatically become P0.
- For Product PRDs, first ask: why now, what user/business problem, whether the goal is a converged goal, whether the solution hits the decisive contradiction, whether the causal chain is credible, and whether the plan should reuse existing capability before rebuild.
- For GTM PRDs, first ask: whether the objective is converged, whether actions serve the objective, whether the execution path is closed-loop, whether ROI or resource ask is justified, and whether key dependencies are explicit enough to push forward.
- Explanation is not a solution: describing the problem, dashboard, or data view is not enough unless the PRD explains what product/business action changes.
- A readiness gap should stay P1/P2 unless it blocks approval, measurable success, launch safety, the right problem/population, or delivery of the main path.`;

export function calibrateIssueSeverity(issue = {}) {
  if (issue.severity !== "P0") return issue;
  if (issue.p0Category === "measurement_failure" && isLikelyDashboardMonitoringMetricConvergenceFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: dashboard monitoring metric convergence follow-up after metrics are already listed."
    };
  }
  if (issue.p0Category === "measurement_failure" && isLikelyDashboardImplementationFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: dashboard metric implementation detail after metrics are already listed."
    };
  }
  if (issue.p0Category === "measurement_failure" && isLikelyTrackingImplementationFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: tracking implementation detail without core metric decision blocker."
    };
  }
  if (issue.p0Category === "measurement_failure" && isLikelyDataTableImplementationFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: SQL and data table implementation detail without core metric decision blocker."
    };
  }
  if (issue.p0Category === "measurement_failure" && isLikelyStatisticalAuditFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: statistical audit detail without formal experiment decision blocker."
    };
  }
  if (issue.p0Category === "launch_safety_failure" && isLikelyRankingBoundaryFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: ranking boundary rule follow-up when core ranking rules are already present."
    };
  }
  if (issue.p0Category === "launch_safety_failure" && isLikelyReleaseReadinessFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: release readiness follow-up without direct unsafe launch evidence."
    };
  }
  if (issue.p0Category === "launch_safety_failure" && isLikelyLegalChecklistFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: legal or compliance checklist follow-up without explicit launch-safety gate."
    };
  }
  if (issue.p0Category === "delivery_viability_failure" && isLikelyChannelIntegrationReadinessFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: channel integration readiness follow-up without proven blocked launch."
    };
  }
  if (isLikelyReadinessSectionFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: readiness or section-completeness follow-up without direct product approval blocker."
    };
  }
  if (issue.p0Category === "delivery_viability_failure" && isLikelyDeliveryReadinessFollowup(issue)) {
    return {
      ...issue,
      severity: "P1",
      p0Category: null,
      calibrationReason: "Downgraded by product review calibration: delivery readiness follow-up without proven blocked launch."
    };
  }
  if (!PURE_EXECUTION_CATEGORIES.has(issue.p0Category)) return issue;
  const downgradeReason = getExecutionFollowupDowngradeReason(issue);
  if (!downgradeReason) return issue;

  return {
    ...issue,
    severity: "P1",
    p0Category: null,
    calibrationReason: `Downgraded by product review calibration: ${downgradeReason}.`
  };
}

function getExecutionFollowupDowngradeReason(issue) {
  if (isLikelyTechnicalExecutionDetail(issue)) {
    return "technical execution detail without direct product approval blocker";
  }
  if (isLikelyInfoStandardFollowup(issue)) {
    return "information-standard detail without direct product approval blocker";
  }
  return "";
}

export function isLikelyTechnicalExecutionDetail(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (DIRECT_LAUNCH_GATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (isMonitoringExecutionOnly(text)) return true;

  const technicalScore = countMatches(text, TECHNICAL_EXECUTION_PATTERNS);
  if (technicalScore === 0) return false;

  const productScore = countMatches(text, PRODUCT_BLOCKING_PATTERNS);
  if (productScore >= 2) return false;
  return technicalScore >= 2 || (technicalScore >= 1 && productScore === 0);
}

export function isLikelyInfoStandardFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (DIRECT_LAUNCH_GATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/直接触达|不可回滚|无法上线|不能上线|全量|灰度|停止触达|fallback|回滚/i.test(text)) return false;
  if (!INFO_STANDARD_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const coreProductScore = countMatches(text, CORE_PRODUCT_BLOCKING_PATTERNS);
  return coreProductScore < 2;
}

export function isLikelyStatisticalAuditFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!STATISTICAL_AUDIT_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (FORMAL_EXPERIMENT_DECISION_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return true;
}

export function isLikelyDashboardImplementationFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!DASHBOARD_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !isDecisionCriticalDashboardMeasurement(text);
}

export function isLikelyTrackingImplementationFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!TRACKING_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !hasCoreMeasurementGateSignal(text);
}

export function isLikelyDataTableImplementationFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!DATA_TABLE_IMPLEMENTATION_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !hasCoreMeasurementGateSignal(text);
}

function isLikelyDashboardMonitoringMetricConvergenceFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!DASHBOARD_MONITORING_METRIC_CONVERGENCE_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !isDecisionCriticalDashboardMeasurement(text);
}

export function isLikelyRankingBoundaryFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!RANKING_BOUNDARY_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !RANKING_OUTCOME_CHANGING_PATTERNS.some((pattern) => pattern.test(text));
}

function isDecisionCriticalDashboardMeasurement(text) {
  const cleanText = stripNegatedDashboardDecisionWording(text);
  if (!/看板|dashboard|报表|数据集/i.test(cleanText)) return false;
  return DASHBOARD_DECISION_CRITICAL_PATTERNS.every((pattern) => pattern.test(cleanText));
}

export function isLikelyLegalChecklistFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!LEGAL_CHECKLIST_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !HARD_LEGAL_OR_USER_SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

function isLikelyReleaseReadinessFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!RELEASE_READINESS_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (DIRECT_UNSAFE_LAUNCH_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !PROVEN_BLOCKED_INTEGRATION_PATTERNS.some((pattern) => pattern.test(text));
}

function isLikelyChannelIntegrationReadinessFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!CHANNEL_INTEGRATION_READINESS_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (!READINESS_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !PROVEN_BLOCKED_INTEGRATION_PATTERNS.some((pattern) => pattern.test(text));
}

function isLikelyDeliveryReadinessFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!DELIVERY_READINESS_FOLLOWUP_PATTERNS.every((pattern) => pattern.test(text))) return false;
  return !PROVEN_BLOCKED_INTEGRATION_PATTERNS.some((pattern) => pattern.test(text));
}

function isLikelyReadinessSectionFollowup(issue = {}) {
  const text = issueText(issue);
  if (!text) return false;
  if (!READINESS_SECTION_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (DIRECT_LAUNCH_GATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (EXPLICIT_UNSAFE_COMPLIANCE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/主指标|分母|基线|归因|成败无法|无法判断|无法衡量|唯一.*(不可用|无法|不能)|无可用.*(fallback|兜底)|没有可用.*(fallback|兜底)/i.test(text)) return false;
  return true;
}

function isMonitoringExecutionOnly(text) {
  const monitoringScore = countMatches(text, MONITORING_EXECUTION_PATTERNS);
  if (monitoringScore < 2) return false;
  const coreProductScore = countMatches(text, CORE_PRODUCT_BLOCKING_PATTERNS);
  return coreProductScore <= 1;
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

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function issueText(issue = {}) {
  return [
    issue.question,
    issue.severityReason,
    issue.recommendedRevision,
    issue.blockedOutcome,
    issue.affectedPath,
    issue.whyReviewCannotPass
  ].filter(Boolean).join("\n");
}
