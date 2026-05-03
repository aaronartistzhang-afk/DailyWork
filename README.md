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

## 🚀 Quick Start (Claude Code)

```bash
# 1. One-time prerequisites: install lark-cli + create Lark bot
#    See INSTALL.md for details (~10 min setup)

# 2. Clone this repo
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork

# 3. Symlink any skill you want into Claude Code's skills directory
mkdir -p ~/.claude/skills
ln -s ~/DailyWork/skills/meeting-notes ~/.claude/skills/meeting-notes
#   (repeat for other skills as they ship)

# 4. Edit each skill's SKILL.md to fill in your BOT_APP_ID
${EDITOR:-nano} ~/.claude/skills/meeting-notes/SKILL.md

# 5. Open Claude Code in any directory, trigger the skill via natural language
#    e.g., "总结发给我自己 dry-run, <Lark meeting URL>"
```

Each skill is self-contained — symlink only what you need.

### Other AI agents

The skills also work with Cursor, Continue.dev, GPT custom actions, etc. Just paste the `SKILL.md` content as the system prompt / custom instructions. See each skill's `README.md` for details.

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
