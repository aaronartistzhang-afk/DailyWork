---
name: lark-comment-loop
description: >-
  Use when 处理飞书文档（docx）里的未解决评论，尤其是"只看今天的评论"「拉今天的评论逐条改」
  「跑一轮评论迭代」「把 PRD 评论闭环」「回复并解决文档评论」这类需求。覆盖 PRD 迭代线
  （改完 resolve）与数据报告线（只回复不 resolve）两套相反规矩。飞书评论 API 无服务端
  时间过滤，本 skill 负责客户端按 create_time 过滤 + 归类 + propose-first 落改 + 逐条回复。
  触发词：「文档评论」「拉未解决评论」「只看今天的评论」「评论迭代」「resolve 评论」
  「lark-comment-loop」。
metadata:
  domain: pm / lark-docs
  input: docx token 或 URL
---

# 飞书文档评论闭环（lark-comment-loop）

拉一篇 docx 的未解决评论 → 按时间过滤到"今天的" → 归类 → **编号 propose 等确认** →
确认后逐条最小半径落改 → 逐条回复说明改法 → 按模式决定是否 resolve → 大改提议新版本。

**两条线规矩相反，别弄反**：
- **PRD 迭代线** = 改完 **resolve**（模式 `resolve`；writing-prds 委托本 skill 时显式传）。
- **数据报告线** = 只回复**不 resolve**（模式 `reply-only`，本 skill **默认**——更安全）。

**铁律**：propose-first——落改前一律先出编号清单等用户确认，绝不确认前动文档。

## 关键前置事实

- 飞书评论 API **无服务端时间过滤**：`file.comments list` 不接受 since/until 参数，
  "只看今天"必须**拉全量后客户端按 `create_time` 过滤**（本 skill 的核心新增逻辑）。
- `create_time` 是 **epoch 秒**（字符串）。"今天 0 点"按**本机时区**算。
- 编辑 docx 正文的机制与坑（相对路径 @file、整表 block_replace、@人 cite）见
  `~/.claude/skills/writing-prds/lark-editing.md`——本 skill 只管评论回路，正文落改照那份。
- lark-cli 版本注记：1.0.52 skills 与 1.0.60 binary 不同步、1.0.65 可升——**本波不升级**，
  遇命令行为异常先核 `lark-cli skills read lark-doc` 拿当前 schema，不要自行升级。

## 七步流程

### 1. 输入解析
- **文档**：接受 docx `token` 或完整 URL（URL 取 `/docx/` 后那段 token）。`file_type` 固定 `docx`。
- **`--since`**：默认**今天 0 点**（本机时区）。用户给别的（"这周""昨天起"）就换算成 epoch 秒。
  取今天 0 点 epoch：
  ```bash
  SINCE=$(date -v0H -v0M -v0S +%s)   # macOS BSD date；本机时区
  ```
- **模式**：`resolve | reply-only`，**默认 `reply-only`**。writing-prds 场景显式传 `resolve`。
- **可选 `--verify`**：跑完派 codex 逐条核对闭环（见第 7 步）。

### 2. 拉取 + 客户端时间过滤
```bash
# 拉全部未解决评论（分页拉全）
lark-cli drive file.comments list \
  --params '{"file_token":"<docx_token>","file_type":"docx","is_solved":false}' \
  --page-all
```
拉回后**客户端**按 `create_time >= SINCE` 过滤（API 无服务端过滤）：
```bash
# 上一条命令的 JSON 存为 comments.json，SINCE 为今天 0 点 epoch
jq --arg since "$SINCE" \
  '[.data.items[] | select((.create_time|tonumber) >= ($since|tonumber))]' \
  comments.json
```
- `create_time` 是 epoch 秒。**实测（2026-07-05，docx `file.comments list`）返回的是 JSON 数字**（如 `1781763012`），并非字符串——故上面的 `tonumber` 是**防御性**写法（对数字幂等，对字符串也生效），两种类型都能正确比较，保留即可。分页路径 `.data.items[]` 已实测一致；返回结构为 `{code,msg,data:{items[],has_more,page_token}}`。
- 过滤后 0 条 → 直接汇报"今天无新评论"，结束，不进后续步骤。
- 每条评论保留 `comment_id` 与最新一条 reply 的正文/quote（定位文中位置）。

