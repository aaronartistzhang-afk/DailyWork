---
name: blind-ab-verify
description: >-
  防污染盲测 A/B 闭环 —— 改动落地后，两个变体谁更好且需要人工盲读时，用隔离分臂子代理生成、
  盲包组装（含阳性/阴性对照 + do-no-harm 硬门）、四栏盲评、回灌解析、三段式 verdict，
  并强制声明保真度天花板（prompt-level ≠ live pipeline）。
  当用户说「A/B 验证这个改动」「盲测一下」「打出来我盲读」「防止上下文污染」「两版哪个好」
  「/blind-ab-verify」，或一个 skill/prompt 改动已落地、需要在不被变体标签污染的前提下判两版优劣时使用。
  不适用于：动工前的对抗式方案设计 / 审查（用 debate 或 codex-review-gate，属左移）；
  单轮无对照的主观比稿；需要真实线上流量的效果实验（那要 eng-gated 的 live-RPC）。
  单版复现：「帮我盲跑一遍这个 skill 看说明书全不全」「干净目录独立复现」「skill 打包验收」
  "blind-repro this skill package" → 走模式 B（单版说明书完备性、非两版对比）。
compatibility: >
  需要能起并行子代理的环境（Claude Code / Agent SDK）。分臂执行子代理一律 model=opus（执行层模型分工惯例）。
  盲评环节需要人（你本人）离线盲读回灌，不是全自动。底座依赖 dispatching-parallel-agents 的并行原语。
metadata:
  domain: workflow-verification
  models: {arm-generator: opus, blind-judge: human}
  layer: 右移（改动落地后的验证关卡）
---

# blind-ab-verify（防污染盲测 A/B 闭环）

改动已经落地了（新版 prompt / 新版 skill / 两版文案），现在要回答一个问题：**新版真的更好吗，还是只是我以为更好？** 人一旦知道「哪个是我改的新版」，盲读就废了——会不自觉地帮新版找优点。本 skill 把这道判断固化成一条闭环：**每个变体交给一个完全隔离、不知道自己是哪一臂的子代理生成 → 打成去标签的盲包（含对照组）→ 你本人离线盲读打分 → 回灌解析 → 三段式 verdict + blind-packet 留痕。** 从生成到打分，谁是新版这件事对判者永远保密，直到回灌那一刻。

**它不产 PRD、不设计方案、不做线上实验**——**模式 A** 只在「改动已落地、要判两版优劣、且这个判断必须人工盲读」这个窄口上工作（单版 skill 包能否独立跑通见下方**模式 B**）。

## 何时用 / 不用

- **用**：一个 prompt / skill 改动已经落地，要在不被变体标签污染的前提下判新旧两版谁更好；两版一句话文案要盲读选一个；怀疑之前的「新版更好」结论是自己脑补出来的，想要一次干净的复验。
- **不用**：
  - **动工前**要对抗式地设计 / 审查方案（找漏洞、定结构、GO/NO-GO）→ 用 `debate`（生成 PRD）或 `codex-review-gate`（跨模型审查门禁）。这两个是**左移**——在改动**之前**。本 skill 是**右移**——在改动**之后**判效果。
  - 需要真实线上流量、真实用户行为的效果验证 → 那是 eng-gated 的 live-RPC / `custom_rpc_server` 实验，**不是本 skill 能做的**（见下方「保真度天花板」——本 skill 只能到 prompt-level，越过这条线的主张一律标 UNPROVEN）。
  - 单轮、无对照、纯主观的比稿 → 直接比即可，不必上盲测机器（**若目的是验单个 skill 包能否照说明书独立跑通，见下方模式 B**）。

**一句话分工判据**：动工前的对抗设计 / 审查 = 左移（`debate` / `codex-review-gate`）；改动落地后两个变体谁更好且需人工盲读 = 右移**模式 A**、单个 skill 包独立复现验收 = 右移**模式 B**（均**本 skill**）。底座是 `dispatching-parallel-agents` 的并行原语，本 skill 在其上加一层**盲测语义**（去标签、对照、盲序、回灌）。

---

## 铁律一：分臂隔离（防污染的地基）

**每一臂 = 一个独立子代理，彼此不共享上下文。** 这是整套方法的地基，塌了后面全废。分臂子代理一律 `model=opus`（执行层模型分工惯例）。

给每个分臂子代理的 prompt 必须满足**分臂三铁律**：

