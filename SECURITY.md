# Security Policy

> **Unofficial project.** DailyWork is **not affiliated with, endorsed by, or supported by Lark,
> Feishu, or ByteDance.** The skills here drive tools you already have installed (e.g. `lark-cli`)
> using **your own** credentials and identity; this project never ships or manages your secrets.

## Scope

This repo contains **AI skills** — prompts, methodology docs, and small helper scripts. It does not
run a hosted service and does not store your data. Security-relevant concerns are mostly about:

- shell/script behavior in the skills you install,
- how a skill instructs an AI agent to handle **your** credentials and data,
- guardrails against misuse (e.g. the privacy gate in `skills/lark-peer-feedback-drafting`).

## Reporting a vulnerability or abuse

Please **open a GitHub issue** on this repository:
`https://github.com/aaronartistzhang-afk/DailyWork/issues`

- For a **security vulnerability** (e.g. a skill that could leak credentials or execute unintended
  commands), open an issue titled `SECURITY: <short summary>`. If you'd prefer not to disclose
  details publicly, open a minimal issue asking for a private channel and we'll follow up.
- For **abuse / misuse** (e.g. a skill being used or framed for surveillance, covert
  investigation, or collecting protected/sensitive personal data), open an issue titled
  `ABUSE: <short summary>`. Abuse reports are taken seriously and may result in changes to a
  skill's guardrails or its removal.

Please **do not** include real secrets, tokens, personal data, or other people's private messages
in an issue. Redact before posting.

## Handling secrets & personal data (for users and contributors)

- Skills run with **your own** identity and credentials. Read a skill before installing it and
  understand what it will access.
- **Never commit** secrets, tokens, real Lark identifiers (open-id / chat-id / app-id style
  tokens), personal data, or other people's messages to this repo. Examples and fixtures in this
  repo are **100% synthetic**.
- The `lark-peer-feedback-drafting` skill is a **drafting aid inside a sanctioned HR process**, not
  a surveillance or investigation tool. Confirming that your organization's privacy/HR/legal policy
  permits a given use is **your** responsibility before you run it. Company open-source/legal
  permission to publish or distribute such tooling is likewise the responsibility of the person
  doing so, and **must be secured before any remote push, pull request, or public disclosure** (see
  the governance section below).

## Publishing & contribution governance

Privacy-sensitive skills (anything that reads people's messages, e.g.
`lark-peer-feedback-drafting`) carry a real re-identification and misuse risk, so they follow a
hard gate:

- **Legal/open-source approval BEFORE any remote action.** If you fork, adapt, or contribute such
  a skill from inside a company, obtain your organization's open-source/legal approval **before**
  any `git push` to a remote, any pull request, or any other public disclosure — not merely before
  a later "release". No remote action precedes that approval.
- **Never push straight to `main`.** All changes land via: **feature branch → pull request → an
  independent human review → merge into a protected `main`.** `main` is protected; direct pushes
  are not part of the workflow.
- **Desensitization is a merge blocker.** A change may only merge after a reviewer confirms it
  contains zero real identifiers (real names, real Lark ids/tokens, emails, internal URLs,
  real group/project names, real metrics). Fixtures must be 100% synthetic.
- **One reviewer other than the author** should sign off on any change to a privacy-sensitive
  skill's guardrails.

## Supported versions

This is a rolling repository; fixes land on `main`. There are no long-term support branches. Pull
the latest `main` for the current guardrails.