### 3. 归类
把过滤出的评论逐条归入四类（**只决定风险标注，不决定是否跳过确认**——四类全部进第 4 步统一 propose，确认后才落改）：
- **术语**：改名、字段名口径统一 → 标注"低风险"。
- **格式**：排版、表格列、双语并列、导航标签 → 标注"低风险"。
- **内容精度**：公式、显示规则、跳转预填、数字口径 → 标注"改前核对"，不确定先问。
- **新需求**：评论提了新范围/新模块 → 标注"可能大改"，进第 6 步提议新版本。

### 4. 编号 propose 等确认（propose-first 铁律）
出一份**编号清单**给用户，每条含：`#序号｜类别｜评论原话摘要｜拟改法（一句）｜落点`。
- 翻译/口径不确定的，清单里**标注"待确认"并附具体问题**，不猜。
- **停在这里等用户确认**，绝不确认前动文档。

### 5. 确认后逐条落改（最小半径）
- **一个模块一个模块来**，一次只改一处，改动半径最小化——不顺手重构无关内容。
- 正文/表格落改照 `~/.claude/skills/writing-prds/lark-editing.md`：编辑前先 fetch 拿当前
  block id（不要用上一轮记下的 id）；改表走**整表 block_replace**；@file 用 cwd 相对路径。
- 仍有不确定的翻译/口径 → **回到第 4 步问，不硬改**。

### 6. 逐条回复 + 按模式 resolve
每条评论落改后回复说明**改了什么**：
```bash
lark-cli drive file.comment.replys create \
  --params '{"file_token":"<docx_token>","file_type":"docx","comment_id":"<comment_id>"}' \
  --data '{"content":{"elements":[{"type":"text_run","text_run":{"text":"已按建议改为…（一句说明改法）"}}]}}'
```
按模式决定是否 resolve：
```bash
# 仅 resolve 模式执行；reply-only 模式跳过这步
lark-cli drive file.comments patch \
  --params '{"file_token":"<docx_token>","file_type":"docx","comment_id":"<comment_id>"}' \
  --data '{"is_solved":true}'
```
- 模式 `resolve`（PRD 线）：回复 → resolve → 汇报（口径见「收尾」——今日范围与全文档 open 数分开报，不混淆）。
- 模式 `reply-only`（数据报告线，默认）：只回复，**不 patch**，评论留给对方自行解决。

### 7. 大改提议 + 可选 --verify
- 若某条评论触发**大改**（重排结构、推翻已有模块）：**不动原文档**，主动提议
  「新建 V(n+1) 承接」，让用户拍板，不在原文档上大动。
- **`--verify`**（可选）：跑完派 codex 逐条核对"评论是否真正闭环"——调交付物①
  `codex-review-gate` 的 numbers/plan 类核对，把（评论原话 → 改法 → 回复）三元组喂进去，
  让 codex 判每条是否名副其实。FAIL 项回到第 5 步补改。

## 收尾
- **重新拉一次全量未解决评论**（不带时间过滤的 `is_solved:false`），分开汇报两个数：
  「本轮（今日范围）已闭环 N 条；**全文档仍 open M 条**（含历史评论，未在本轮范围内）」。
  ⚠ 禁止只凭今日范围清零就宣称 open=0——今日过滤 ≠ 全文档。
- `resolve` 模式：附本轮改动清单；`reply-only` 模式：附已回复条数 + 未 resolve 说明（交对方处理）。
- 大改另立新版本的，回写新文档 token 到项目 memory。

## 分工声明
- 正文/表格落改机制 → `~/.claude/skills/writing-prds/lark-editing.md`（不重复）。
- PRD 写作全流程（判格式 → 需求背景 → 正文 → 评论迭代）→ `writing-prds`；
  其"第四步：评论迭代"已委托本 skill（模式=resolve）。
- `--verify` 的 codex 核对 → 交付物① `codex-review-gate`。
