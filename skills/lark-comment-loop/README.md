# lark-comment-loop — Feishu/Lark doc comment closed-loop

Pull the unresolved comments on a Feishu/Lark **docx**, filter to "today's" (client-side, since
the API has no server-side time filter), classify them, **propose a numbered plan and wait for
confirmation**, then apply the smallest-radius edits, reply to each comment explaining the change,
and — depending on mode — resolve it.

- **Stack**: Lark CLI · pure prompt (no code to run beyond `lark-cli` calls).
- **Required**: `lark-cli` installed and authenticated. A docx token or URL.
- **Scope**: the **comment loop** only. Editing doc body / tables follows the shared editing
  rules referenced inside; this skill owns the pull → filter → propose → reply → resolve cycle.

## Two lines, opposite rules (don't mix them up)

| Line | Mode | Resolve behavior |
|---|---|---|
| **PRD iteration** | `resolve` | reply **and resolve** (the PRD-writing flow delegates here with this mode) |
| **Data-report** | `reply-only` (**default**) | reply only, **never resolve** — leave it for the other party |

## When to use

- "拉今天的评论逐条改" / "只看今天的评论" / "跑一轮评论迭代" / "把 PRD 评论闭环" /
  "回复并解决文档评论".
- Any time you have a docx with unresolved comments and want a disciplined, propose-first pass.

**Not for**: writing a PRD from scratch (that's the PRD-writing skill, which then delegates the
comment step here), or doc-body edits unrelated to comments.

## Key fact that motivates the skill

The Feishu comment API has **no server-side time filter** — `file.comments list` takes no
since/until. So "only today's" means: pull everything, then filter client-side by `create_time`
(epoch seconds, today-00:00 in the host timezone). That client-side filter + classify +
propose-first + per-comment reply is the loop this skill adds.

## How to invoke

Install (see repo root README), then:

```
拉今天的评论逐条改，<docx URL 或 token>
把这篇 PRD 的评论闭环，resolve 掉，<docx URL>       # → resolve mode
跑一轮评论迭代，只回复不 resolve，<docx URL>        # → reply-only (default)
```

The skill takes an optional `--since` (default today-00:00), a mode (`resolve | reply-only`,
default `reply-only`), and an optional `--verify` that runs a codex pass to check each comment
truly closed the loop.

## Sample flow

```
今天 3 条未解决评论：
#1｜术语（低风险）｜"把'触达'统一成'覆盖'"｜拟改法：全文改名｜落点：§2 指标定义
#2｜内容精度（改前核对）｜"这个跳转应该预填 region"｜拟改法：加 region 预填参数｜落点：§4 跳转规则
#3｜新需求（可能大改）｜"能不能加一个 A/B 分流模块"｜标注：可能大改 → 提议新版本承接

停在这里等你确认。确认哪几条我就逐条落改 + 回复。
```

After confirmation, it edits one module at a time, replies per comment, resolves (or not) per
mode, then re-pulls the full unresolved set and reports **two separate numbers**: today's-range
closed vs whole-doc still-open.

## Required scopes

Whatever your `lark-cli` needs to read/reply/resolve docx comments (e.g. `drive:file`,
`docx:document` — the exact set depends on your bot/user auth). No new scopes beyond doc + comment
read/write.

## Known limitations

- The API pages must be pulled in full before filtering; there is no server-side "today" shortcut.
- "Today" is host-timezone-relative — set `--since` explicitly if you mean something else.
- Large / structural comments ("推翻这个模块") are **not** applied in place — the skill proposes a
  new document version and stops for you to decide.
- Doc-body edit mechanics (block ids, table replace, @-mentions) live in the shared editing doc,
  not here.
