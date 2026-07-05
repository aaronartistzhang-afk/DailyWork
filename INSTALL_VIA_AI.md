# Install via AI — Instructions for Claude Code / Codex / other AI agents

> **You are an AI agent (Claude Code, Codex CLI, Cursor, etc.) that can run shell + WebFetch. The user wants to install a skill from this repo.** Follow the steps below in order. Be conversational with the user. Auto-detect whatever you can; ask only when you must. After install, verify and report.
>
> **Repo**: `https://github.com/aaronartistzhang-afk/DailyWork`

---

## Step 0 — Identify which skill the user wants

Look at the user's message:

- If they named a skill (e.g., `meeting-notes`, `metric-change-attribution`, `codex-review-gate`, `lark-comment-loop`, `audience-brief`, `blind-ab-verify`) → use that
- If they said "all" / "全部" → install all skills under `skills/`
- If unclear → ask: *"想装哪个 skill？目前可选：meeting-notes、metric-change-attribution、codex-review-gate、lark-comment-loop、audience-brief、blind-ab-verify（更多陆续会加）。"*

Set `SKILL_NAME` for use below.

**Skill class** — this determines which steps apply:
- **Lark skills** (e.g. `meeting-notes`, `lark-comment-loop`) — need `lark-cli`. `meeting-notes` additionally needs a bot `BOT_APP_ID` + Lark scopes (all steps apply). `lark-comment-loop` only needs a working `lark-cli` login with doc-comment read/reply scopes — **skip Steps 5 and 5.5** (no BOT_APP_ID).
- **Python-only skills** (e.g. `metric-change-attribution`) — pure Python, **no Lark / bot / scopes**. Need `python3` + `pandas` + `pyyaml`. **Skip Steps 5 and 5.5 entirely** (no BOT_APP_ID, no scope probe); use the Python branches in Steps 1 and 6.
- **Prompt-only skills** (`codex-review-gate`, `audience-brief`, `blind-ab-verify`) — plain SKILL.md instructions, **no runtime dependencies** (`codex-review-gate` assumes some second-model CLI like `codex` exists, but installs fine without it). Install = copy the skill folder into `~/.claude/skills/`. **Skip Steps 1, 5, 5.5 and 6** — nothing to probe or self-test.

Set `SKILL_CLASS` = `lark`, `python`, or `prompt` accordingly.

## Step 1 — Check prerequisites

### 1-python — `SKILL_CLASS=python` (e.g. `metric-change-attribution`)

Run silently and report only failures:

```bash
which git python3 2>&1
python3 -c "import pandas, yaml; print('deps ok')" 2>&1
```

Required:
- **git** — to clone the repo
- **python3** — to run the engine
- **pandas** + **pyyaml** — if the import line fails, tell the user:
  > ⚠️ 缺 Python 依赖。跑一下 `pip install pandas pyyaml`（或 `python3 -m pip install pandas pyyaml`）再回来。

No `lark-cli`, no bot, no scopes for this skill. When deps pass, **skip to Step 2** (and later skip Steps 5 / 5.5).

### 1-lark — `SKILL_CLASS=lark` (e.g. `meeting-notes`)

Run silently and report only failures:

```bash
which git lark-cli 2>&1
```

Required:
- **git** — to clone the repo
- **lark-cli** — required for any skill that talks to Lark

If `lark-cli` is missing, tell the user:
> ⚠️ 没装 lark-cli。先按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/shared/lark-cli-setup.md 装好再回来。

If `lark-cli` is installed, check authentication. **`lark-cli config show` exits 0 even when not configured**, so you must inspect the JSON body:

```bash
lark-cli config show 2>&1 | python3 -c "
import sys, json
raw = sys.stdin.read()
i = raw.find('{')
d = json.loads(raw[i:]) if i >= 0 else {}
if d.get('ok') is False:
    print('UNAUTHED:', d.get('error', {}).get('message', 'unknown'))
elif d.get('appId'):
    print('AUTHED:', d['appId'])
else:
    print('UNKNOWN:', raw[:200])
"
```

If output starts with `UNAUTHED:` → tell the user:
> ⚠️ lark-cli 没登录。请先跑 `lark-cli config init` + `lark-cli auth login` 再回来。

