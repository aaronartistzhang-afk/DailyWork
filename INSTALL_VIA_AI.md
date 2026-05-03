# Install via AI — Instructions for Claude Code

> **You are Claude Code (or any AI agent that can run shell + WebFetch). The user wants to install a skill from this repo.** Follow the steps below in order. Be conversational with the user. Auto-detect whatever you can; ask only when you must. After install, verify and report.
>
> **Repo**: `https://github.com/aaronartistzhang-afk/DailyWork`

---

## Step 0 — Identify which skill the user wants

Look at the user's message:

- If they named a skill (e.g., `meeting-notes`) → use that
- If they said "all" / "全部" → install all skills under `skills/`
- If unclear → ask: *"想装哪个 skill？目前可选：meeting-notes（更多陆续会加）。"*

Set `SKILL_NAME` for use below.

## Step 1 — Check prerequisites

Run silently and report only failures:

```bash
which git claude lark-cli 2>&1
```

Required:
- **git** — to clone the repo
- **lark-cli** — required for any skill that talks to Lark (most of them)

`claude` (Claude Code) is already running since you're reading this; no need to verify.

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

## Step 4 — Symlink into ~/.claude/skills/

```bash
mkdir -p ~/.claude/skills
# Skip if symlink already correct
if [ -L ~/.claude/skills/$SKILL_NAME ] && [ "$(readlink ~/.claude/skills/$SKILL_NAME)" = "$HOME/DailyWork/skills/$SKILL_NAME" ]; then
  echo "(already linked)"
else
  rm -rf ~/.claude/skills/$SKILL_NAME  # in case it's a stale dir/file
  ln -s ~/DailyWork/skills/$SKILL_NAME ~/.claude/skills/$SKILL_NAME
fi
ls -la ~/.claude/skills/$SKILL_NAME
```

Report: *"✓ Skill 已挂到 ~/.claude/skills/$SKILL_NAME"*

## Step 5 — Configure BOT_APP_ID (auto-detect first, ask only if needed)

The skill's `SKILL.md` contains a placeholder `<BOT_APP_ID>` that must be replaced with the user's actual Lark bot app_id.

### 5a. Try auto-detect

```bash
lark-cli config show 2>/dev/null | python3 -c "import sys,json,re; raw=sys.stdin.read(); s=raw.find('{'); print(json.loads(raw[s:]).get('appId','') if s>=0 else '')"
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

### 5c. Patch SKILL.md

Once you have the app_id (let's call it `$BOT_ID`):

```bash
# Use sed in-place (works for symlinks if target is writable)
SKILL_FILE=~/.claude/skills/$SKILL_NAME/SKILL.md
sed -i.bak "s|<BOT_APP_ID>|$BOT_ID|g" "$SKILL_FILE"
rm -f "$SKILL_FILE.bak"
# Verify:
grep "BOT_APP_ID" "$SKILL_FILE" | head -3
```

⚠️ **Warning to user**: this edits the file *inside* `~/DailyWork`. Future `git pull` may show this as a local change. Recommend they either (a) accept the local change, or (b) run `git update-index --skip-worktree skills/$SKILL_NAME/SKILL.md` after install to make git ignore the local edit.

Offer the `skip-worktree` option:
> 要我设一下 `git update-index --skip-worktree` 让 git 忽略你对 BOT_APP_ID 的本地改动吗？这样以后 `git pull` 不会冲突。(Y/n)

If yes:
```bash
cd ~/DailyWork && git update-index --skip-worktree skills/$SKILL_NAME/SKILL.md
```

## Step 5.5 — Sanity-check bot scopes (catch problems before runtime)

The bot may have the right `app_id` but be missing required Lark API scopes. Catch this here, not at first skill use.

For `meeting-notes`, probe each required API once with the smallest possible call:

```bash
echo "=== Scope probe for meeting-notes ==="
TODAY=$(date -u +%Y-%m-%d)

# vc:meeting:read (search uses meeting list API)
echo -n "vc:meeting:read: "
lark-cli vc +search --query "ping" --start "$TODAY" --end "$TODAY" --as user 2>&1 \
  | grep -oE 'missing required scope[^"]*|"ok": ?true|"code": ?0' | head -1

# contact:user:readonly
echo -n "contact:user:readonly: "
lark-cli contact +get-user --as user 2>&1 \
  | grep -oE 'missing required scope[^"]*|"ok": ?true|"code": ?0' | head -1

# im:chat (cheap call)
echo -n "im:chat / im:message: "
lark-cli im chat.members get --params '{"chat_id":"oc_invalid","member_id_type":"open_id"}' --as bot 2>&1 \
  | grep -oE 'missing required scope[^"]*|invalid.*chat_id|HTTP 400' | head -1
# (we expect "invalid chat_id" — that means scope works; "missing required scope" means it doesn't)
```

For each line that contains `missing required scope`, parse the scope name(s) and tell the user:
> ⚠️ Bot 缺少 scope：`<scope>`。
> 去 https://open.feishu.cn → 你的应用 → 权限管理 → 添加 → 重新发布版本 → 然后回来重跑。

If all probes pass → continue.

If any probe fails → don't claim "install successful" in Step 6; instead say "skill files 已就位，但 bot scope 还缺，按上面提示补完后即可使用".

## Step 6 — Verify install

```bash
ls -la ~/.claude/skills/$SKILL_NAME/
# Should show: SKILL.md → symlinked target
head -10 ~/.claude/skills/$SKILL_NAME/SKILL.md
# Should show frontmatter (--- name: ... description: ... ---)
```

Report:
> ✅ **$SKILL_NAME 装好了**！
>
> 下次开 Claude Code 在任何目录都能用。试试这条触发：
> ```
> 总结发给我自己 dry-run, <你的某条飞书妙记 URL>
> ```
>
> 想装其他 skill：直接 `ln -s ~/DailyWork/skills/<其他 skill> ~/.claude/skills/<其他 skill>`，或再来找我说一句"再装一个 X"。

## Step 7 — Update workflow

Tell the user:
> 📦 **以后更新**：
> ```bash
> cd ~/DailyWork && git pull
> ```
> 符号链接会自动指向最新版本，不用重装。

---

## 执行准则（给 AI 的注意事项）

- **不要静默失败**：每一步如果失败，说出哪一步、错误信息、用户能怎么办
- **不要重复确认**：能用 `&&` 串起来的命令就一次性跑完，别一步一确认
- **优先复用**：仓库 / 符号链接 / app_id 都先检测是否已存在
- **不要污染 home 目录**：除了 `~/DailyWork` 和 `~/.claude/skills/` 之外不要新增文件
- **报告要精炼**：每步一行 ✓ / ✗ 即可；最后给出"下一步"
- **保护用户输入**：app_id 不是 secret，可以正常显示；以后如果有真正的 secret（如 token），只在 stdin 取，绝不打印到对话或日志
