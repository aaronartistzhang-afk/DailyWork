# Group Discussion Reviewer — engine

Simulate a product **group-discussion review** of a PRD with a multi-reviewer pipeline and
disciplined P0 gating. Produces a two-axis verdict (**组内准入** group-admission /
**模拟评审结果** simulated review result) plus prioritized P0/P1/P2 questions.

This is the **high-fidelity, runnable** layer. If you just want the review *methodology*
applied in-conversation with no API key, install the sibling skill
[`group-discussion-reviewer-methodology`](../group-discussion-reviewer-methodology/).

- **Stack**: Node ≥ 20, zero npm dependencies, plain ESM.
- **Required**: an OpenAI-compatible API key (public OpenAI, or your own gateway).
- **Scope**: reviews already-extracted PRD **text/markdown**. It does **not** fetch
  Lark/Feishu URLs and does **not** expand embedded sheets — paste/export the PRD body
  first.

## Install

### Claude Code

Copy this folder to `~/.claude/skills/group-discussion-reviewer/`, then set your key:

```bash
cp ~/.claude/skills/group-discussion-reviewer/.env.example ~/.claude/skills/group-discussion-reviewer/.env
# edit .env → OPENAI_API_KEY=...
```

The skill activates on prompts like "评审这个 PRD / 模拟组会评审 / find the P0 blockers /
is this PRD ready to ship".

### Manual (any agent or shell)

```bash
git clone https://github.com/aaronartistzhang-afk/DailyWork
cd DailyWork/skills/group-discussion-reviewer
export OPENAI_API_KEY=sk-...           # required
node bin/review-prd.mjs --file your-prd.md
```

## Configuration

| Var | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | — (required) | API key. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Your OpenAI-compatible endpoint. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Chat/completions model id. |
| `OPENAI_AUTH_STYLE` | `bearer` if no base url, else `query` | `bearer` = `Authorization: Bearer`; `query` = key as `?ak=` on the base url. |

**Public OpenAI**: just set `OPENAI_API_KEY` (defaults give bearer + `api.openai.com`).
**Gateway that takes the key in the URL**: set `OPENAI_BASE_URL` and leave auth style at the
`query` default (or set `OPENAI_AUTH_STYLE=query`).

## Usage

```bash
node bin/review-prd.mjs --file prd.md                      # challenge mode, zh, full
cat prd.md | node bin/review-prd.mjs --mode deep --lang en # deep, English, from stdin
node bin/review-prd.mjs --file prd.md --depth p0           # only group-admission + verdict + P0
node bin/review-prd.mjs --file prd.md --json --artifacts   # full JSON incl. pipeline artifacts
```

| Option | Values | Default |
|---|---|---|
| `--mode` | `standard` `deep` `challenge` | `challenge` |
| `--depth` | `full` `p0` | `full` |
| `--lang` | `zh` `en` | `zh` |
| `--type` | `auto` `workflow` `experiment` `data` `gtm` `placement` `ai` `growth` `incentive` `monitoring` | `auto` |
| `--json` / `--artifacts` | print JSON / include internal artifacts | off |

By default only the final review prints; internal artifacts are gated behind
`--json --artifacts`.

## Output

```
## 组内准入
组内准入：是            # is the PRD concrete enough for group discussion?
## 模拟评审结果
模拟评审结果：有条件通过  # 通过 / 有条件通过 / 不通过
## P0 Blockers          # only true approval blockers; a clean PRD has 0
## P1 Questions
## P2 Questions
## P1/P2 Improvement Suggestions
```

The two axes are independent: a PRD can be admitted (是) and still be 不通过.

## Verification

```bash
npm test     # 183 offline, deterministic tests (no key/network needed)
```

The 170 core-logic tests are ported verbatim from the source engine and pass identically
(see the PR description for the capability-parity report); the rest cover the CLI and the
two LLM transport modes.

## License

MIT — see [LICENSE](LICENSE).