Don't proceed past Step 1 until prerequisites pass.

## Step 1.5 — Identify your own AI environment

You (the AI reading this) know what you are. Set `AI_ENV` based on:

- **`AI_ENV=claude-code`** — if you're Claude Code (you have native `~/.claude/skills/` auto-loading)
- **`AI_ENV=codex`** — if you're OpenAI Codex CLI (no skill auto-load; uses `~/.codex/AGENTS.md` or project `AGENTS.md`)
- **`AI_ENV=other`** — Cursor, Continue.dev, GPT custom action, etc. — no native skill mechanism, falls back to "paste at session start"

If genuinely uncertain, run a fingerprint check:
```bash
ls -d ~/.claude ~/.codex 2>/dev/null
```
- `~/.claude` exists → likely Claude Code
- `~/.codex` exists → likely Codex
- both / neither → ask the user: *"你用的是 Claude Code、Codex 还是别的 AI 工具？"*

This determines Step 4 install location.

## Step 2 — Clone or update the repo

Default location: `~/DailyWork`. Let the user override if they ask.

```bash
if [ -d ~/DailyWork/.git ]; then
  cd ~/DailyWork && git pull --ff-only
else
  git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
fi
```

Report briefly: *"✓ 仓库已就位 ~/DailyWork (commit: `<short-sha>`)"*

## Step 3 — Verify the skill exists

```bash
test -d ~/DailyWork/skills/$SKILL_NAME && ls ~/DailyWork/skills/$SKILL_NAME
```

If missing → tell user the available list:
```bash
ls ~/DailyWork/skills/
```
and ask them to pick again.

## Step 4 — Install (branch by AI environment)

### 4-A: Claude Code (`AI_ENV=claude-code`)

Symlink the skill folder into `~/.claude/skills/<name>/` so Claude auto-loads it:

```bash
mkdir -p ~/.claude/skills
SKILL_TGT=~/.claude/skills/$SKILL_NAME
SKILL_SRC=~/DailyWork/skills/$SKILL_NAME
if [ -L "$SKILL_TGT" ] && [ "$(readlink "$SKILL_TGT")" = "$SKILL_SRC" ]; then
  echo "(already linked)"
else
  rm -rf "$SKILL_TGT"  # in case of stale dir/file
  ln -s "$SKILL_SRC" "$SKILL_TGT"
fi
ls -la "$SKILL_TGT"
```

`SKILL_FILE=~/.claude/skills/$SKILL_NAME/SKILL.md` (this resolves through the symlink to the file in `~/DailyWork`).

Report: *"✓ Skill 已挂到 ~/.claude/skills/$SKILL_NAME（按触发词自动加载）"*

### 4-B: Codex CLI (`AI_ENV=codex`)

Codex has no native skill auto-load. Append the skill content to global Codex instructions so every session has it:

```bash
mkdir -p ~/.codex
SKILL_FILE=~/.codex/instructions.d/$SKILL_NAME.md   # we'll create this convention
mkdir -p "$(dirname "$SKILL_FILE")"

# Copy (not symlink — Codex aggregates files)
cp ~/DailyWork/skills/$SKILL_NAME/SKILL.md "$SKILL_FILE"

# If Codex's main instructions file doesn't already include this skill, append a marker
TOP_INSTR=~/.codex/instructions.md
mkdir -p "$(dirname "$TOP_INSTR")"
touch "$TOP_INSTR"
if ! grep -q "DailyWork:$SKILL_NAME" "$TOP_INSTR"; then
  # Use subshell append (more robust than heredoc + $(cat) for arbitrary file content)
  {
    echo ""
    echo "<!-- DailyWork:$SKILL_NAME — installed $(date -u +%Y-%m-%d) -->"
    cat "$SKILL_FILE"
  } >> "$TOP_INSTR"
fi
ls -la "$SKILL_FILE"
```

⚠️ Codex install is a **copy**, not a symlink — so future `git pull` won't auto-update the installed instructions. Tell the user this in Step 7.

`SKILL_FILE=~/.codex/instructions.d/$SKILL_NAME.md` for the patch step below.

