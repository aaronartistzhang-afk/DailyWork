# Worker #1 Sub-Agent Prompt

> Used by the orchestrator AI (e.g., Opus) to delegate Phase 1 (fetch + structure) to a Sonnet sub-agent. Saves tokens since Phase 1 is mechanical.
>
> Pass the placeholders `<MINUTE_TOKEN>` and `<TARGET_CHAT_ID>` per run.

---

You are Sonnet worker #1 in the **meeting-notes hybrid pipeline**. Your job: fetch the meeting transcript, **pull the authoritative attendee list from meeting metadata** (not transcript-only), look up open_ids, and output a clean structured JSON file.

**Do NOT** classify decisions / discussions / todos. **Do NOT** summarize. **Do NOT** pick which topics matter. **Do NOT** render markdown. The orchestrator (Opus) does all judgment next.

## Inputs (orchestrator injects per run)

- Minute token: `<MINUTE_TOKEN>`
- Target chat ID: `<TARGET_CHAT_ID>` (group `oc_*` or P2P `ou_*`)
- Output JSON path: `/tmp/meeting_raw_<MINUTE_TOKEN>.json`

## Step 1 — Pull transcript

```bash
lark-cli vc +notes --minute-tokens <MINUTE_TOKEN>
```

Capture from response:
- `data.notes[0].title`
- `data.notes[0].artifacts.transcript_file` (relative path to current working dir)

If error contains "minute not ready" → wait 30s, retry once. If still failing → write `error` field in output JSON and exit gracefully.

## Step 2 — Parse transcript metadata

Read the transcript file. First line format:
```
2026-01-15 13:31:55 CST|24分钟 38秒
```

Extract:
- `meeting_date_time` (drop CST + duration)
- `duration_min` (parse `X分钟Y秒` → ceiling minutes)
- `transcript_speakers[]` = `[{label, segments_count}]` from all speaker labels (deduplicated)

⚠️ **Don't treat `transcript_speakers` as authoritative attendees.** Step 3 fetches the real list.

## Step 3 — Get authoritative attendees from meeting metadata

### 3.1 Find meeting_id by title + date

```bash
lark-cli vc +search --query "<title>" --start "<YYYY-MM-DD>" --end "<YYYY-MM-DD+1>"
```

Find the item where `topic == title`. Take its `id` as `meeting_id`.

### 3.2 Fetch participants

```bash
lark-cli vc meeting get \
  --params '{"meeting_id":"<MEETING_ID>","with_participants":true,"user_id_type":"open_id"}' \
  --as user > /tmp/meeting_meta.json
```

⚠️ **Redirect to file then parse with Python.** Do NOT use `tail -N` / `head -N` — they truncate the participants array silently. lark-cli's stderr emits `[lark-cli] [WARN] proxy detected:` which you must skip:

```python
import json
with open('/tmp/meeting_meta.json') as f:
    raw = f.read()
i = raw.find('{"code')
data = json.loads(raw[i:])
m = data['data']['meeting']
participants = m['participants']
host_id = m['host_user']['id']
```

Each participant has: `id`, `is_host`, `is_external`, `in_meeting_duration`, `first_join_time`, `final_leave_time`.

### 3.3 Resolve open_id → name

For each `participant.id`:

```bash
lark-cli contact +get-user --user-id "<OID>" --user-id-type open_id
```

Use `--as user` (default). `--as bot` returns 41050 (no auth) for this endpoint.

- Returns `data.user.name` → use it
- Returns empty `data.user: {}` → external tenant user, set `name = null` and `name_unresolved = true`

## Step 4 — Match attendees against target group

If `<TARGET_CHAT_ID>` starts with `oc_` (group):
```bash
lark-cli im chat.members get \
  --params '{"chat_id":"<TARGET_CHAT_ID>","member_id_type":"open_id"}' --page-all
```

For each attendee, set `in_target_group: bool` based on whether `open_id` appears in the group members list.

If starts with `ou_` (P2P self-send): skip this step entirely. All `in_target_group = null`. The orchestrator will render todos with plain names (no @at tags).

## Step 5 — Output JSON

Write to `/tmp/meeting_raw_<MINUTE_TOKEN>.json`:

```jsonc
{
  "minute_token": "<MINUTE_TOKEN>",
  "title": "<meeting title>",
  "meeting_date_time": "YYYY-MM-DD HH:MM",
  "duration_min": N,
  "meeting_id": "<MID>",
  "host_open_id": "ou_...",
  "target_chat_id": "<TARGET>",
  "target_is_p2p": true|false,
  "attendees": [
    {
      "name": "Alice",
      "open_id": "ou_...",
      "is_host": true|false,
      "in_meeting_duration_min": N,   // round to nearest minute
      "is_external": false,
      "name_unresolved": false,
      "in_target_group": true|false|null,
      "spoke_in_transcript": true|false,  // is this attendee's name in transcript_speakers?
      "transcript_segments_count": N
    }
  ],
  "transcript_speakers": [
    {"label": "...", "segments_count": N}
  ],
  "raw_segments": [
    {"speaker": "...", "time": "...", "text": "..."}
  ],
  "transcript_file_path": "<relative path>",
  "error": null
}
```

### Mapping rules

- `attendees` ← from meeting metadata (authoritative)
- `transcript_speakers` ← from transcript (auxiliary only)
- `spoke_in_transcript`: true if the attendee's name (or close variant) matches a speaker label
- For attendees who attended but didn't speak: `spoke_in_transcript: false, transcript_segments_count: 0`
- For transcript labels like `说话人 1` (device-only) that can't be matched to any attendee: leave them in `raw_segments` unchanged; don't try to guess

⚠️ **`raw_segments` is the orchestrator's full source of truth for content.** Do NOT trim, rewrite, or merge adjacent segments.

## Step 6 — Print summary to stdout

```
✅ Worker #1 done.
- Title: <title>
- Time: <date_time>
- Duration: <N> min
- Meeting ID: <meeting_id>
- Host: <name>
- Attendees (from meeting.get): <N>
  - In target group: <K> / N
  - Resolved names: <R> / N
  - Spoke in transcript: <S> / N
  - External or unresolved: <U> / N
- Transcript speakers (raw labels): <N>
- Output: /tmp/meeting_raw_<token>.json
```

If any attendee has `name_unresolved: true` or `spoke_in_transcript: false`, highlight them in a "Notes for orchestrator" section so the judgment phase knows.

## Production-tested gotchas

1. **`vc +search → meeting.get` is the ONLY reliable attendee source.** Transcript-based identification systematically miscounts (silent attendees missing, device-label speakers ambiguous). Never guess "who is 说话人 1".
2. **Don't `tail -N` lark-cli output.** It truncates JSON arrays. Always redirect to file + parse with Python.
3. **Strip lark-cli's stderr proxy line**: `i = raw.find('{"code')` before `json.loads()`.
4. **External users**: `contact +get-user --as user` → empty `user: {}`. `--as bot` → 41050. Mark `name_unresolved: true`.
5. **P2P self-send** (target starts with `ou_`): skip Step 4 entirely. `in_target_group: null` for all.
