// LLM gateway client.
//
// The pipeline was written against the OpenAI *Responses API*, but the actual
// call speaks the OpenAI *chat/completions* protocol. This client adapts the
// request and maps the response back into a Responses-API-like shape
// ({ output_text, usage:{ input_tokens, output_tokens, total_tokens } }) that
// extractOutputText() and sumUsage() already understand.
//
// Two auth styles are supported via config.authStyle:
//   - "query"  (default): POST to config.baseUrl with the key as an `ak` query
//     parameter. Use this for gateways that take the key in the URL. The
//     request URL and body are unchanged from the original implementation.
//   - "bearer": POST with an `Authorization: Bearer <key>` header, and the
//     endpoint is normalized to `<baseUrl>/chat/completions`. Use this for the
//     public OpenAI API (OPENAI_BASE_URL=https://api.openai.com/v1) or any
//     OpenAI-compatible endpoint that authenticates with a Bearer token.
//
// Config: config.baseUrl = endpoint, config.apiKey = key, config.model = model
//   id, config.authStyle = "query" | "bearer" (optional, default "query").
export async function callLlmGateway({ config, input, maxOutputTokens, jsonMode = false, fetchImpl }) {
  const fetcher = fetchImpl || fetch;
  const { url, authHeaders, tokenParam } = buildRequestTarget(config);
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...authHeaders
    },
    body: JSON.stringify({
      stream: false,
      model: config.model,
      [tokenParam]: maxOutputTokens,
      messages: [{ role: "user", content: [{ type: "text", text: input }] }],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {})
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || payload.message
      || `LLM gateway request failed with HTTP ${response.status}`;
    throw Object.assign(new Error(message), { statusCode: 502, payload });
  }

  // Some gateways wrap the OpenAI body under `data`.
  const body = payload.data?.choices ? payload.data : payload;
  const content = body.choices?.[0]?.message?.content;
  const usage = body.usage || {};
  return {
    output_text: normalizeContent(content),
    usage: {
      input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0))
    }
  };
}

function buildRequestTarget(config) {
  const authStyle = String(config.authStyle || "query").toLowerCase();
  if (authStyle === "bearer") {
    // Modern OpenAI chat models (gpt-5 / o-series) reject `max_tokens` and
    // require `max_completion_tokens`; that field is accepted by current 4.x
    // models too, so it is the safe choice for the public OpenAI API.
    return {
      url: normalizeChatCompletionsUrl(config.baseUrl),
      authHeaders: { Authorization: `Bearer ${config.apiKey}` },
      tokenParam: "max_completion_tokens"
    };
  }
  const separator = config.baseUrl.includes("?") ? "&" : "?";
  return {
    url: `${config.baseUrl}${separator}ak=${encodeURIComponent(config.apiKey)}`,
    authHeaders: {},
    tokenParam: "max_tokens"
  };
}

function normalizeChatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || "").replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("").trim();
  }
  return "";
}