Report: *"✓ Skill 已写入 ~/.codex/instructions.d/$SKILL_NAME.md 并追加到 ~/.codex/instructions.md（每个 Codex session 都会加载）"*

### 4-C: Other AI agents (`AI_ENV=other`)

No standard install path. Print the SKILL.md content and tell the user:

```bash
cat ~/DailyWork/skills/$SKILL_NAME/SKILL.md
```

> 📋 你的 AI 工具没有原生 skill auto-load。请：
> 1. 复制上面这段内容
> 2. 粘到你的 AI 的 system prompt / custom instructions / project-level config（如 Cursor 的 Rules、Continue 的 systemMessage、GPT Custom Action 的 instructions）
> 3. 把里面的 `<BOT_APP_ID>` 改成你自己的 cli_xxx
>
> 之后每次新 session 触发关键词即可调用。

For 4-C, skip Steps 5c, 5.5, 6 (we can't patch a file the user manages manually). Just give them the bot id auto-detect result from Step 5a if available.

## Step 5 — Configure BOT_APP_ID (auto-detect first, ask only if needed)

> **`SKILL_CLASS=python` → skip this entire step** (no BOT_APP_ID). Go straight to Step 6.

The skill content contains a placeholder `<BOT_APP_ID>` that must be replaced with the user's actual Lark bot app_id.

### 5a. Try auto-detect

```bash
lark-cli config show 2>/dev/null | python3 -c "import sys,json; raw=sys.stdin.read(); s=raw.find('{'); print(json.loads(raw[s:]).get('appId','') if s>=0 else '')"
```

If it returns `cli_xxxxxxxxxxxx` → you have the bot id. Confirm with user:
> 检测到你已配置的 bot app_id 是 `cli_a95b...`（脱敏显示前 8 位）。用这个吗？(Y/n)

If user agrees, use it.

### 5b. If auto-detect fails or user declines

Ask the user:
> 我需要你的 Lark bot app_id（格式 `cli_xxxxxxxxxxxx`）。
>
> **怎么获取**：
> - 已有 bot：去 https://open.feishu.cn 开发者后台 → 你的应用 → 凭证与基础信息 → 复制 App ID
> - 没 bot：详细步骤看 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/shared/bot-app-id.md
>
> 准备好后把 app_id 贴给我。

Wait for user reply.

### 5c. Patch the installed SKILL file (skip for `AI_ENV=other`)

Use the `SKILL_FILE` path determined in Step 4 (different per AI_ENV).

```bash
# $SKILL_FILE was set above (varies by AI_ENV)
sed -i.bak "s|<BOT_APP_ID>|$BOT_ID|g" "$SKILL_FILE"
rm -f "$SKILL_FILE.bak"
grep "BOT_APP_ID" "$SKILL_FILE" | head -3
```

For `AI_ENV=codex`, also patch `~/.codex/instructions.md` (since Step 4-B copied the content there too):
```bash
sed -i.bak "s|<BOT_APP_ID>|$BOT_ID|g" ~/.codex/instructions.md
rm -f ~/.codex/instructions.md.bak
```

### 5d. Local edit warning (only for `AI_ENV=claude-code`)

Patching a symlinked file edits the file *inside* `~/DailyWork`. Future `git pull` may show this as a local change. Offer:
> 要我设一下 `git update-index --skip-worktree` 让 git 忽略你对 BOT_APP_ID 的本地改动吗？这样以后 `git pull` 不会冲突。(Y/n)

If yes:
```bash
cd ~/DailyWork && git update-index --skip-worktree skills/$SKILL_NAME/SKILL.md
```

For `AI_ENV=codex`: not relevant (the install is a copy, not a symlink — `git pull` doesn't touch it).

## Step 5.5 — Sanity-check bot scopes (catch problems before runtime)

> **`SKILL_CLASS=python` → skip this entire step** (no Lark scopes).

The bot may have the right `app_id` but be missing required Lark API scopes. Catch this here, not at first skill use.

For `meeting-notes`, probe each required API once with the smallest possible call:

```bash
echo "=== Scope probe for meeting-notes ==="
TODAY=$(date -u +%Y-%m-%d)

echo -n "vc:meeting:read:        "
lark-cli vc +search --query "ping" --start "$TODAY" --end "$TODAY" --as user 2>&1 \
  | grep -oE 'missing required scope[^"]*|"ok": ?true|"code": ?0' | head -1

echo -n "contact:user:readonly:  "
lark-cli contact +get-user --as user 2>&1 \
  | grep -oE 'missing required scope[^"]*|"ok": ?true|"code": ?0' | head -1

echo -n "im:chat / im:message:   "
lark-cli im chat.members get --params '{"chat_id":"oc_invalid","member_id_type":"open_id"}' --as bot 2>&1 \
  | grep -oE 'missing required scope[^"]*|invalid|HTTP 400|chat[_-]?id' | head -1
```

For each line containing `missing required scope`, parse the scope name(s) and tell the user:
> ⚠️ Bot 缺少 scope：`<scope>`。
> 去 https://open.feishu.cn → 你的应用 → 权限管理 → 添加 → 重新发布版本 → 然后回来重跑。

If all probes pass → continue.

If any probe fails → don't claim "install successful" in Step 6; say "skill files 已就位，但 bot scope 还缺，按上面提示补完后即可使用".

## Step 6 — Verify install

**`SKILL_CLASS=python` (e.g. `metric-change-attribution`)** — verify the engine runs, independent of AI env:
```bash
cd ~/.claude/skills/$SKILL_NAME 2>/dev/null || cd ~/DailyWork/skills/$SKILL_NAME
python3 scripts/selftest.py     # → should end with "ALL PASSED"
```
If it prints `ALL PASSED`, you're done — the skill auto-triggers on 归因 / "why did X change" / WoW-MoM keywords. Tell the user to try: *"为什么这周触达率掉了？帮我归因 —— 数据在 data.csv"*. (Skip the Lark per-env checks below.)

For Lark skills, verify per env:

**`AI_ENV=claude-code`**:
```bash
ls -la ~/.claude/skills/$SKILL_NAME/
head -10 ~/.claude/skills/$SKILL_NAME/SKILL.md
```

**`AI_ENV=codex`**:
```bash
ls -la ~/.codex/instructions.d/$SKILL_NAME.md
echo "--- entries in ~/.codex/instructions.md ---"
grep "DailyWork:" ~/.codex/instructions.md
```

**`AI_ENV=other`**: nothing to verify automatically — ask user to confirm they pasted the SKILL.md content into their AI's system prompt.

Report:
> ✅ **$SKILL_NAME 装好了**！
>
> 下次开新 session 试试这条触发：
> ```
> 总结发给我自己 dry-run, <你的某条飞书妙记 URL>
> ```
>
> 想装其他 skill：再来找我说一句"再装一个 X"，我用同一套流程帮你装上。

## Step 7 — Update workflow

Tell the user (text varies slightly by env):

**`AI_ENV=claude-code`**:
> 📦 **以后更新**：
> ```bash
> cd ~/DailyWork && git pull
> ```
> Symlink 自动指向最新版本，不用重装。

**`AI_ENV=codex`**:
> 📦 **以后更新（Codex 是 copy 不是 symlink，要重装）**：
> ```bash
> cd ~/DailyWork && git pull
> # Then re-run the install (just say "重装 X" to your Codex agent)
> ```

**`AI_ENV=other`**:
> 📦 **以后更新**：拉新版后重新粘 SKILL.md 内容到你的 AI 配置里。

---

## 执行准则（给 AI 的注意事项）

- **不要静默失败**：每一步如果失败，说出哪一步、错误信息、用户能怎么办
- **不要重复确认**：能用 `&&` 串起来的命令就一次性跑完，别一步一确认
- **优先复用**：仓库 / 符号链接 / app_id 都先检测是否已存在
- **不要污染 home 目录**：除了 `~/DailyWork`、`~/.claude/skills/`、`~/.codex/instructions*` 之外不要新增文件
- **报告要精炼**：每步一行 ✓ / ✗ 即可；最后给出"下一步"
- **保护用户输入**：app_id 不是 secret，可以正常显示；以后如果有真正的 secret（如 token），只在 stdin 取，绝不打印到对话或日志
- **AI_ENV 自识别失败时**：宁可问用户也不要瞎猜——一旦装错位置就要清理两边
