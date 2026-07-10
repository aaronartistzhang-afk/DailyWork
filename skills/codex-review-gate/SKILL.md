---
name: codex-review-gate
description: >-
  跨模型只读审查门禁 —— 用 codex（GPT-5.6 Sol, xhigh reasoning）在只读沙箱里审查方案 / diff /
  SQL / 对外数字，提取 GO/NO-GO 裁决并循环到收敛，以及编排「老规矩」全流程
  （Fable 出 plan → plan 门禁 → Opus 子代理落地 → diff 门禁 → 测试）。
  当用户说「老规矩」「让 codex review 一下」「上集群前记得审查这个 SQL」「这些数字对外前复算一下」
  「跑一遍门禁」「/codex-review-gate」，或在方案完成 / 实现完成 / SQL 上集群前 / 结论数字进对外文档前
  需要一道独立审查关卡时使用。
  不适用于：产出 PRD（用 debate）、通用代码评审纪律（用 requesting/receiving-code-review）。
compatibility: >
  需要安装 Codex CLI（实测 codex-cli 0.142.5，`-s/--sandbox` 与 `-c key=value` 可用）。
  仅限 Claude Code 环境。lark-cli 可选（升级失败告警走 DM 时用）。
metadata:
  domain: workflow-orchestration
  models: {reviewer: gpt-5.6-sol, drafter: fable, implementer: opus}
---

# codex-review-gate（跨模型只读审查门禁）

把日常口头的「老规矩」固化成一道可复用的关卡：**每个高风险节点交给另一个模型（codex / GPT-5.6 Sol）在只读沙箱里独立审一遍，拿到明确的 GO / NO-GO，NO-GO 就修完重审，循环到收敛。** 审查者永远不写盘、不执行、不 commit —— 门禁本身必须无副作用。

**四种门禁模式**（`plan` / `diff` / `sql` / `numbers`）可单独调用，也可由**全流程模式**（老规矩）串起来。

## 何时用 / 不用

- **用**：方案定稿要过一道审查；实现完成要在 commit 前审 diff；SQL 上集群前要过 checklist；对外文档里的结论数字要逐个复算；或用户说「老规矩」要跑整条链。
- **不用**：
  - 要产出 PRD / 做多视角产品决策 → 用 `debate`（GPT 提案 + Claude 审查的对抗式辩论，是**生成**器，不是门禁）。
  - 要走通用代码评审的收 / 发纪律（怎么提审、怎么消化反馈、不盲从）→ 用 `requesting-code-review` / `receiving-code-review`。本 skill 是**跨模型的关卡机制**，那两个是**评审的行为纪律**，配合使用：本 skill 决定「什么时候、用谁、审什么」，那两个决定「拿到意见后怎么做」。

---

## 调用机制（所有模式共用）

审查一律用 codex 只读沙箱、后台运行、stdin 喂审阅物：

```bash
codex exec - --sandbox read-only \
  -c model=gpt-5.6-sol \
  -c model_reasoning_effort=xhigh \
  --skip-git-repo-check
```

- `-` ：从 stdin 读 prompt / 审阅物（把方案全文、diff、SQL、数字清单 + 审查指令一起管道喂入）。
- **`--sandbox read-only` 显式锁死**：exec 默认即 read-only + approval never，但仍显式加锁 —— 防版本漂移或 prompt 里出现「顺手改一下」被误当可写执行。门禁的铁律是**零副作用**：不写盘、不执行变更、不 commit。
- `-c model=gpt-5.6-sol` + `-c model_reasoning_effort=xhigh`：跨模型（对 Claude 的盲点互补）+ 最高推理档（审查值得慢）。
- `--skip-git-repo-check`：审阅物常从 stdin 来，不依赖当前目录是 git 仓库。
- **一律后台运行**：xhigh 审长文档 / 大 diff 常 >10 分钟，前台必超时。用后台任务跑，轮询结果，别阻塞主会话。
- **失败 / 超时自动重试 1 次**：第一次非零退出或超时 → 原样重投一次；再失败 → **停下报告用户**（附 stderr 摘要），不要静默降级、不要假装 GO。

**落盘前自检（已在 codex-cli 0.142.5 验证，装到别的机器时复核一次）**：跑 `codex exec --help`，确认 `-s, --sandbox` 与 `-c` 存在。若某版本无 `--sandbox` flag，改用等效 config（如 `-c sandbox_mode=read-only` 或 `-c 'sandbox_permissions=[...]'`）并在 manifest 记录实际用法；**绝不因 flag 缺失就退回可写模式**。

