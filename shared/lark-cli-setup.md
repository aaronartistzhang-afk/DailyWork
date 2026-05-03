# Setting Up `lark-cli`

`lark-cli` is the official Lark/Feishu command-line tool. All skills in this repo depend on it for reading meetings, sending messages, querying contacts, etc.

---

## Install

`lark-cli` is distributed as a binary by the Lark Open Platform. Get the latest version from your Lark/Feishu admin or internal dev portal.

After install, verify:
```bash
lark-cli --version
```

---

## First-Time Configuration

```bash
lark-cli config init
```

You'll be prompted for:
- **App ID** (`cli_xxxxxxxxxxxx`) — from your Lark Custom App
- **App Secret** — from your Lark Custom App
- **Brand**: `feishu` (China) or `lark` (international)

See [bot-app-id.md](bot-app-id.md) for how to get these.

---

## Login as a User Identity

Most read APIs (meeting metadata, contacts, group members) require a **user-token**, not just the app's tenant token. Log in once:

```bash
lark-cli auth login
```

Browser opens → authorize → done. Token is cached locally.

For specific scopes:
```bash
lark-cli auth login --scope "contact:user:readonly im:chat.members"
```

---

## Identity Modes

When invoking commands, choose the right identity:

| Flag | When to use |
|---|---|
| `--as user` | Reading data on behalf of yourself (recommended for `vc`, `contact`, `docs`) |
| `--as bot` | Sending messages or operations as the bot (default for `im messages-send`) |
| `--as auto` | Let lark-cli pick (default) |

---

## Verify Setup

```bash
# Show config
lark-cli config show

# Test user identity
lark-cli contact +get-user --as user

# Test bot identity (just lists available endpoints)
lark-cli im --help
```

---

## Common Commands Reference

| Goal | Command |
|---|---|
| Pull meeting transcript | `lark-cli vc +notes --minute-tokens <TOKEN>` |
| Search meetings | `lark-cli vc +search --query "<keyword>" --start <date> --end <date>` |
| Get meeting participants | `lark-cli vc meeting get --params '{"meeting_id":"...","with_participants":true}'` |
| Resolve open_id → name | `lark-cli contact +get-user --user-id <OID> --user-id-type open_id` |
| Search user by name | `lark-cli contact +search-user --query "<name>"` |
| Get group members | `lark-cli im chat.members get --params '{"chat_id":"oc_xxx","member_id_type":"open_id"}' --page-all` |
| Add user/bot to group | `lark-cli im chat.members create --params '{"chat_id":"...","member_id_type":"app_id"}' --data '{"id_list":["cli_..."]}' --as user` |
| Send post to group | `lark-cli im +messages-send --chat-id oc_xxx --as bot --msg-type post --content "$(cat post.json)"` |
| Send post to user (P2P) | `lark-cli im +messages-send --user-id ou_xxx --as bot --msg-type post --content "$(cat post.json)"` |
| Upload image | `lark-cli im images create --file "image=./shot.jpg" --data '{"image_type":"message"}' --as bot` |

---

## Gotchas

1. **stdout warning line**: lark-cli may print `[lark-cli] [WARN] proxy detected: ...` as the first line. When parsing JSON, strip until `{"code"`:
   ```python
   i = raw.find('{"code')
   data = json.loads(raw[i:])
   ```

2. **Don't use `tail -N` to parse output** — it silently truncates JSON arrays. Always redirect to file then parse with Python.

3. **External tenant users** can't be resolved via `contact +get-user` (returns empty `data.user: {}`). Mark these as "name unresolvable" in your downstream logic.

4. **Image upload** requires relative file paths in `--file` (e.g., `./shot.jpg`); absolute paths may fail. Form key prefix is required: `--file "image=./shot.jpg"`.

5. **Markdown escaping**: when sending `post` messages with embedded markdown (`md` tag), do NOT escape `-` as `\-` — Lark renders the backslash literally.
