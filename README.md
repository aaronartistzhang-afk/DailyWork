# DailyWork — AI Skills for Daily Work

> A growing collection of AI-powered skills for everyday work productivity. Built for [Claude Code](https://docs.claude.com/claude-code) and [OpenAI Codex CLI](https://github.com/openai/codex), with manual install paths for any other AI agent that can run shell commands.

**Author**: Aaron Zhang ([@aaronartistzhang-afk](https://github.com/aaronartistzhang-afk))

---

## 🧰 Skill Catalog

| Skill | What it does | Stack | Required scopes |
|---|---|---|---|
| [meeting-notes](skills/meeting-notes/) | 飞书妙记 URL → 精炼会议纪要 + 自动 @ 责任人 → 发到群/DM | Lark CLI · Sonnet+Opus hybrid | `vc:meeting:read` `vc:minute:read` `contact:user:readonly` `im:message.send_as_app` `im:chat.members` |
| [group-discussion-reviewer](skills/group-discussion-reviewer/) | 模拟产品组会评审一份 PRD：多评审员流水线 + 严格 P0 门禁 → 双轴结论（组内准入 / 模拟评审结果）+ P0/P1/P2。高保真可运行引擎 | Node ≥20 · zero deps | An OpenAI-compatible API key |
| [group-discussion-reviewer-methodology](skills/group-discussion-reviewer-methodology/) | 同款评审方法论，在对话里直接评审 PRD，无需 key、无需运行代码 | Pure prompt | None |
| [metric-change-attribution](skills/metric-change-attribution/) | 指标 WoW/MoM 变化归因：排名哪些 segment 驱动了 rate/total 变化，逐层下钻到根因（解释度/ep + factor split + turnover） | Python 3 · pandas · PyYAML | none (no Lark) |
| _(more coming)_ | | | |

---

## 🚀 Install

### Prerequisites (one-time, ~10 min)

> **Python-only skills** (e.g. [`metric-change-attribution`](skills/metric-change-attribution/)) skip steps 1–2 entirely — no Lark, no bot. They just need **Python 3** + `pip install pandas pyyaml`, plus an AI agent (step 3). The Lark prerequisites below apply only to the Lark-backed skills.

1. **`lark-cli`** installed and authenticated — see [shared/lark-cli-setup.md](shared/lark-cli-setup.md). Verify:
   ```bash
   lark-cli config show     # should show your appId
   ```
2. **Lark Custom App (bot)** with the scopes your chosen skills need — see [shared/bot-app-id.md](shared/bot-app-id.md). Note the app_id (`cli_xxxxxxxxxxxx`).
3. **An AI agent that can run shell commands** — Claude Code, Codex CLI, Cursor, etc.

### Recommended: one-message install

Open your AI agent and paste:

```
请按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md 装上 meeting-notes skill
```

The AI will:
1. Fetch the install instructions
2. Detect which AI agent it is (Claude Code / Codex / other) and pick the right install location
3. Clone the repo to `~/DailyWork`
4. Install the skill (symlink for Claude Code, copy+merge for Codex, paste-instructions for others)
5. Auto-detect your `BOT_APP_ID` from `lark-cli config show` (or ask if needed)
6. Sanity-check that the bot has all required Lark API scopes
7. Verify and tell you how to use it

After install, in any new session, just say:
```
总结发给我自己 dry-run, <some Lark meeting URL>
```

To install other skills, replace `meeting-notes` with the skill name.

### Supported AI agents

| AI agent | Install target | Auto-trigger |
|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/` (symlink) | ✅ via SKILL.md frontmatter |
| **Codex CLI** | `~/.codex/instructions.d/<name>.md` (copy) + appended to `~/.codex/instructions.md` | Always loaded each session |
| **Cursor / Continue / GPT custom action / others** | Paste SKILL.md content into AI's system prompt manually | Manual paste per session |

### Manual install — Claude Code

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
mkdir -p ~/.claude/skills
ln -s ~/DailyWork/skills/meeting-notes ~/.claude/skills/meeting-notes
${EDITOR:-nano} ~/.claude/skills/meeting-notes/SKILL.md   # replace <BOT_APP_ID>
```

### Manual install — Codex CLI

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
mkdir -p ~/.codex/instructions.d
cp ~/DailyWork/skills/meeting-notes/SKILL.md ~/.codex/instructions.d/meeting-notes.md
{ echo ""; echo "<!-- DailyWork:meeting-notes -->"; cat ~/.codex/instructions.d/meeting-notes.md; } >> ~/.codex/instructions.md
${EDITOR:-nano} ~/.codex/instructions.md   # replace <BOT_APP_ID>
```

### Manual install — Other AIs

Open the skill's `SKILL.md`, copy the entire content, paste into your AI's system prompt / custom instructions / project rules, replace `<BOT_APP_ID>` with your `cli_xxx`. Done.

### Updating

```bash
cd ~/DailyWork && git pull
```

- **Claude Code**: symlinks auto-update. Done.
- **Codex / others**: re-install (or just say "重装 meeting-notes" to your AI).

### Common errors

| Error | Cause | Fix |
|---|---|---|
| `command not found: lark-cli` | Not installed or not in PATH | See [shared/lark-cli-setup.md](shared/lark-cli-setup.md) |
| `lark-cli config show` returns `ok: false` | Not authenticated | Run `lark-cli config init` + `lark-cli auth login` |
| `missing required scope(s)` | Bot doesn't have the scope | Add scope on Lark Open Platform → republish app |
| `HTTP 230002 Bot can NOT be out of the chat` | Bot not in target group | Skills auto-handle by adding bot to chat first |
| `41050 no_user_authority` | Used `--as bot` for read-only API on external user | Use `--as user` instead |

---

## 📦 Install Just One Skill (sparse-checkout)

If you only want one skill without cloning the entire repo:

```bash
git clone --filter=blob:none --no-checkout https://github.com/aaronartistzhang-afk/DailyWork.git
cd DailyWork
git sparse-checkout set skills/meeting-notes shared
git checkout
```

Then run the relevant manual install command above against this sparse clone.

---

## 🏗️ Repo Structure

```
DailyWork/
├── README.md            ← you are here
├── INSTALL_VIA_AI.md    ← AI execution script for the one-message install
├── shared/              ← shared dependency docs
│   ├── lark-cli-setup.md
│   └── bot-app-id.md
└── skills/
    └── <skill-name>/
        ├── README.md    ← what the skill does + sample output + scopes
        ├── SKILL.md     ← the prompt that gets installed into your AI
        └── *.md         ← supporting files (worker prompts, configs)
```

---

## 🤝 Contributing

PRs welcome — especially new skills that follow the directory pattern above. Each skill should:
- Have a `README.md` with **what / when to use / how to invoke / sample output / scopes / known limitations**
- Have a `SKILL.md` that's self-contained and installable via the AI install flow (with `<BOT_APP_ID>` placeholder where needed, and Claude-Code-compatible YAML frontmatter)
- List its required Lark scopes in both the skill README and the top catalog table
- Include 1-2 anonymized examples in the README

---

## 📝 License

MIT
