import test from "node:test";
import assert from "node:assert/strict";

import { callLlmGateway } from "../src/llmGatewayClient.mjs";

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

function chatBody(text = "hello") {
  return { choices: [{ message: { content: text } }], usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 } };
}

function captureFetch(body = chatBody()) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return okJson(body);
  };
  return { calls, fetchImpl };
}

test("default (query) auth: key goes in ?ak= and no Authorization header", async () => {
  const { calls, fetchImpl } = captureFetch();
  await callLlmGateway({
    config: { baseUrl: "https://gateway.example/api/v2/crawl", apiKey: "secret-key", model: "m1" },
    input: "hi",
    maxOutputTokens: 100,
    fetchImpl
  });
  assert.equal(calls[0].url, "https://gateway.example/api/v2/crawl?ak=secret-key");
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test("query auth appends with & when baseUrl already has a query string", async () => {
  const { calls, fetchImpl } = captureFetch();
  await callLlmGateway({
    config: { baseUrl: "https://gateway.example/api?v=2", apiKey: "k", model: "m1" },
    input: "hi",
    maxOutputTokens: 100,
    fetchImpl
  });
  assert.equal(calls[0].url, "https://gateway.example/api?v=2&ak=k");
});

test("bearer auth: key goes in Authorization header, no ?ak=, endpoint normalized to /chat/completions", async () => {
  const { calls, fetchImpl } = captureFetch();
  await callLlmGateway({
    config: { baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt", authStyle: "bearer" },
    input: "hi",
    maxOutputTokens: 100,
    fetchImpl
  });
  assert.equal(calls[0].url, "https://api.openai.com/v1/chat/completions");
  assert.equal(calls[0].options.headers.Authorization, "Bearer sk-test");
  assert.doesNotMatch(calls[0].url, /ak=/);
  // modern OpenAI models require max_completion_tokens, not max_tokens
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent.max_completion_tokens, 100);
  assert.equal(sent.max_tokens, undefined);
});

test("bearer endpoint normalization handles trailing slash and existing /chat/completions", async () => {
  const a = captureFetch();
  await callLlmGateway({ config: { baseUrl: "https://api.openai.com/v1/", apiKey: "k", model: "m", authStyle: "bearer" }, input: "x", maxOutputTokens: 10, fetchImpl: a.fetchImpl });
  assert.equal(a.calls[0].url, "https://api.openai.com/v1/chat/completions");

  const b = captureFetch();
  await callLlmGateway({ config: { baseUrl: "https://api.openai.com/v1/chat/completions", apiKey: "k", model: "m", authStyle: "bearer" }, input: "x", maxOutputTokens: 10, fetchImpl: b.fetchImpl });
  assert.equal(b.calls[0].url, "https://api.openai.com/v1/chat/completions");
});

test("request body shape is OpenAI chat/completions and json mode sets response_format", async () => {
  const { calls, fetchImpl } = captureFetch();
  await callLlmGateway({
    config: { baseUrl: "https://g.example", apiKey: "k", model: "m9" },
    input: "the prompt",
    maxOutputTokens: 222,
    jsonMode: true,
    fetchImpl
  });
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent.model, "m9");
  assert.equal(sent.max_tokens, 222);
  assert.equal(sent.messages[0].content[0].text, "the prompt");
  assert.equal(sent.response_format.type, "json_object");
});

test("maps choices/usage into Responses-API shape, including the data-wrapped variant", async () => {
  const direct = captureFetch(chatBody("answer"));
  const r1 = await callLlmGateway({ config: { baseUrl: "https://g", apiKey: "k", model: "m" }, input: "x", maxOutputTokens: 10, fetchImpl: direct.fetchImpl });
  assert.equal(r1.output_text, "answer");
  assert.deepEqual(r1.usage, { input_tokens: 3, output_tokens: 5, total_tokens: 8 });

  const wrapped = captureFetch({ data: chatBody("wrapped-answer") });
  const r2 = await callLlmGateway({ config: { baseUrl: "https://g", apiKey: "k", model: "m" }, input: "x", maxOutputTokens: 10, fetchImpl: wrapped.fetchImpl });
  assert.equal(r2.output_text, "wrapped-answer");
});

test("error does not leak the api key in the thrown message", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "invalid auth" } }) });
  await assert.rejects(
    () => callLlmGateway({ config: { baseUrl: "https://g", apiKey: "super-secret-key", model: "m" }, input: "x", maxOutputTokens: 10, fetchImpl }),
    (err) => {
      assert.equal(err.statusCode, 502);
      assert.doesNotMatch(err.message, /super-secret-key/);
      return true;
    }
  );
});