### GO / NO-GO 裁决协议（所有模式共用）

每次审查的 prompt 末尾都追加这段硬要求，让机器可提取：

> 审完在**最后一行**单独输出一行裁决，格式严格为 `VERDICT: GO` 或 `VERDICT: NO-GO`。若 NO-GO，在其上方用编号列出每一条阻断项（`[B1] …`），每条给出：问题、证据位置、修复建议。非阻断的改进意见放在 `NITS:` 区，不影响裁决。

提取与循环：

1. 抓 codex 输出**最后一行** `VERDICT:`（正则 `^VERDICT:\s*(GO|NO-GO)`）。抓不到 → 视为审查未完成，按「失败重试 1 次」处理；重试仍抓不到 → 报告用户，人工判读。
2. `GO` → 本模式通过，进入下一步（或结束）。
3. `NO-GO` → 把编号阻断项逐条落改（最小改动半径，一条一条来），改完把**新版本 + 上一轮阻断清单 + 逐条修复说明**重新喂 codex 复审。
4. **循环上限 3 轮**：第 3 轮仍 NO-GO（或阻断项在打转、来回反复不收敛）→ **停下升级问用户**，附三轮裁决摘要 + 当前未闭合阻断项，请用户裁断（是真问题、还是 codex 误判、还是要调方案）。绝不无限刷。

---

## 模式一：`plan`（方案门禁）

**触发**：方案 / 设计定稿，落地前要过审。**触发词**：「让 codex 审一下这个方案」「plan 门禁」。

1. 把方案全文（含背景、目标、步骤、回滚、验收）从 stdin 喂 codex，附审查指令：找逻辑漏洞、遗漏的边界 / 失败路径、回滚是否可行、验收是否可证伪、有没有更简单的做法、隐含假设是否成立。
2. 走 GO/NO-GO 协议。NO-GO → 改方案 → 复审，循环至 GO（≥3 轮不收敛升级）。
3. GO 后方案才允许进入实现。

## 模式二：`diff`（实现门禁）

**触发**：实现完成，commit 前要审。**触发词**：「diff 门禁」「commit 前审一下」。

1. `git diff`（或指定范围）全量从 stdin 喂 codex，附指令：正确性 bug、与方案是否一致、有没有引入回归、错误处理与边界、有没有偷偷扩大改动半径、测试是否覆盖改动。
2. 走 GO/NO-GO 协议。**GO 才允许 commit**；NO-GO → 改 → 复审。
3. 与 `requesting-code-review` 的分工：本步是**跨模型机器审**（GO 才 commit 的硬门）；`requesting-code-review` 是你**自己提审前的自检纪律**。两者叠加，不互斥。

## 模式三：`sql`（上集群门禁）

**触发**：SQL 要上集群 / 跑大数据前。**触发词**：「记得审查 SQL」「这个 query 上集群前过一下」。

把 SQL 全文（连同表结构 / 分区约定 / 口径说明，能给多少给多少）喂 codex，**强制逐项过下面六项 checklist**，每项单独给结论（PASS / FAIL + 证据）：

1. **join fanout（连接爆行）**：join key 是否唯一？多对多 join 有没有导致度量重复计数 / 分母虚增？该不该先去重 / 聚合再 join？
2. **口径混搭**：
   - **BC / non-BC 混算**：商业化 vs 非商业化口径有没有被当同一列直接加总 / 相除？
   - **UTC / 本地日界错位**：时间字段是 UTC 还是本地时区？`date` 切分用的日界和业务口径是否一致（跨天数据会错位）？
   - **周标格式**：周编号 / 周标（W25 vs W2025-25 vs ISO week）格式是否统一？有没有 W52/W53 幽灵周、跨年周错位？
3. **分区空转静默 0**：where 里的分区 / 日期过滤是否真命中有数据的分区？打错分区会**静默返回 0 行而不报错** —— 有没有防呆（如断言行数 > 0 / 分区存在性检查）？
4. **死分支**：`case when` / `if` 里有没有永远走不到的分支、恒真 / 恒假条件、被前面条件吞掉的判断？
5. **collider 因果缺陷**：有没有在 where / join 里对「结果变量」或「中介 / 对撞变量」做了条件过滤，从而引入选择偏差、扭曲了想观察的关联？（分析型 SQL 尤其查这条。）
6. **量级水位锚定**：核心度量的量级是否和已知锚点对得上（DAU / 大盘触达 / 上周同口径值）？有没有一个「这个数应该落在 X 附近」的水位判断，防止算出量级离谱的数还浑然不觉？

