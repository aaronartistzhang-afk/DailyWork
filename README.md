# DailyWork — AI Skills for Daily Work

> A growing collection of AI-powered skills for everyday work productivity. Built for [Claude Code](https://docs.claude.com/claude-code) and [OpenAI Codex CLI](https://github.com/openai/codex), with manual install paths for any other AI agent that can run shell commands.

**Author**: Aaron Zhang ([@aaronartistzhang-afk](https://github.com/aaronartistzhang-afk))

---

## 🧰 Skill Catalog

### Works anywhere — no Lark, no bot

These need only an AI agent (and Python or Node where noted). Start here.

| Skill | What it does | Stack | Needs |
|---|---|---|---|
| [metric-change-attribution](skills/metric-change-attribution/) | Attribute a WoW/MoM metric move: rank which segments drove the change in a rate or a total, then drill layer by layer to root cause — explained-share, factor split, turnover, noise flagging | Python 3 · pandas · PyYAML | — |
| [group-discussion-reviewer](skills/group-discussion-reviewer/) | Run a simulated product review panel over a PRD: multi-reviewer pipeline behind a strict P0 gate → two-axis verdict (does it clear the bar / what the panel would say) + ranked P0/P1/P2 issues. Real runnable engine, not a prompt | Node ≥20 · zero deps | An OpenAI-compatible API key |
| [group-discussion-reviewer-methodology](skills/group-discussion-reviewer-methodology/) | The same review methodology applied conversationally — review a PRD in chat, no key, nothing to run | Pure prompt | — |
| [codex-review-gate](skills/codex-review-gate/) | Cross-model read-only review gate: a second model reviews your plan / diff / SQL / outbound numbers in a read-only sandbox and returns GO/NO-GO, looped until it converges | Codex CLI · pure prompt | — |
| [audience-brief](skills/audience-brief/) | Repackage a finding or a change into paste-ready messages for four audiences — engineering, ops, leadership, local team — each at the right register and evidence density. Stops at a preview; you send | Pure prompt (+humanizer) | — |
| [blind-ab-verify](skills/blind-ab-verify/) | Contamination-proof A/B for prompt changes: isolated per-arm generation → de-labelled blind packet (with control arm + do-no-harm gate) → four-column blind scoring → three-part verdict, with an explicit fidelity ceiling. **Mode B**: single-version blind repro of a packaged skill → defect list | Sub-agents · pure prompt | — |
| [change-triage](skills/change-triage/) | A "is it worth doing?" decision table: force each candidate change into a seven-column table whose first column is the concrete harm of *not* doing it → do now / backlog / skip, and the human decides. Decision triage, cost-benefit, backlog prioritization | Pure prompt | — |
| [session-handoff](skills/session-handoff/) | Hand work between AI coding sessions on one machine: a fixed three-line header (state / do this / decide this) + a six-section `HANDOFF.md` so the receiver sees "fixed or not fixed?" at a glance; git state forced into the header | Pure prompt | — |
| [agent-fleet-guard](skills/agent-fleet-guard/) | Guardrails for large agent orchestrations (≥20 subagents / ≥1M tokens): quote-first gate with a ×3 correction (both numbers are floors), connection probes, in-flight stop-loss on the approved budget, T+60s batch health check, resume-cache and wait-loop traps | Pure prompt + bash estimator | — |
| [skill-evolve-loop](skills/skill-evolve-loop/) | Sediment a lesson into a skill that already ships, then prove you didn't break it: propose-diff-first + five-class behavior regression (routing / regression / discipline / content / gate-under-pressure) via parallel subagents, backfill only what failed | Pure prompt | — |

### Lark / Feishu required

These drive Lark docs, chats and meetings through [`lark-cli`](https://github.com/larksuite/cli), so they need a Lark tenant and a bot app.

| Skill | What it does | Stack | Required scopes |
|---|---|---|---|
| [meeting-notes](skills/meeting-notes/) | Lark Minutes URL → condensed meeting notes with owners auto-@'d → posted to a group or DM. Chinese, English or bilingual output | Lark CLI · Sonnet+Opus hybrid | `vc:meeting:read` `vc:minute:read` `contact:user:readonly` `im:message.send_as_app` `im:chat.members` |
| [lark-comment-loop](skills/lark-comment-loop/) | Close the loop on unresolved docx comments: pull → filter to today client-side → classify → propose-first edits → reply to each → resolve according to mode | Lark CLI · pure prompt | `drive:file` `docx:document` (read / reply / resolve comments) |
| [lark-peer-feedback-drafting](skills/lark-peer-feedback-drafting/) | Evidence-based peer-feedback **drafting** for a formal evaluator: authorization gate → tiered retrieval (scoped/expanded/custom, with budget + "what you'll miss") → private evidence ledger → fact-based draft → human sets the rating, finalizes and submits. Privacy-first, own-identity-only, no auto-scan | Lark CLI · sub-agents · pure prompt | own-user read only: `im:message` `im:chat` (chat-membership read) `contact:user.base:readonly` — no bot/admin/write |

> Several skills were built against Chinese-language workflows and will answer in Chinese when you write to them in Chinese. All of them work in English too.

---

## 🚀 Install

### Prerequisites

**For every skill:** an AI agent that can run shell commands — Claude Code, Codex CLI, Cursor, etc.

**That's it for the ten skills in the first table.** Some also want Python 3 (`pip install pandas pyyaml`) or Node ≥ 20 — the catalog says which.

**Only for the Lark skills** (one-time, ~10 min):

1. **`lark-cli`** installed and authenticated — see [shared/lark-cli-setup.md](shared/lark-cli-setup.md). Verify:
   ```bash
   lark-cli config show     # should show your appId
   ```
2. **Lark Custom App (bot)** with the scopes your chosen skills need — see [shared/bot-app-id.md](shared/bot-app-id.md). Note the app_id (`cli_xxxxxxxxxxxx`).

### Recommended: one-message install

Open your AI agent and paste:

```
Follow https://github.com/aaronartistzhang-afk/DailyWork/blob/main/INSTALL_VIA_AI.md and install the metric-change-attribution skill
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
Reach rate dropped week over week — attribute it. Config: examples/reach-rate.config.yaml
```

To install a different skill, swap `metric-change-attribution` for its name. For a Lark skill such as `meeting-notes`, the install flow will also detect your `BOT_APP_ID` and check the bot's scopes.

### Supported AI agents

| AI agent | Install target | Auto-trigger |
|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/` (symlink) | ✅ via SKILL.md frontmatter |
| **Codex CLI** | `~/.codex/instructions.d/<name>.md` (copy) + appended to `~/.codex/instructions.md` | Always loaded each session |
| **Cursor / Continue / GPT custom action / others** | Paste SKILL.md content into AI's system prompt manually | Manual paste per session |

### Manual install — Claude Code

> The examples below use `meeting-notes`; substitute any skill name. The final `<BOT_APP_ID>` edit applies **only to the Lark skills** — the ten in the first table have no placeholder to fill.

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
- **Codex / others**: re-install (or just tell your AI "reinstall the `<skill-name>` skill").

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
