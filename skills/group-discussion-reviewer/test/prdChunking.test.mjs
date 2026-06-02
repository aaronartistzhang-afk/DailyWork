import test from "node:test";
import assert from "node:assert/strict";

import {
  chunkPrdContent,
  mergeFactLedgers
} from "../src/prdChunking.mjs";

test("chunkPrdContent returns one chunk for short PRDs", () => {
  const chunks = chunkPrdContent("short PRD body", 100);

  assert.deepEqual(chunks, [{
    chunkId: "chunk_1",
    startChar: 0,
    endChar: 14,
    text: "short PRD body"
  }]);
});

test("chunkPrdContent splits long PRDs into deterministic chunks", () => {
  const chunks = chunkPrdContent("a".repeat(25), 10);

  assert.deepEqual(chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    startChar: chunk.startChar,
    endChar: chunk.endChar,
    text: chunk.text
  })), [
    { chunkId: "chunk_1", startChar: 0, endChar: 10, text: "a".repeat(10) },
    { chunkId: "chunk_2", startChar: 10, endChar: 20, text: "a".repeat(10) },
    { chunkId: "chunk_3", startChar: 20, endChar: 25, text: "a".repeat(5) }
  ]);
});

test("mergeFactLedgers prefixes duplicate IDs and preserves coverage", () => {
  const merged = mergeFactLedgers([
    {
      facts: [{ factId: "fact_1", category: "objective", claim: "Goal A" }],
      missingFacts: [{ missingFactId: "missing_1", category: "metric", claim: "Missing A" }],
      coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 10 }]
    },
    {
      facts: [{ factId: "fact_1", category: "metric", claim: "Metric B" }],
      missingFacts: [{ missingFactId: "missing_1", category: "workflow", claim: "Missing B" }],
      coverageMap: [{ chunkId: "chunk_2", startChar: 10, endChar: 20 }]
    }
  ]);

  assert.deepEqual(merged.facts.map((fact) => fact.factId), ["chunk_1_fact_1", "chunk_2_fact_1"]);
  assert.deepEqual(merged.missingFacts.map((fact) => fact.missingFactId), ["chunk_1_missing_1", "chunk_2_missing_1"]);
  assert.deepEqual(merged.coverageMap.map((coverage) => coverage.chunkId), ["chunk_1", "chunk_2"]);
});

test("mergeFactLedgers preserves embedded resource coverage across chunks", () => {
  const merged = mergeFactLedgers([
    {
      facts: [],
      missingFacts: [],
      coverageMap: [{ chunkId: "chunk_1", startChar: 0, endChar: 10 }],
      resourceCoverage: [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded" }],
      unexpandedResources: [{ resourceId: "sheet:cited_only", type: "sheet", reason: "referenced but not directly embedded" }]
    }
  ]);

  assert.deepEqual(merged.resourceCoverage, [{ resourceId: "sheet:e9LMNf", type: "sheet", status: "expanded" }]);
  assert.deepEqual(merged.unexpandedResources, [{ resourceId: "sheet:cited_only", type: "sheet", reason: "referenced but not directly embedded" }]);
});
