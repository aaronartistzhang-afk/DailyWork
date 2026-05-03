# Getting a Lark Bot App ID

Most skills in this repo send messages on behalf of a **Lark Custom App** (i.e., a "bot"). You need to create one and grab its `app_id` (format: `cli_xxxxxxxxxxxx`).

---

## Method 1: Already Have a Bot (fastest)

If you've already configured `lark-cli`, your bot's app_id is in:

```bash
lark-cli config show
```

Look for the `appId` field — that's it.

---

## Method 2: Create a New Bot from Scratch

### 1. Open Lark Open Platform

- China users: <https://open.feishu.cn>
- International: <https://open.larksuite.com>

### 2. Create Custom App

- Top right → **Developer Console**
- → **Create App** → choose **"Custom App for Internal Use"**
- Fill in name, description, icon → **Create**

### 3. Get Credentials

Inside your new app:
- **Credentials & Basic Info** → copy **App ID** (the `cli_xxxxxxxx`) and **App Secret**

### 4. Enable Bot Capability

- **Add Features** → enable **Bot**
- (Optional) configure bot avatar, name, help message

### 5. Request Scopes

Go to **Permissions & Scopes**, add the scopes your skills need. Common ones:

| Scope | Used by |
|---|---|
| `vc:meeting:read` | Reading meeting metadata + participants |
| `vc:minute:read` | Reading meeting minutes / transcripts |
| `contact:user:readonly` | Resolving open_id ↔ name |
| `contact:contact.base:readonly` | Searching users by name |
| `im:message` | Reading / sending messages |
| `im:message.send_as_app` | Sending messages as the bot |
| `im:chat` | Reading group info |
| `im:chat.members` | Reading group members + adding bot to groups |
| `docs:doc` | Reading Lark docs |
| `bitable:app` | Reading multi-dim tables |

### 6. Publish

- **Version Management & Release** → **Create Version** → fill in changelog → **Submit for Review**
- Wait for tenant admin approval (usually fast for internal apps)

### 7. Configure `lark-cli`

```bash
lark-cli config init
# Paste App ID + App Secret
lark-cli auth login
# Browser opens for user-level OAuth
```

---

## ⚠️ NOT This: "Custom Webhook Bot" in Group Settings

When you click "+" inside a Lark group → "Add Bot" → "Custom Bot", that creates a **webhook-type bot** with only an obscure URL — **no app_id**. That kind cannot be used by these skills.

You need the **Custom App** type from the Developer Console (described above).

---

## Verify

```bash
lark-cli config show
# Should display:
# {
#   "appId": "cli_xxxxxxxxxxxx",     ← your bot
#   "appSecret": "****",
#   ...
# }
```

Use `cli_xxxxxxxxxxxx` to replace `<BOT_APP_ID>` placeholder in skill prompts.