1. **无变体标签**：prompt 里不出现「这是新版 / 旧版 / OLD / NEW / 变体 A / 你是被改进的那个」。子代理不知道自己是哪一臂。
2. **无假设**：不写「我们认为新版会更自然」「预期这版能修好掉奖问题」。任何方向性暗示都会让子代理往那个方向使劲，制造伪信号。
3. **无预期结果**：不写「应该输出带奖励的文案」「理想情况下 CTR 更高」。让它按 prompt 本身产出，不迎合。

配套两条硬约束：

4. **版本 pin 死**：每臂用到的 skill / prompt 版本**逐个钉死并写进 blind-packet**（例：`OLD = gen 0.5.0 + components/scoring 0.0.1`；`NEW = gen 0.6.0 + components/scoring 0.0.2`）。含糊的「新版」不算 pin。
5. **无关变量跨臂 constant**：只让「被测的那个东西」在两臂间变，其余全部保持一致（例：region localization skill 在两臂间**held constant**）。任何没 constant 住的变量都会变成混杂因子（confound），让结果既不能证也不能否——见范例里 de/pl 两行就是这么废掉的。

**反模式声明（已被你的实践作废，明文钉在这里）**：

> **单 agent 两头都做 = 污染。** 让同一个 agent 先生成 OLD 再生成 NEW（或先看到一版再改出另一版）——它带着上一臂的记忆和「我在做 A/B」的自觉进第二臂，两臂不再独立。你早期几轮就是这么做的，**已被本方法明确 supersede**：范例 `examples/blind-packet-region-emoji.md` 和 `examples/blind-packet-reward-surfacing.md` 都在正文里写明「Prior/earlier contaminated single-agent-does-both rounds are superseded by this report」。任何新的验证若退回单 agent 两头做，直接判无效。

---

## 铁律二：盲包组装（对照 + do-no-harm 硬门）

分臂产物到手后，打成**盲包**交给判者。盲包不是简单把两版并排——它要制造一个「判者无法从位置或标签反推哪版是新版」的环境，并内置校准与安全网。

1. **位置随机化（P/Q）**：每条对比项里，把两臂的产物随机指派为 **P** 和 **Q**（哪臂占 P 每条独立随机），判者只见 P/Q 不见 OLD/NEW。P↔臂 的映射表单独存盘，回灌时才解。
2. **阳性对照（positive control）**：盲包里塞入至少一条「有明显好坏之分」的对子（一个明显好、一个明显差）。**判者若连这条都挑不出好的，说明判者本身没校准，整轮作废重来。** 范例里每次都写「Positive control PASSED（judge picked the obviously-good option → calibrated）」——这是判者可信的前提，不是可选项。
3. **阴性对照（negative control）**：塞入「本不该出现某行为」的输入，看两臂会不会误触发（例：role=NONE 的 campaign 本不该 surface 奖励；范例中 OLD 在 7/8 条上凭空发明了奖励，NEW 只 1/8——这条对照本身就是一个决定性 win）。阴性对照抓的是「新版有没有制造新的坏行为」。
4. **do-no-harm 回归组单列硬门**：把「绝不能退化」的一组关键输入**单独拉一栏**，作为**硬门**——新版在这组上只要出现退化（原来对的现在错了、原来干净的现在脏了），**无论别处赢多少，整体不许 ship**。do-no-harm 是**一票否决**，不参与「胜负相抵」的加总。

盲包组装完，判者拿到的应该是：一列 P、一列 Q、混在其中且判者不知道的阳性 / 阴性对照、单列出来的 do-no-harm 回归组——**没有任何一处泄露哪版是新版。**

---

## 铁律三：四栏盲评 schema（你自发固定的判据）

判者（你本人）离线逐条盲读，每条只填四栏。**这四栏是你实践里自发收敛出来的最小充分判据，不要增删**：

| 栏 | 判什么 | 反面（触发即扣） |
|---|---|---|
| **① 胜者** | 这条 P 还是 Q 更好？（或 tie） | —— |
| **② 形状对不对** | 产物的结构 / 长度 / 位置符合预期形态吗（例：emoji 该在 END 却在 START；奖励该 surface once 却 title+content 都塞） | 形状错 = 即使「胜」也不算干净赢 |
| **③ 无硬拔** | 有没有「硬凹 / 尬塞」的痕迹（forced / awkward）——把某要素生扭进去、挂成一个 dangling clause | 有硬拔 = 记 forced flag，计数进结果表 |
| **④ 无编造** | 有没有凭空捏造不存在的东西（发明一个根本没有的奖励 / 编一个假事实 / 假的字段值） | 有编造 = 记 fabrication，这是 governance 级问题 |

