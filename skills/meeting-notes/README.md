# meeting-notes

> 飞书妙记 URL → 精炼会议纪要 + 自动 @ 责任人 → 发到群/私聊

---

## What it does

Given a Lark/Feishu meeting minute URL and a target (group `oc_xxx` or user open_id `ou_xxx` for DM), the skill:

1. **Pulls the transcript** from Lark via `lark-cli vc +notes`
2. **Pulls the authoritative attendee list** from meeting metadata (NOT just transcript speakers — catches people who attended but didn't speak)
3. **Resolves each attendee's open_id → name** via Lark contacts API
4. **Looks up which attendees are in the target group** (for proper @mentions)
5. **Synthesizes a structured summary**: meeting purpose, key topics & decisions, todos with owners
6. **Highlights ⚠️ risk topics** automatically (compliance, security, cross-team risk)
7. **Renders as a Lark `post` message** with proper @mentions to attendees in the group
8. **Auto-adds the bot to the target group** if not already a member, then sends

---

## When to use

- After any 15min+ meeting where you'd otherwise have to manually summarize
- For recurring sync-ups where you want a consistent, scannable record format
- When you want @mentions to drive immediate action (todos route to responsible people)
- For cross-language meetings — supports CN-only, EN-only, or CN-EN bilingual output

---

## How to invoke

After pasting `SKILL.md` into your AI agent, just send a natural-language message:

```
总结这个会议纪要发到群 oc_xxxxxxxxxxxxxxxx，<minute_url>
```

Variations:
| Trigger | Behavior |
|---|---|
| `总结发到群 oc_xxx, <url>` | Run end-to-end, send directly |
| `总结发之前给我 review, <url>` | Render a preview in chat first; you approve before send |
| `中英双语会议纪要, <url>, 发到 oc_xxx` | Bilingual mode (EN + CN side-by-side) |
| `英文版, <url>, 发到 oc_xxx` | English-only mode |
| `总结发给我自己, <url>` | DM to your own open_id (no @mentions, plain names) |
| `刚那个会议纪要转成英文, 发到 oc_yyy` | Reuse last judgment, retranslate, resend |

After sending, you can iterate: `"删掉 todo 4"` / `"精炼第 2 节"` / `"把 X 也 @ 上"`.

---

## Sample output

```
📊 会议纪要 — 项目周会

🕙 时间：2026-04-30 13:01 | ⏱ 时长：45 min
👥 参会：Alice (PM)、Bob、Carol、Dave (Eng Lead)

🎯 会议目的
对齐 Q2 roadmap & 解决跨团队依赖

📝 主要讨论与决策

1️⃣ Q2 优先级
- P0: 功能 A 必须 5 月上线
- P1: 功能 B 可延后到 6 月

2️⃣ 跨团队依赖 ⚠️
- 后端 API 需 Eng 团队在 5/10 前提供
- 关键风险：第三方 SDK 升级未确认

✅ Todo
1. @Alice：5/5 前出 PRD final 版
2. @Bob + @Dave：评估 SDK 升级影响
3. @Carol：拉个会同步设计稿
```

---

## Architecture

```
妙记 URL
   ↓
Phase 1 (Sonnet sub-agent): fetch transcript + meeting metadata + open_id resolution
   ↓ (writes /tmp/meeting_raw_<token>.json)
Phase 2 (Opus main agent): judgment — what's a decision vs discussion vs todo, who owns what, what's risky
   ↓ (writes /tmp/opus_judgment_<token>.json)
Phase 3 (Sonnet sub-agent): render as Lark post + auto-add bot to chat + send
   ↓
Lark group/DM
```

The hybrid Sonnet+Opus split saves ~60-70% tokens vs. running everything on Opus. Files are at:

- [`SKILL.md`](SKILL.md) — main prompt for the orchestrator AI
- [`worker1_prompt.md`](worker1_prompt.md) — Sonnet sub-agent: fetch & structure
- [`worker2_prompt.md`](worker2_prompt.md) — Sonnet sub-agent: render & send

---

## Required Lark Scopes

| Scope | Why |
|---|---|
| `vc:meeting:read` | Get meeting metadata (`meeting get`) + search (`vc +search`) |
| `vc:minute:read` | Pull transcript (`vc +notes`) |
| `contact:user:readonly` | Resolve open_id → name |
| `contact:contact.base:readonly` | Search user by name (for ad-hoc @mentions) |
| `im:message.send_as_app` | Send messages as the bot |
| `im:message` | Read message metadata |
| `im:chat` | Read group info |
| `im:chat.members` | Read group members + auto-add bot when needed |

---

## Setup

### Prerequisites

1. Configure `lark-cli` per [shared/lark-cli-setup.md](../../shared/lark-cli-setup.md)
2. Create a Lark bot per [shared/bot-app-id.md](../../shared/bot-app-id.md)
3. Install [Claude Code](https://docs.claude.com/claude-code)

### Install the skill (recommended: as a Claude Code Skill)

This skill follows the [Claude Code Skills](https://docs.claude.com/en/docs/claude-code/skills) convention and auto-loads when the trigger phrases are detected.

```bash
# 1. Clone this repo
git clone https://github.com/aaronartistzhang-afk/DailyWork.git ~/DailyWork

# 2. Symlink the skill folder into ~/.claude/skills/
mkdir -p ~/.claude/skills
ln -s ~/DailyWork/skills/meeting-notes ~/.claude/skills/meeting-notes

# 3. Edit SKILL.md to set your BOT_APP_ID
# Replace <BOT_APP_ID> with your cli_xxx from `lark-cli config show`
${EDITOR:-nano} ~/.claude/skills/meeting-notes/SKILL.md
```

That's it. Open Claude Code anywhere and try:
```
总结发给我自己 dry-run, <some Lark meeting URL>
```

### Alternative installs

- **Per-project**: copy `SKILL.md` content to your project's `./CLAUDE.md` for project-scoped use
- **One-shot**: paste `SKILL.md` content into Claude Code as the first message; active for that session only

### Updating

```bash
cd ~/DailyWork && git pull
# Symlinks pick up changes automatically; only re-edit if BOT_APP_ID got reverted
```

---

## Known limitations

- **Won't work without Lark "record + transcribe" enabled** for the meeting
- **External tenant participants**: their names can't be resolved; they show up as "unresolved" and won't be @-mentioned
- **Long meetings (2h+)**: transcripts may exceed model context; chunking not yet implemented
- **`说话人 N` device-labels**: when multiple people share one mic in the same room, the transcript may use device-level labels. The skill keeps these as-is and relies on meeting metadata for the authoritative attendee list

---

## Gotchas (production-tested)

1. **`-` in markdown**: write `-` directly in `md` tags. **Don't escape as `\-`** — Lark renders `\-` literally.
2. **Don't use `tail -N` on lark-cli output** — it silently truncates JSON arrays (especially `participants` lists).
3. **lark-cli stdout** has a proxy warning line first. Use `i = raw.find('{"code')` before `json.loads()`.
4. **External users**: `contact +get-user --as user` returns empty `data.user: {}`. `--as bot` returns `41050 no_user_authority`. Mark `name_unresolved: true`, don't @ them.
5. **Meeting metadata is authoritative — not the transcript.** Two people may have attended without speaking. The transcript-only approach systematically miscounts attendees.
6. **Image upload**: `--file` requires relative paths (`./shot.jpg`); absolute paths fail. Form key prefix required: `--file "image=./shot.jpg"`.
7. **Bot not in chat (HTTP 230002)**: skill auto-adds bot first then retries; no manual intervention needed.

---

## Examples / Past Runs

The skill has been battle-tested on 10+ real meetings (PRD reviews, legal reviews, cross-team syncs, localization discussions). Typical iteration takes 30 sec for fetch + 30 sec for judgment + 15 sec for render+send.

Iteration patterns observed:
- ~50% of first drafts go straight to send
- ~30% need 1-2 todo edits before send
- ~20% need topic-level restructuring (e.g., "精炼第 2 节" / "merge topics 3 and 4")
