# Install — Prerequisites for All Skills

Most skills in this repo depend on **`lark-cli`** (Lark/Feishu official command-line tool) and a **custom Lark bot** (for sending messages, reading group members, etc.).

Set these up once, then every skill in `skills/` works out of the box.

---

## 1. Install `lark-cli`

See [shared/lark-cli-setup.md](shared/lark-cli-setup.md).

**TL;DR**: download the binary, configure with your Lark tenant credentials, run `lark-cli auth login` to log in as your user identity.

After install, verify:
```bash
lark-cli --version
lark-cli config show
```

---

## 2. Create / Configure a Lark Bot

See [shared/bot-app-id.md](shared/bot-app-id.md).

**TL;DR**: create a Lark "Custom App" on the [Lark Open Platform](https://open.feishu.cn/), enable bot capability, request the scopes listed below, publish, and grab the `app_id` (format `cli_xxxxxxxxxxxx`).

### Required Scopes (per skill)

| Skill | Required Scopes |
|---|---|
| meeting-notes | `vc:meeting:read` `vc:minute:read` `contact:user:readonly` `im:message` `im:message.send_as_app` `im:chat` `im:chat.members` |

(Each skill's `README.md` also lists its specific scopes.)

---

## 3. Set Up Your AI Agent

The skills in this repo are built for **[Claude Code](https://docs.claude.com/claude-code)** but work with any AI agent that supports shell command execution (e.g., Cursor, Continue.dev, GPT custom actions with Bash).

For Claude Code:
1. Install Claude Code per official docs
2. Open Claude Code in a working directory
3. Paste the contents of a skill's `SKILL.md` into the conversation as your first message
4. Replace any `<BOT_APP_ID>` placeholder with your actual Lark bot app_id
5. Done — the AI now has the skill

For other AIs, use the equivalent "system prompt" or "custom instructions" mechanism.

---

## 4. Verify Setup

Try the smallest test for any skill:

```
# For meeting-notes skill
"Test the meeting-notes skill: dry-run only. Pull the title of <some Lark meeting URL>"
```

If the AI successfully calls `lark-cli vc +notes` and returns the meeting title, you're good.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `command not found: lark-cli` | Not installed or not in PATH | See [lark-cli-setup.md](shared/lark-cli-setup.md) |
| `missing required scope(s)` | Bot doesn't have the scope | Add scope on Lark Open Platform → republish app → re-login |
| `HTTP 230002 Bot can NOT be out of the chat` | Bot not in target group | Each skill auto-handles this by adding bot to chat first |
| `41050 no_user_authority` | Using `--as bot` for read-only API on external user | Use `--as user` instead |

---

For skill-specific issues, see each skill's own README.