判者**只填这四栏**，不写「我觉得这可能是新版所以……」。整个盲评过程判者不知道 P/Q 对应关系。

---

## 回灌解析

判者填完四栏、盲评封存后，才取出 **P↔臂映射表**做回灌，把「P 赢了 6 条」翻译成「NEW 赢了 6 条」。回灌产出**结果表**（照抄范例的表结构）：每个客观维度分 OLD / NEW 两列 + 一句 read（谁赢 / tie / confounded）。典型行：

- surface-compliance（该出现的出现了吗）：`OLD 1.00 / NEW 1.00`
- negative control（不该出现的没出现吧）：`OLD 7/8 误发 / NEW 1/8` → NEW win
- blind quality（盲读谁更好计数）：`NEW 6 / OLD 4` 或 `3–3 tie`
- forced/awkward 计数：`OLD 2 / NEW 3`
- do-no-harm 回归组：逐项 pass/fail（**任一 fail = 硬门未过**）

回灌时**同时标出哪些行是 confounded**（没 constant 住的变量污染了的行）——confounded 的行既不能证也不能否，明文标出、不许当证据用（范例 de/pl 就是范本）。

---

## 三段式 verdict

回灌完，出 verdict。**必须严格三段，缺一不可**：

1. **Methodology sound?**（方法本身立不立得住）——隔离是否守住、阳性对照是否 PASS、打分是否确定性 / 盲序是否强制。方法塌了，后面结论一律不作数。范例写法：`Methodology: sound (isolation held, positive control passed, deterministic scrub + blind judge)`。
2. **主张是否被证明（含诚实回退）**——被测主张在**本保真度下**到底证没证明。**关键纪律：如果这个保真度根本证不了主张，必须诚实写 UNPROVEN，并说明为什么此处不可证、要升到哪一层才能证。** 范例的教科书式回退：`Main-lift claim: UNPROVEN at prompt level — and now known to be unprovable here, because OLD doesn't drop in isolation. Escalate to the live-pipeline RPC.` 绝不把「我这层测不出」粉饰成「没问题」。
3. **Net signal**——把上面拆开的信号收成一句「这个改动净下来是什么」：哪些是清晰 win、哪些是黄旗（要 retune）、哪些是硬门 fail（不许 ship）。范例：`suppression-control 是清晰 win；forced-surfacing 是黄旗要 retune；不要把「两臂都 100%」误读成「fix 不必要」——它意味着 bug 在生成器 prompt 下游，reframe 了这个 fix。`

### ship 判据：tie + do-no-harm 不退化即可 ship

**判定规则**：新版**不必赢**才 ship。若盲读结果是 **tie（3–3 这类）且 do-no-harm 回归组零退化**，即达到 ship 条件——因为新版在没让任何东西变差的前提下拿到了它要修的那个东西（范例 `examples/blind-packet-naturalness.md`：NEW2 拿到 `3–3 tie` + `forced 从 5/6 降到 1/6` + `reward presence 保持 6/6`，判为达标 ship）。反之，**do-no-harm 组只要一项 fail，无论盲读赢多少都不许 ship**（硬门一票否决，见铁律二第 4 条）。

---

## 保真度天花板（强制声明，不可省）

**每一份 verdict 都必须显式写明保真度天花板。** 这是在某 agent 项目上吃过两次亏才钉死的纪律：prompt-level 的盲测能证的东西**有一条硬上限**，越过这条线的主张一律标 UNPROVEN 并注明要 eng-gated 才能证。

必写清楚的三点：

