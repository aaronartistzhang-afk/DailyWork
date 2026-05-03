# DailyWork — AI Skills for Daily Work

> A growing collection of AI-powered skills for everyday work productivity. Built for [Claude Code](https://docs.claude.com/claude-code) but adaptable to any AI agent that can call shell commands.

**Author**: Aaron Zhang ([@aaronartistzhang-afk](https://github.com/aaronartistzhang-afk))

---

## 🧰 Skill Catalog

| Skill | What it does | Stack |
|---|---|---|
| [meeting-notes](skills/meeting-notes/) | 飞书妙记 URL → 精炼会议纪要 + 自动 @ 责任人 → 发到群/DM | Lark CLI · Sonnet+Opus hybrid |
| _(more coming)_ | | |

---

## 🚀 Quick Start — One-message install

> **Pre-requisite (one-time, ~10 min)**: install `lark-cli` and create a Lark bot. See [INSTALL.md](INSTALL.md).

Open your AI agent (Claude Code, Codex CLI, Cursor, etc.) and **paste this single message**:

```
请按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md 装上 meeting-notes skill
```

The AI will:
1. Fetch the install instructions
2. Check prerequisites (`git`, `lark-cli`)
3. **Detect which AI agent it is** (Claude Code / Codex / other) and pick the right install location
4. Clone the repo to `~/DailyWork`
5. Install the skill (symlink for Claude Code, copy+merge for Codex, paste-instructions for others)
6. Auto-detect your bot app_id from `lark-cli config show` (or ask if needed)
7. Sanity-check that the bot has the required Lark API scopes
8. Verify the install and tell you how to use it

After install, in any new session, just say:

```
总结发给我自己 dry-run, <some Lark meeting URL>
```

### Install other skills the same way

```
请按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md 装上 <skill-name>
```

### Supported AI agents

| AI agent | Install target | Auto-trigger |
|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/` (symlink) | ✅ via SKILL.md frontmatter |
| **Codex CLI** | `~/.codex/instructions.d/<name>.md` (copy) + appended to `~/.codex/instructions.md` | Always loaded each session |
| **Cursor / Continue / GPT custom action / others** | Paste SKILL.md content into AI's system prompt manually | Manual paste per session |

### Manual install (Claude Code, if you prefer)

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
mkdir -p ~/.claude/skills
ln -s ~/DailyWork/skills/meeting-notes ~/.claude/skills/meeting-notes
${EDITOR:-nano} ~/.claude/skills/meeting-notes/SKILL.md   # set BOT_APP_ID
```

### Manual install (Codex)

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
mkdir -p ~/.codex/instructions.d
cp ~/DailyWork/skills/meeting-notes/SKILL.md ~/.codex/instructions.d/meeting-notes.md
echo "" >> ~/.codex/instructions.md
cat ~/.codex/instructions.d/meeting-notes.md >> ~/.codex/instructions.md
${EDITOR:-nano} ~/.codex/instructions.md   # set BOT_APP_ID
```

### Updating

```bash
cd ~/DailyWork && git pull
```

Claude Code: symlink auto-points to the latest. Codex: re-run the install (or just say "重装 meeting-notes" to your Codex agent).

---

## 📦 Install Just One Skill (sparse-checkout)

If you only want one skill, no need to clone everything:

```bash
git clone --filter=blob:none --no-checkout https://github.com/aaronartistzhang-afk/DailyWork.git
cd DailyWork
git sparse-checkout set skills/meeting-notes shared INSTALL.md
git checkout
```

---

## 🏗️ Repo Structure

```
DailyWork/
├── README.md            ← you are here
├── INSTALL.md           ← prerequisite setup (lark-cli + bot)
├── shared/              ← shared dependency docs
│   ├── lark-cli-setup.md
│   └── bot-app-id.md
└── skills/
    └── <skill-name>/
        ├── README.md    ← what it does, how to use, examples
        ├── SKILL.md     ← the prompt to paste into your AI
        └── *.md         ← supporting files (worker prompts, configs)
```

---

## 🤝 Contributing

PRs welcome — especially new skills that follow the directory pattern above. Each skill should:
- Have a `README.md` with **what / when to use / how to invoke / sample output**
- Have a `SKILL.md` that's self-contained and pasteable into Claude / GPT / Gemini
- List its dependencies and required Lark scopes (if any)
- Include 1-2 anonymized examples

---

## 📝 License

MIT
