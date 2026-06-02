#!/usr/bin/env node
// Group Discussion Reviewer — CLI entrypoint.
//
// Reads a PRD (from --file or STDIN), runs the multi-reviewer pipeline, and
// prints the final review. By default it prints ONLY the human-facing review
// text. Internal pipeline artifacts (fact ledger, judge decision, P0 gate
// decisions) may contain resource refs and are printed only with --json.
//
// Env:
//   OPENAI_API_KEY    (required) the API key.
//   OPENAI_BASE_URL   endpoint. Default https://api.openai.com/v1 (bearer).
//   OPENAI_MODEL      model id. Default gpt-4.1-mini.
//   OPENAI_AUTH_STYLE "query" (key as ?ak=) or "bearer" (Authorization header).
//                     Default: "bearer" when OPENAI_BASE_URL is unset (public
//                     OpenAI), otherwise "query" (gateway).
import { readFile } from "node:fs/promises";
import { generateReview } from "../src/openaiReview.mjs";

const USAGE = `Group Discussion Reviewer — simulate a product group-discussion PRD review.

Usage:
  review-prd --file <prd.md> [options]
  cat prd.md | review-prd [options]

Options:
  --file <path>     PRD file to review (markdown/plain text). If omitted, reads STDIN.
  --mode <m>        standard | deep | challenge   (default: challenge)
  --depth <d>       full | p0                      (default: full)
  --lang <l>        zh | en                        (default: zh)
  --type <t>        auto | workflow | experiment | data | gtm | placement |
                    ai | growth | incentive | monitoring   (default: auto)
  --json            print full JSON (review + usage + cost + artifacts)
  --artifacts       include pipeline artifacts in --json output (default: hidden)
  -h, --help        show this help

Scope: reviews already-extracted PRD text. It does NOT fetch Lark/Feishu URLs or
expand embedded sheets — paste/export the PRD body first.`;

const VALID = {
  mode: ["standard", "deep", "challenge"],
  depth: ["full", "p0"],
  lang: ["zh", "en"],
  type: ["auto", "workflow", "experiment", "data", "gtm", "placement", "ai", "growth", "incentive", "monitoring"]
};

export function parseArgs(argv = []) {
  const opts = { mode: "challenge", depth: "full", lang: "zh", type: "auto", json: false, artifacts: false, help: false, file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--artifacts") opts.artifacts = true;
    else if (a === "--file") opts.file = argv[++i];
    else if (a === "--mode") opts.mode = argv[++i];
    else if (a === "--depth") opts.depth = argv[++i];
    else if (a === "--lang") opts.lang = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  for (const key of ["mode", "depth", "lang", "type"]) {
    if (!VALID[key].includes(opts[key])) {
      throw new Error(`Invalid --${key} "${opts[key]}". Expected one of: ${VALID[key].join(", ")}`);
    }
  }
  return opts;
}

export function resolveConfig(env = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  const hasBaseUrl = Boolean(env.OPENAI_BASE_URL);
  const baseUrl = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const authStyle = (env.OPENAI_AUTH_STYLE || (hasBaseUrl ? "query" : "bearer")).toLowerCase();
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  return { apiKey, baseUrl, authStyle, model };
}

export async function runCli({ argv = [], env = {}, fetchImpl, readStdin } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${error.message}\n\n${USAGE}` };
  }
  if (opts.help) return { code: 0, stdout: USAGE, stderr: "" };

  let prdContent;
  try {
    prdContent = opts.file ? await readFile(opts.file, "utf8") : (readStdin ? await readStdin() : "");
  } catch (error) {
    return { code: 1, stderr: `Failed to read PRD: ${error.message}`, stdout: "" };
  }
  if (!prdContent || !prdContent.trim()) {
    return { code: 2, stderr: `No PRD content provided.\n\n${USAGE}`, stdout: "" };
  }

  let config;
  try {
    config = resolveConfig(env);
  } catch (error) {
    return { code: 2, stderr: error.message, stdout: "" };
  }

  try {
    const result = await generateReview({
      config,
      prdContent,
      prdType: opts.type,
      outputDepth: opts.depth,
      outputLanguage: opts.lang,
      reviewMode: opts.mode,
      fetchImpl
    });
    if (opts.json) {
      const out = {
        review: result.review,
        usage: result.usage,
        costUsd: result.costUsd,
        ...(opts.artifacts ? { artifacts: result.artifacts } : {})
      };
      return { code: 0, stdout: JSON.stringify(out, null, 2), stderr: "" };
    }
    return { code: 0, stdout: result.review, stderr: "" };
  } catch (error) {
    // Scrub: surface the message only, never the key or request payload.
    return { code: 1, stderr: `Review failed: ${error.message}`, stdout: "" };
  }
}

async function readStdinDefault() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const res = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    readStdin: process.stdin.isTTY ? undefined : readStdinDefault
  });
  if (res.stdout) process.stdout.write(`${res.stdout}\n`);
  if (res.stderr) process.stderr.write(`${res.stderr}\n`);
  process.exit(res.code);
}
