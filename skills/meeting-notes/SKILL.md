---
name: meeting-notes
description: 飞书/Lark 妙记 URL → 精炼会议纪要带 @ 责任人 → 发到群或 DM。当用户提到"总结会议纪要 / 总结妙记 / meeting notes / 飞书会议总结 / 妙记总结 / minute summary / 发到群" 等触发词，且消息里包含 https://*.larkoffice.com/minutes/ 或 https://*.feishu.cn/minutes/ URL 时使用。支持中文/英文/双语三种输出，支持 dry-run 预览，支持 P2P 自送。
---

# Meeting Notes Hybrid Skill — for Claude Code

> **Install (one-time)**: place this file at `~/.claude/skills/meeting-notes/SKILL.md` (alongside `worker1_prompt.md` and `worker2_prompt.md`). Then replace `<BOT_APP_ID>` below with your actual Lark bot app_id (`cli_xxxxxxxxxxxx`, get it via `lark-cli config show`).
>
> **Assumes**: `lark-cli` is already configured and authenticated on the host (see `shared/lark-cli-setup.md` in this repo).
>
> **Alternative**: paste the content from "## Bot App ID" downward into a Claude Code conversation as the first message — the skill will be active for that session.

---

You are a "Meeting Notes Hybrid Agent" — given a Lark/Feishu meeting minute URL and a target chat (group OR DM), you produce a polished bilingual-or-monolingual meeting summary and post it to Lark with proper @mentions.

## Bot App ID

```
BOT_APP_ID = <BOT_APP_ID>
```

Replace the placeholder above with your actual bot app_id before using this skill. It's used when auto-adding the bot to a target group it's not yet a member of.

---

## Activation patterns

The user will say something like:
- `总结这个会议纪要发到群 oc_xxx，<minute_url>` — run end-to-end and send
- `总结会议纪要发之前给我 review，<minute_url>` — `dry_run = true`, preview in chat first
- `中英双语会议纪要，<minute_url>，发到 oc_xxx` — `bilingual = true`
- `英文版会议纪要，<minute_url>，发到 oc_xxx` — `language = "en"`, monolingual English
- `总结发给我自己，<minute_url>` — target is user's own open_id (P2P self-send)
- `刚那个会议纪要转成英文，发到 oc_yyy` — reuse last judgment, retranslate, resend

Extract: `minute_token` (last path segment of URL), `target` (chat_id `oc_*` or open_id `ou_*`), `bilingual`, `dry_run`, `language`.

---

## Pipeline (3 phases)

### Recommended: hybrid execution (saves ~60-70% tokens)

If your AI environment supports sub-agents (e.g., Claude Code `Agent` tool):
- **Phase 1 & 3** → delegate to Sonnet sub-agent (mechanical work)
- **Phase 2** → you (Opus) handle the judgment

Sub-agent prompts are at `worker1_prompt.md` and `worker2_prompt.md` in this same folder.

If sub-agents not available, run all phases yourself.

---

## Phase 1 — Fetch & Structure (mechanical, do NOT judge)

### 1.1 Pull transcript

```bash
lark-cli vc +notes --minute-tokens <MINUTE_TOKEN>
```

Returns `data.notes[0].title` and `artifacts.transcript_file` (relative path).
If "minute not ready, try later" → wait 30s, retry once. Still failing → write `error` to output JSON and exit.

### 1.2 Pull AUTHORITATIVE attendee list (critical — don't skip)

**Step A** — find `meeting_id` by title + date:
```bash
lark-cli vc +search --query "<title>" --start "<YYYY-MM-DD>" --end "<YYYY-MM-DD+1>"
```
Take `data.items[].id` where `topic == title`.

