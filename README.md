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

## 🚀 Quick Start

1. **First-time setup** — see [INSTALL.md](INSTALL.md) for `lark-cli` installation and Lark bot configuration (one-time, ~10 min).
2. **Pick a skill** from the catalog above and open its folder.
3. **Read its `README.md`** to understand what it does and how to invoke it.
4. **Copy its `SKILL.md`** into your AI agent's system prompt / custom instructions.
5. **Try it**: send a trigger message to your AI as described in the skill README.

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