走 GO/NO-GO：任一项 FAIL → NO-GO → 改 SQL → 复审。全 PASS 才 GO 上集群。

## 模式四：`numbers`（对外数字门禁）

**触发**：结论里的数字要进对外文档 / 汇报 / 发出去前。**触发词**：「这些数字对外前复算一下」「numbers 门禁」。

1. 列出对外文档里**每一个结论数字**及其来源（哪张表 / 哪个 cell / 哪段计算）。
2. 喂 codex 逐个复算：重算一遍看能否对上、单位 / 百分比 vs 百分点 / 分子分母是否配对、跨段落 / 跨表引用的同一个数是否一致（如大盘触达率 vs 各渠道贡献合计）、Σ 是否闭合。
3. 走 GO/NO-GO：任一数字对不上 → NO-GO → 修数 / 修口径 → 复审。全对才 GO 放行。

---

## 全流程模式：「老规矩」

**触发词**：「老规矩」「按老规矩来」。这是把上面模式串成一条端到端流水线，**模型分工显式固定**：

| 阶段 | 谁做 | 做什么 |
|---|---|---|
| 1. 出方案 | **Fable**（主会话起草） | 产出实现 plan（可先走 `writing-plans` 定结构） |
| 2. **plan 门禁** | **codex / GPT-5.6 Sol** | `plan` 模式审方案 → GO/NO-GO 循环至 GO |
| 3. 落地 | **Opus 子代理** | 按已 GO 的 plan 实现，接 `superpowers` 纪律：`writing-plans`（若还没成文）→ `subagent-driven-development` 拆任务 → `test-driven-development` 先测后码 |
| 4. **diff 门禁** | **codex / GPT-5.6 Sol** | `diff` 模式审实现 → GO 才 commit |
| 5. 测试 | Opus / 主会话 | 跑测试 + `verification-before-completion`，证据齐了才算完 |

要点：
- **模型分工不可含糊**：Fable 起草、GPT-5.6 Sol 审查、Opus 落地 —— 跨模型互补盲点是整条链的价值来源。
- 每道门禁都走上面的 GO/NO-GO 协议与 3 轮升级规则。
- 若 plan 里含 SQL 或对外数字，在对应节点顺带插 `sql` / `numbers` 门禁。
- 全程 codex 只读、后台跑、失败重试 1 次。

---

## 与相邻 skill 的分工声明

| skill | 它负责 | 与本 skill 的边界 |
|---|---|---|
| `debate` | 跨模型**对抗式辩论产 PRD**（GPT 提案 + Claude 审查，生成器） | 它**生产**产品文档；本 skill 是**审查关卡**，不生产内容。debate 出的方案可再走本 skill 的 `plan` 门禁 |
| `requesting-code-review` | 提审前的自检纪律（改动是否达标、要不要审） | 决定**要不要审 / 审前自查**；本 skill 决定**用谁审（跨模型机器审）、GO 才放行** |
| `receiving-code-review` | 拿到评审意见后的消化纪律（验证、不盲从、不表演性同意） | 决定**拿到 codex 意见后怎么做**；本 skill 负责**把意见拿到手（裁决提取 + 循环）** |

一句话：**debate 生成、本 skill 设关卡、requesting/receiving-code-review 定评审行为纪律。** 四者组合而非替代。

---

## 禁忌

| 不要 | 原因 |
|---|---|
| 审查用可写 / 可执行沙箱 | 门禁必须零副作用；只读是硬约束 |
| 前台跑 xhigh 长审查 | 必超时；一律后台 |
| 抓不到 VERDICT 就当 GO | 未收敛不是通过；抓不到=审查未完成 |
| NO-GO 无限刷 | 3 轮不收敛升级问用户，别烧钱打转 |
| 失败静默降级放行 | 重试 1 次仍失败要停下报告，不能假装通过 |
| 用本 skill 去产出 PRD | 那是 debate 的活；本 skill 只审不产 |
| SQL 门禁跳过任一 checklist 项 | 六项逐项过，最贵的坑都在被跳过的那项里 |