1. **prompt-level ≠ live pipeline**：本盲测跑的是隔离的 prompt / 单 skill，**没跑** live 多 agent 编排（orchestrator loop、`load_skill`、真实评分 / 因果检查工具都不在此执行）。
2. **哪些结论此层不可证、须 eng-gated**：凡是依赖「整条流水线的下游行为」（多 skill 叠加掉字段、>N-char 的 field-DROP、judge / orchestrator 的候选选择）的主张，prompt-level **测不出**，只有部署服务当 `custom_rpc_server` 实验目标（eng-gated）或挖线上 trace 才能证。范例 `examples/blind-packet-reward-surfacing.md` 的血泪教训：`两臂都 100% surface → 隔离生成器根本没有 drop 可修 → prompt-level 是测主 lever 的错误仪器，只有 live-RPC full pipeline 能验`。
3. **N 与输入构成的真实边界**：小 N 确定性 spot check 不是 rate / 百分比；合成输入 vs 真实 trace 要分清；单语种（如 en）证的不能外推到 fr/vi/ru（范例明确 `en 是简单 case，其它语种更高风险，需 native review`）。

**天花板一句话模板**（放进 verdict 顶部）：`Fidelity ceiling (honest): prompt-level only — NOT the live multi-agent pipeline; true end-to-end still needs the deployed service as an eng-gated custom_rpc_server experiment.`

---

## blind-packet 留痕（模板）

每次跑完，落一份 blind-packet（建议命名 `blind-packet-<RunID>-<YYYYMMDD>.md`），字段如下。**Caveats 一栏必须随任何引用一起携带**——引用结果表却不带 Caveats = 断章取义，明令禁止。

```markdown
# Blind A/B — <被测改动一句话> — contamination-proof. RESULTS + honest verdict

## Run 元信息
- Run ID: <wf_xxxx 或自定义唯一 id>
- 分臂版本 pin: OLD = <逐个版本号>；NEW = <逐个版本号>
- 跨臂 constant 的变量: <列出 held-constant 的 skill / 变量>
- N 与输入构成: <总条数 + 类型拆分，如 6 promotable-drop / 2 governance / 2 none>
- 阳性对照: PASSED / FAILED（FAILED → 本轮作废，不出 verdict）
- 阴性对照: <结果，如 role=NONE 误发 OLD x/y vs NEW x/y>

## 结果表
| metric | OLD | NEW | read |
|---|---|---|---|
| <客观维度逐行，含 do-no-harm 回归组单列> | | | win / tie / confounded / **HARD-GATE fail** |

## Fidelity ceiling
<prompt-level ≠ live pipeline；哪些结论 UNPROVEN、须 eng-gated；N/语种边界>

## Caveats（引用本 packet 时必须一并携带）
1. <prompt-level not live pipeline；工具未执行>
2. <哪些行 confounded、不作证据>
3. <合成 vs 真实输入；语种覆盖边界>
4. <小 N，非 rate；supersede 了哪些早期污染轮次>

## Net verdict
1. Methodology sound? — <sound / 塌在哪>
2. 主张是否证明（含诚实回退）— <PROVEN at this fidelity / UNPROVEN here, escalate to ...>
3. Net signal — <清晰 win / 黄旗 retune / 硬门 fail>
Ship 判据: <tie + do-no-harm 不退化 → ship / do-no-harm fail → 不许 ship>
```

**三个脱敏范例**（随本 skill 附在 `examples/`，可直接读作模板参照；均由真实验证实物脱敏改写而来——项目名泛化、数字模糊、id 全抹）：

- `examples/blind-packet-reward-surfacing.md`
  —— 结果表 + 阳性对照 PASSED + 「主 lift 在 prompt-level 不可证、须升 live-RPC」的诚实回退范本；血泪教训「两臂都 100% ≠ fix 不必要」。
- `examples/blind-packet-region-emoji.md`
  —— 分臂三铁律 + 版本 pin + 跨臂 constant + manipulation check（机制证明）+ confounded 行明标 + Caveats 必随携带 + supersede 单 agent 污染轮次的范本。
- `examples/blind-packet-naturalness.md`
  —— 四栏盲评（尤其 forced/awkward 计数）+ 「tie + do-no-harm 不退化即达标」判据 + do-no-harm（reward presence 保持）作硬门的范本。

---

## 与相邻 skill 的分工声明

| skill | 它负责 | 与本 skill 的边界 |
|---|---|---|
| `debate` | 跨模型对抗式辩论**产 PRD / 定方案**（生成器，动工前） | **左移**：在改动之前生成 / 论证方案；本 skill 在改动**之后**判效果。debate 出的方案落地后，可用本 skill 盲测两版 |
| `codex-review-gate` | 跨模型只读**审查门禁**（方案 / diff / SQL / 数字，动工前 GO/NO-GO） | **左移**：审「该不该这么做 / 有没有 bug」；本 skill 判「做完了新旧两版谁更好」（模式 A）/「单版 skill 包说明书完备性」（模式 B）。前者是关卡，后者是效果验证 |
| `dispatching-parallel-agents` | 并行子代理的**基础原语**（隔离上下文、精确构造指令） | **底座**：本 skill 用它起隔离分臂；本 skill 在其上加**盲测语义层**（去标签 / 对照 / 盲序 / 回灌）。没有它就没有分臂隔离 |

