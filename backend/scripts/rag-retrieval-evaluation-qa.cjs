const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const DATASET_PATH =
  process.env.RAG_EVAL_DATASET ||
  path.join(process.cwd(), "evaluation", "rag-retrieval-evaluation-dataset.json");

const REPORT_DIR = path.join(process.cwd(), "..", "docs");
const REPORT_PATH = path.join(REPORT_DIR, "rag-retrieval-evaluation-report.md");

const state = {
  startedAt: new Date(),
  dataset: null,
  passed: 0,
  failed: 0,
  warnings: 0,
  caseResults: [],
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {
      recursive: true,
    });
  }
}

function safeJsonStringify(value) {
  return JSON.stringify(value, null, 2);
}

async function requestJson(method, urlPath, body) {
  const url = `${BASE_URL}${urlPath}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        rawText: text,
      };
    }
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${method} ${urlPath}`);
    error.response = data;
    throw error;
  }

  return data;
}

function loadDataset() {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset not found: ${DATASET_PATH}`);
  }

  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.cases)) {
    throw new Error("Dataset cases must be an array.");
  }

  return parsed;
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function lowerList(values) {
  return normalizeArray(values).map((item) => item.toLowerCase());
}

function hasIntersection(left, right) {
  const rightSet = new Set(lowerList(right));

  return normalizeArray(left).some((item) => rightSet.has(item.toLowerCase()));
}

function startsOrContainsAny(value, patterns) {
  const normalized = String(value || "").toLowerCase();

  return normalizeArray(patterns).some((pattern) =>
    normalized.includes(pattern.toLowerCase())
  );
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isSharedScopeResult(result) {
  const scope = String(result.scope || "").toLowerCase();
  const allowedAgents = normalizeArray(result.allowedAgents);

  if (scope === "project" || scope === "global") {
    return true;
  }

  if (allowedAgents.length === 0 && (scope === "project" || scope === "global")) {
    return true;
  }

  return false;
}

function isExplicitlyAllowedForAgent(result, requestedAgentName) {
  const allowedAgents = lowerList(result.allowedAgents);
  const ownerAgentName = String(result.ownerAgentName || "").toLowerCase();
  const agentName = String(result.agentName || "").toLowerCase();
  const requested = String(requestedAgentName || "").toLowerCase();

  if (!requested) {
    return false;
  }

  return (
    agentName === requested ||
    ownerAgentName === requested ||
    allowedAgents.includes(requested)
  );
}

function isPotentialCrossAgentLeak(result, requestedAgentName, deniedAgentNames) {
  const resultAgentName = String(result.agentName || "").toLowerCase();
  const deniedSet = new Set(lowerList(deniedAgentNames));

  if (!deniedSet.has(resultAgentName)) {
    return false;
  }

  if (isSharedScopeResult(result)) {
    return false;
  }

  if (isExplicitlyAllowedForAgent(result, requestedAgentName)) {
    return false;
  }

  return true;
}

function evaluateCase(testCase, retrievalResponse) {
  const expected = testCase.expected || {};
  const results = Array.isArray(retrievalResponse.results)
    ? retrievalResponse.results
    : [];

  const checks = [];

  function addCheck(name, pass, details, evidence) {
    checks.push({
      name,
      status: pass ? "PASS" : "FAIL",
      details,
      evidence,
    });
  }

  addCheck(
    "minimum returned count",
    results.length >= (expected.minReturnedCount || 1),
    `Expected at least ${expected.minReturnedCount || 1} result(s), got ${results.length}.`,
    {
      returnedCount: results.length,
    }
  );

  if (expected.agentNames && expected.agentNames.length > 0) {
    const expectedAgentNames = lowerList(expected.agentNames);

    const hasExpectedAgentResult = results.some((item) =>
      expectedAgentNames.includes(String(item.agentName || "").toLowerCase())
    );

    const allUnexpectedResultsAreShared = results
      .filter(
        (item) =>
          !expectedAgentNames.includes(String(item.agentName || "").toLowerCase())
      )
      .every((item) => isSharedScopeResult(item) || isExplicitlyAllowedForAgent(item, testCase.agentName));

    addCheck(
      "expected agent relevance",
      results.length > 0 && (hasExpectedAgentResult || allUnexpectedResultsAreShared),
      `Expected at least one result from ${expected.agentNames.join(", ")} or only shared/explicitly allowed cross-agent results.`,
      {
        requestedAgentName: testCase.agentName,
        actualAgentNames: unique(results.map((item) => item.agentName)),
        actualScopes: unique(results.map((item) => item.scope)),
      }
    );
  }

  if (expected.mustNotAgentNames && expected.mustNotAgentNames.length > 0) {
    const leakingResults = results.filter((item) =>
      isPotentialCrossAgentLeak(item, testCase.agentName, expected.mustNotAgentNames)
    );

    addCheck(
      "no private cross-agent leakage",
      leakingResults.length === 0,
      `Expected no private/non-shared result from denied agents: ${expected.mustNotAgentNames.join(", ")}.`,
      {
        requestedAgentName: testCase.agentName,
        deniedAgentNames: expected.mustNotAgentNames,
        leakingResults: leakingResults.map((item) => ({
          chunkId: item.chunkId,
          memoryId: item.memoryId,
          agentName: item.agentName,
          ownerAgentName: item.ownerAgentName,
          scope: item.scope,
          memoryType: item.memoryType,
          sourceType: item.sourceType,
          sourceRef: item.sourceRef,
          allowedAgents: item.allowedAgents,
          score: item.score,
        })),
        actualAgentNames: unique(results.map((item) => item.agentName)),
      }
    );
  }

  if (expected.memoryTypesAny && expected.memoryTypesAny.length > 0) {
    const memoryTypes = results.map((item) => item.memoryType);

    addCheck(
      "expected memory type",
      hasIntersection(memoryTypes, expected.memoryTypesAny),
      `Expected at least one memoryType from: ${expected.memoryTypesAny.join(", ")}.`,
      {
        actualMemoryTypes: unique(memoryTypes),
      }
    );
  }

  if (expected.sourceTypesAny && expected.sourceTypesAny.length > 0) {
    const sourceTypes = results.map((item) => item.sourceType);

    addCheck(
      "expected source type",
      hasIntersection(sourceTypes, expected.sourceTypesAny),
      `Expected at least one sourceType from: ${expected.sourceTypesAny.join(", ")}.`,
      {
        actualSourceTypes: unique(sourceTypes),
      }
    );
  }

  if (expected.sourceRefContainsAny && expected.sourceRefContainsAny.length > 0) {
    const matched = results.some((item) =>
      startsOrContainsAny(item.sourceRef, expected.sourceRefContainsAny)
    );

    addCheck(
      "expected sourceRef pattern",
      matched,
      `Expected at least one sourceRef containing: ${expected.sourceRefContainsAny.join(", ")}.`,
      {
        actualSourceRefs: unique(results.map((item) => item.sourceRef || "")),
      }
    );
  }

  if (expected.linkedSkillNamesAny && expected.linkedSkillNamesAny.length > 0) {
    const linkedSkillNames = results.flatMap((item) =>
      Array.isArray(item.linkedSkillNames) ? item.linkedSkillNames : []
    );

    addCheck(
      "expected linked skill",
      hasIntersection(linkedSkillNames, expected.linkedSkillNamesAny),
      `Expected at least one linked skill from: ${expected.linkedSkillNamesAny.join(", ")}.`,
      {
        actualLinkedSkillNames: unique(linkedSkillNames),
      }
    );
  }

  const hasAccessReasons = results.every(
    (item) => Array.isArray(item.accessReasons) && item.accessReasons.length > 0
  );

  addCheck(
    "access reasons present",
    results.length > 0 && hasAccessReasons,
    "Every returned result should include accessReasons for auditability.",
    {
      missingCount: results.filter(
        (item) => !Array.isArray(item.accessReasons) || item.accessReasons.length === 0
      ).length,
    }
  );

  const scoresAreValid = results.every(
    (item) => typeof item.score === "number" && Number.isFinite(item.score)
  );

  addCheck(
    "valid retrieval scores",
    results.length > 0 && scoresAreValid,
    "Every returned result should include a numeric score.",
    {
      scores: results.map((item) => item.score),
    }
  );

  const failedChecks = checks.filter((check) => check.status === "FAIL");
  const status = failedChecks.length === 0 ? "PASS" : "FAIL";

  return {
    id: testCase.id,
    name: testCase.name,
    status,
    query: testCase.query,
    agentName: testCase.agentName,
    matchedSkillNames: testCase.matchedSkillNames || [],
    totalCandidates: retrievalResponse.totalCandidates,
    eligibleCandidates: retrievalResponse.eligibleCandidates,
    returnedCount: retrievalResponse.returnedCount,
    checks,
    topResults: results.slice(0, 5).map((item) => ({
      chunkId: item.chunkId,
      memoryId: item.memoryId,
      agentName: item.agentName,
      ownerAgentName: item.ownerAgentName,
      memoryType: item.memoryType,
      scope: item.scope,
      sourceType: item.sourceType,
      sourceRef: item.sourceRef,
      score: item.score,
      allowedAgents: item.allowedAgents,
      linkedSkillNames: item.linkedSkillNames,
      accessReasons: item.accessReasons,
      matchReasons: item.matchReasons,
      preview: String(item.content || "").slice(0, 220),
    })),
  };
}

async function runCase(testCase) {
  const response = await requestJson("POST", "/api/memory-vault/search", {
    query: testCase.query,
    agentName: testCase.agentName,
    matchedSkillNames: testCase.matchedSkillNames || [],
    allowedScopes: testCase.allowedScopes || ["agent", "skill", "project", "global"],
    allowedSensitivityLevels:
      testCase.allowedSensitivityLevels || ["normal", "internal"],
    topK: testCase.topK || 8,
    minScore: testCase.minScore ?? 0,
  });

  return evaluateCase(testCase, response);
}

async function testDatasetPrerequisites() {
  const summary = await requestJson("GET", "/api/memory-vault/summary");

  const totalChunks = summary?.summary?.totalChunks || 0;
  const embeddedChunks = summary?.summary?.embeddedChunks || 0;

  if (totalChunks === 0) {
    throw new Error("Memory Vault has 0 chunks. Run maintenance rebuild/embed first.");
  }

  if (embeddedChunks === 0) {
    throw new Error("Memory Vault has 0 embedded chunks. Run embed maintenance first.");
  }

  return summary.summary;
}

function buildReport(prerequisiteSummary) {
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - state.startedAt.getTime();

  const lines = [];

  lines.push("# RAG Retrieval Evaluation QA Report");
  lines.push("");
  lines.push(`Generated: ${nowIso()}`);
  lines.push(`Base URL: \`${BASE_URL}\``);
  lines.push(`Dataset: \`${DATASET_PATH}\``);
  lines.push(`Dataset version: **${state.dataset.version || "-"}**`);
  lines.push(`Duration: ${durationMs} ms`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Passed cases: **${state.passed}**`);
  lines.push(`- Failed cases: **${state.failed}**`);
  lines.push(`- Warnings: **${state.warnings}**`);
  lines.push(`- Total cases: **${state.caseResults.length}**`);
  lines.push("");
  lines.push("## Memory Vault Prerequisite Snapshot");
  lines.push("");
  lines.push("```json");
  lines.push(safeJsonStringify(prerequisiteSummary));
  lines.push("```");
  lines.push("");
  lines.push("## Evaluation Cases");
  lines.push("");

  state.caseResults.forEach((result, index) => {
    const icon = result.status === "PASS" ? "✅" : "❌";

    lines.push(`### ${index + 1}. ${icon} ${result.name}`);
    lines.push("");
    lines.push(`Status: **${result.status}**`);
    lines.push("");
    lines.push(`- Case ID: \`${result.id}\``);
    lines.push(`- Agent: \`${result.agentName}\``);
    lines.push(`- Query: \`${result.query}\``);
    lines.push(`- Candidates: ${result.totalCandidates}`);
    lines.push(`- Eligible: ${result.eligibleCandidates}`);
    lines.push(`- Returned: ${result.returnedCount}`);
    lines.push("");
    lines.push("#### Checks");
    lines.push("");

    result.checks.forEach((check) => {
      const checkIcon = check.status === "PASS" ? "✅" : "❌";
      lines.push(`- ${checkIcon} **${check.name}**: ${check.details}`);
    });

    lines.push("");
    lines.push("<details>");
    lines.push("<summary>Top results evidence</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(safeJsonStringify(result.topResults));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  });

  lines.push("## Final Status");
  lines.push("");
  lines.push(
    state.failed === 0
      ? "✅ Retrieval evaluation completed without failed cases."
      : "❌ Retrieval evaluation found failed cases. Review the failed case details above."
  );
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" RAG Retrieval Evaluation QA");
  console.log("===============================================");
  console.log("");
  console.log(`[QA] Base URL: ${BASE_URL}`);
  console.log(`[QA] Dataset:  ${DATASET_PATH}`);
  console.log("");

  state.dataset = loadDataset();

  const prerequisiteSummary = await testDatasetPrerequisites();

  for (const testCase of state.dataset.cases) {
    try {
      const result = await runCase(testCase);
      state.caseResults.push(result);

      if (result.status === "PASS") {
        state.passed += 1;
        console.log(`[PASS] ${result.id} - ${result.name}`);
      } else {
        state.failed += 1;
        console.log(`[FAIL] ${result.id} - ${result.name}`);
      }
    } catch (error) {
      state.failed += 1;

      const result = {
        id: testCase.id,
        name: testCase.name,
        status: "FAIL",
        query: testCase.query,
        agentName: testCase.agentName,
        matchedSkillNames: testCase.matchedSkillNames || [],
        totalCandidates: 0,
        eligibleCandidates: 0,
        returnedCount: 0,
        checks: [
          {
            name: "case execution",
            status: "FAIL",
            details: error.message,
            evidence: error.response || null,
          },
        ],
        topResults: [],
      };

      state.caseResults.push(result);
      console.log(`[FAIL] ${testCase.id} - ${error.message}`);
    }
  }

  ensureDir(REPORT_DIR);

  const report = buildReport(prerequisiteSummary);
  fs.writeFileSync(REPORT_PATH, report, "utf8");

  console.log("");
  console.log("===============================================");
  console.log(" RETRIEVAL QA SUMMARY");
  console.log("===============================================");
  console.log(`Passed cases: ${state.passed}`);
  console.log(`Failed cases: ${state.failed}`);
  console.log(`Warnings:     ${state.warnings}`);
  console.log("");
  console.log(`[QA] Report written to: ${REPORT_PATH}`);
  console.log("");

  if (state.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[QA] Fatal error:");
  console.error(error);
  process.exitCode = 1;
});