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

## 🚀 Quick Start (Claude Code) — One-message install

> **Pre-requisite (one-time, ~10 min)**: install `lark-cli` and create a Lark bot. See [INSTALL.md](INSTALL.md).

Open Claude Code anywhere and **paste this single message**:

```
请按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md 装上 meeting-notes skill
```

Claude will:
1. Fetch the install instructions
2. Check prerequisites (`git`, `lark-cli`)
3. Clone the repo to `~/DailyWork`
4. Symlink the skill into `~/.claude/skills/meeting-notes/`
5. Auto-detect your bot app_id from `lark-cli config show` (or ask if needed)
6. Verify the install and tell you how to use it

That's it. After install, in any new Claude Code session, just say:

```
总结发给我自己 dry-run, <some Lark meeting URL>
```

### Install other skills the same way

```
请按 https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md 装上 <skill-name>
```

### Manual install (if you prefer)

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork
mkdir -p ~/.claude/skills
ln -s ~/DailyWork/skills/meeting-notes ~/.claude/skills/meeting-notes
${EDITOR:-nano} ~/.claude/skills/meeting-notes/SKILL.md   # set BOT_APP_ID
```

### Updating

```bash
cd ~/DailyWork && git pull
```

Symlinks auto-point to the latest version.

### Other AI agents (non-Claude-Code)

The skills also work with Cursor, Continue.dev, GPT custom actions, etc. Just paste the contents of a skill's `SKILL.md` as the system prompt / custom instructions. See each skill's `README.md` for details.

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