一句话：**debate 生成、codex-review-gate 设关卡（二者左移）、dispatching-parallel-agents 提供并行底座、本 skill 做落地后的盲测验证（右移）。**

---

## 模式 B：单版独立复现（single-version blind repro）

**本文件其余各节（含下方禁忌表）默认的『本 skill 只做两版 A/B』窄口，自本段起扩展为并列两模式**：模式 A=两版对比（上文全部）、模式 B=单版复现（本段）。两者共享「隔离子代理」底座，但判据与产出都不同——别混用。

**何时用**：要验一个 skill 包 / prompt 包"换个人、干净环境能不能照说明书独立跑通"，而不是比两版优劣——skill 打包验收、发布前的最后一道检查。

**与相邻能力的分工**：
- 对**模式 A**：A 判两版谁更好（需人工盲读）；B 判单版说明书完备性（产出缺陷清单）。
- 对**作者自测**（写/改 skill 的人自己跑测试）：作者知道答案、查的是合规；模式 B 把成品包交给**不知答案的隔离复现者**盲跑。**区分特征 = 盲 / 隔离**。
- 对**禁忌表「单 agent 两头都做 A/B = 污染」（下方）**：那条禁的是 A/B **两臂**由同一 agent 兼做（带上一臂记忆进第二臂）；模式 B 是**单版、单臂、单跑**，无第二臂可串味，不在该禁忌射程。**但**若让同一 agent 对新旧两个包**先后各跑一轮模式 B 变相比对**，即退回该禁忌、判无效——那种比对该走模式 A 的隔离分臂。

**四条硬 guardrail**：
1. **干净目录**——别在孵化这个 skill 的项目里跑：那里的 CLAUDE.md 与周边文件会替 skill "补课"，测出来的是环境不是说明书。用无关 cwd / 空项目。
2. **答案隔离**——复现者不许读上一轮的产物：那是上一轮的答案，读了就不是独立复现。
3. **产出是缺陷清单**——「SKILL.md 哪里说不清、哪一步卡住、哪个脚本报错——如实列出来，这比跑通更有价值」。验收产出 = **缺陷清单，不是通过率**。
4. **提问即信号**——「你问什么，本身就是这次验证要收集的信息」。复现者每个"这里没说清"都记进缺陷清单。

**留痕**：模式 B 产出 `blind-repro-<skill>-<YYYYMMDD>.md`：跑通 / 卡住分段 + 缺陷清单（哪步、哪句、哪个脚本报错）+ 是否需改 SKILL.md。

---

## 禁忌

| 不要 | 原因 |
|---|---|
| 单 agent 两头都做 A/B | = 污染，两臂不再独立；已被你的实践 supersede，退回即判无效 |
| prompt 里写变体标签 / 假设 / 预期结果 | 任一都会让子代理迎合方向，制造伪信号（分臂三铁律） |
| 没 constant 无关变量就当结果用 | confounded 的行既不能证也不能否；必须明标、不作证据（de/pl 范本） |
| 阳性对照 FAIL 还出 verdict | 判者没校准，整轮作废重来——这是判者可信的前提 |
| do-no-harm 组退化了还 ship | 硬门一票否决；无论别处赢多少都不许 ship |
| 判者知道 P/Q 对应关系后再打分 | 盲序破了，盲评就废了；回灌只在打分封存**之后**做 |
| verdict 不写保真度天花板 | prompt-level ≠ live pipeline；越线主张须标 UNPROVEN + eng-gated，你已吃过两次亏 |
| 把「我这层测不出」粉饰成「没问题」 | 诚实回退是三段式 verdict 的硬要求；UNPROVEN 就写 UNPROVEN |
| 引用结果表不带 Caveats | = 断章取义；Caveats 必须随任何引用一起携带 |
| 用本 skill 去设计 / 审查方案 | 那是 debate / codex-review-gate 的活（左移）；本 skill 只做落地后验证（右移） |
