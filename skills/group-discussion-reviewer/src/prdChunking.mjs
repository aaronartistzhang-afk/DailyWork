export function chunkPrdContent(content, maxChunkChars = 100_000) {
  const source = String(content || "");
  const size = Math.max(1, Number(maxChunkChars) || 1);
  if (source.length <= size) {
    return [{
      chunkId: "chunk_1",
      startChar: 0,
      endChar: source.length,
      text: source
    }];
  }

  const chunks = [];
  for (let startChar = 0; startChar < source.length; startChar += size) {
    const endChar = Math.min(source.length, startChar + size);
    chunks.push({
      chunkId: `chunk_${chunks.length + 1}`,
      startChar,
      endChar,
      text: source.slice(startChar, endChar)
    });
  }
  return chunks;
}

export function mergeFactLedgers(ledgers = []) {
  const facts = [];
  const missingFacts = [];
  const approvalBlockingMissingFacts = [];
  const followUpMissingFacts = [];
  const coverageMap = [];
  const resourceCoverage = [];
  const unexpandedResources = [];

  for (const ledger of ledgers) {
    const chunkId = ledger?.coverageMap?.[0]?.chunkId || `chunk_${coverageMap.length + 1}`;
    for (const fact of ledger?.facts || []) {
      facts.push({
        ...fact,
        factId: prefixId(chunkId, fact.factId || fact.fact_id || `fact_${facts.length + 1}`)
      });
    }
    for (const fact of ledger?.missingFacts || []) {
      const normalizedFact = {
        ...fact,
        missingFactId: prefixId(chunkId, fact.missingFactId || fact.missing_fact_id || `missing_${missingFacts.length + 1}`)
      };
      missingFacts.push(normalizedFact);
      if (normalizedFact.approvalImpact === "approval_blocking") approvalBlockingMissingFacts.push(normalizedFact);
      if (normalizedFact.approvalImpact === "follow_up") followUpMissingFacts.push(normalizedFact);
    }
    for (const coverage of ledger?.coverageMap || []) {
      coverageMap.push({ ...coverage });
    }
    for (const resource of ledger?.resourceCoverage || []) {
      resourceCoverage.push({ ...resource });
    }
    for (const resource of ledger?.unexpandedResources || []) {
      unexpandedResources.push({ ...resource });
    }
  }

  return {
    facts,
    missingFacts,
    approvalBlockingMissingFacts,
    followUpMissingFacts,
    coverageMap,
    resourceCoverage,
    unexpandedResources
  };
}

function prefixId(prefix, id) {
  const safePrefix = String(prefix || "chunk").trim();
  const safeId = String(id || "item").trim();
  return safeId.startsWith(`${safePrefix}_`) ? safeId : `${safePrefix}_${safeId}`;
}