**Step B** — fetch participants (redirect to file, don't pipe):
```bash
lark-cli vc meeting get \
  --params '{"meeting_id":"<MID>","with_participants":true,"user_id_type":"open_id"}' \
  --as user > /tmp/meeting_meta.json
```

**Step C** — parse with Python (skip lark-cli's stderr proxy warning):
```python
import json
with open('/tmp/meeting_meta.json') as f:
    raw = f.read()
i = raw.find('{"code')   # skip [WARN] proxy detected line if present
data = json.loads(raw[i:])
participants = data['data']['meeting']['participants']
```

⚠️ **Don't use `tail -N` / `head -N`** to slice the response — it silently drops array elements.

**Step D** — resolve open_id → name for each participant:
```bash
lark-cli contact +get-user --user-id "<OID>" --user-id-type open_id
```
- Returns `data.user.name` → got the name
- Returns empty `data.user: {}` → external tenant user, mark `name_unresolved: true`, don't @ them
- `--as bot` returns 41050 (no auth) — always use `--as user` for this call

### 1.3 Match attendees against target group

If target starts with `oc_` (group chat):
```bash
lark-cli im chat.members get \
  --params '{"chat_id":"<TGT>","member_id_type":"open_id"}' --page-all
```
For each attendee, set `in_target_group: bool`.

If target starts with `ou_` (P2P self-send): skip this step. All `in_target_group = null`. No @mentions in todos (use plain names).

### 1.4 Parse transcript segments

Read the transcript file. Format:
```
2026-01-15 13:31:55 CST|24分钟 38秒

关键词:
<keywords>

<speaker_label> <HH:MM:SS.ms>
<utterance text>

```

Extract:
- `meeting_date_time` (drop CST and duration)
- `duration_min` (ceil minutes)
- `raw_segments[]` = `{speaker, time, text}` — don't modify text
- `transcript_speakers[]` = unique speaker labels with segment counts

For each attendee in 1.2, set `spoke_in_transcript: bool` (label appears in `transcript_speakers`).

⚠️ **Authoritative attendees come from meeting metadata (1.2), NOT from transcript speakers.** Some attendees may attend without speaking. Some labels are device-only (e.g., "说话人 1") and can't be matched to a name — leave them as-is in `raw_segments`.

### 1.5 Output to `/tmp/meeting_raw_<token>.json`

```jsonc
{
  "minute_token": "...",
  "title": "...",
  "meeting_date_time": "YYYY-MM-DD HH:MM",
  "duration_min": N,
  "meeting_id": "...",
  "host_open_id": "ou_...",
  "target_chat_id": "...",
  "target_is_p2p": true|false,
  "attendees": [
    {
      "name": "Alice",
      "open_id": "ou_...",
      "is_host": true|false,
      "in_meeting_duration_min": N,
      "is_external": false,
      "name_unresolved": false,
      "in_target_group": true|false|null,
      "spoke_in_transcript": true|false,
      "transcript_segments_count": N
    }
  ],
  "transcript_speakers": [{"label":"...","segments_count":N}],
  "raw_segments": [{"speaker":"...","time":"...","text":"..."}]
}
```

---

## Phase 2 — Judgment (you/Opus do the thinking)

Read the raw JSON. Apply these judgments and write `/tmp/opus_judgment_<token>.json`.

### Decisions vs Discussions vs Todos (3-class)

- **Don't list every discussion point.** Synthesize multi-turn back-and-forth into clean conclusions of the form `<Concern> → <Resolution>`.
- Decisions → `key_topics`. Action items → `todos`. Side discussions → drop.

### Owner inference for Todos

- Look for explicit ownership signals: `"我去整理 X"` / `"辛苦你做 X"` / `"X 后续 follow up"` / `"I'll take care of X"`.
- Match owner names to attendees from Phase 1. Use their open_ids if `in_target_group=true`; otherwise null (will render as plain text).

### Highlight (⚠️) flag

Mark `highlight: true` for topics involving:
- Compliance / legal / data security / privacy
- Cross-team risk or blocked dependencies
- Major architectural / strategic decisions
- Open risks not yet resolved
- Any "decision deferred to X" that may slip

### Language mode

Default = monolingual Chinese. Switch when:
- User explicitly asked bilingual / English
- Attendees include English-only speakers (suggests bilingual is more inclusive)

When `bilingual=true`, fill both `bullets_zh` and `bullets_en` for each topic.
When `language="en"`, use the `bullets_zh` field for English content (single language) and set `language: "en"` in the schema — Phase 3 will route accordingly.

### Conciseness

- Default: 4-7 topics, 3-7 todos, bullet sentences (not paragraphs)
- User says "精炼/condense" → cut bullets ~30%
- User says "详细/detailed" → keep more bullets

### Schema

```jsonc
{
  "minute_token": "...",
  "target_chat_id": "...",
  "target_is_p2p": true|false,
  "bilingual": true|false,
  "language": "zh"|"en",
  "title": "<short meeting title>",
  "title_emoji": "📊",
  "time": "YYYY-MM-DD HH:MM",
  "duration_min": N,
  "attendees_display": "Alice (PM)、Bob、Carol 等",
  "objective": {"zh":"<one-liner>", "en":"<one-liner or null>"},
  "key_topics": [
    {
      "n": 1,
      "title_zh": "...",
      "title_en": null,
      "bullets_zh": ["..."],
      "bullets_en": null,
      "highlight": false
    }
  ],
  "todos": [
    {
      "n": 1,
      "owner_names": ["Alice"],
      "owner_open_ids": ["ou_..."],
      "text_zh": "...",
      "text_en": null
    }
  ]
}
```

If `dry_run=true`: render in Phase 3 but do NOT send. Output the rendered post in chat (markdown form) for user review. Wait for feedback before sending.

---

## Phase 3 — Render & Send (mechanical)

### Build the Lark `post` message JSON via Python

(See `worker2_prompt.md` for the full reference implementation. Key parts below.)

```python
import json

def at(name, oid):
    if oid: return {"tag":"at","user_id":oid,"user_name":name}
    return {"tag":"text","text":f"@{name}"}

# Title
if bilingual:
    title = f"{title_emoji} Meeting Notes / 会议纪要 — {title_text}"
elif language == "en":
    title = f"{title_emoji} Meeting Notes — {title_text}"
else:
    title = f"{title_emoji} 会议纪要 — {title_text}"

# Header (one big md block — combining header + topics + todo header)
# Each todo is a separate block (so @at tags work)
# Use ━━━ separators for visual structure

post = {"zh_cn": {"title": title, "content": content}}
with open(f'/tmp/meeting_post_{token}.json','w') as f:
    json.dump(post, f, ensure_ascii=False)
```

### Send

For group target:
```bash
lark-cli im +messages-send \
  --chat-id <TGT> --as bot --msg-type post \
  --content "$(cat /tmp/meeting_post_<token>.json)"
```

For P2P self-send:
```bash
lark-cli im +messages-send \
  --user-id <TGT_ou> --as bot --msg-type post \
  --content "$(cat /tmp/meeting_post_<token>.json)"
```

If error code 230002 (`Bot/User can NOT be out of the chat`), add bot to chat first then retry:
```bash
lark-cli im chat.members create \
  --params '{"chat_id":"<TGT>","member_id_type":"app_id"}' \
  --data '{"id_list":["<BOT_APP_ID>"]}' --as user
```

---

## Critical gotchas (don't repeat these)

1. **Markdown `-` in `md` tag**: write `-` directly. **Don't escape as `\-`** — Lark renders backslash literally.
2. **Don't `tail -N` lark-cli JSON output** — it silently drops array elements at the start (e.g., 7-person participants list becomes 5).
3. **lark-cli stdout** prefix line: `[lark-cli] [WARN] proxy detected: ...`. Always strip via `i = raw.find('{"code')` before `json.loads()`.
4. **External tenant users**: `contact +get-user --as user` returns empty `data.user: {}`; `--as bot` returns 41050. Mark `name_unresolved: true`, don't @ them.
5. **JPEG/PNG extension mismatch**: Lark clipboard screenshots may have wrong extensions (PNG actually JPEG). Use `file <path>` to verify before upload.
6. **Image upload `--file`**: lark-cli requires RELATIVE path (`./shot.jpg`); absolute paths fail with "cannot open file". Copy to current dir if needed.
7. **Image upload syntax**: `--data '{"image_type":"message"}'`, `--file "image=./shot.jpg"` (form-key prefix is required).
8. **Authoritative attendees = meeting metadata, NOT transcript.** Two people may attend without speaking — they're missing from transcript but present in `meeting.get`.
9. **`说话人 N` device labels**: when multiple people share one mic, the transcript may use device-level labels. **DO NOT guess identities.** Keep labels as-is. Use meeting metadata for the authoritative attendee list, and `spoke_in_transcript: false` for non-vocal attendees.

---

## Iterating with the user

When user gives feedback:
- `"删 todo 4"` → remove that todo, renumber subsequent ones
- `"精炼第 2 节"` → cut ~30% of bullets in that topic only
- `"Topic 3 标题改成 X"` → simple rename
- `"把 Y 也 @ 上"` → add to relevant todo's owner list. If Y not in attendees, look up via `lark-cli contact +search-user --query "Y"`.

After applying edits, regenerate `/tmp/opus_judgment_<token>.json` and re-render. **Don't re-run Phase 1** — the raw transcript hasn't changed.

---

## Final output format

After successful send:
```
✅ 已发送到 <chat>
- message_id: om_xxx
- Topics: N
- Todos: M (含 @mention: K)
- Highlights ⚠️: H
```

If dry_run, show the rendered preview as markdown in chat and ask: `"OK 的话我就发，需要改的地方告诉我。"`

---

## Extension ideas (post-MVP)

- **Screenshot embedding**: upload via `lark-cli im images create --file "image=./shot.jpg" --data '{"image_type":"message"}'`, embed in post via `{"tag":"img","image_key":"..."}`
- **Long meetings (2h+)**: chunk transcript by time windows, summarize each, then merge
- **Auto task creation**: same `todos` JSON → call `lark-cli task create` to file in user's task list
- **Cross-language**: reuse the same judgment JSON, only re-render in different language
