const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const BACKEND_BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const DASHBOARD_BASE_URL =
  process.env.DASHBOARD_BASE_URL || "http://localhost:5173";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");

const FINAL_REPORT_PATH = path.join(
  DOCS_DIR,
  "phase-8.60.3-final-stable-release-qa-report.md"
);

const CHECKPOINT_PATH = path.join(
  DOCS_DIR,
  "phase-8.60.3-runtime-knowledge-system-stable-release-checkpoint.md"
);

const state = {
  startedAt: new Date(),
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [],
  commandResults: [],
};

const FRONTEND_ROUTES = [
  "/",
  "/office",
  "/agents",
  "/tasks",
  "/skills",
  "/memory-vault",
  "/whatsapp",
  "/settings",
];

const CORE_API_CHECKS = [
  {
    name: "Backend health",
    method: "GET",
    path: "/health",
    validate(data) {
      return data && data.status === "ok";
    },
  },
  {
    name: "Tasks Center API",
    method: "GET",
    path: "/api/tasks?limit=5",
    validate(data) {
      return data && Array.isArray(data.tasks) && typeof data.totalCount === "number";
    },
  },
  {
    name: "WhatsApp Operations API",
    method: "GET",
    path: "/api/tasks?source=whatsapp&limit=5",
    validate(data) {
      return data && Array.isArray(data.tasks) && data.filters?.source === "whatsapp";
    },
  },
  {
    name: "Memory Vault Summary API",
    method: "GET",
    path: "/api/memory-vault/summary",
    validate(data) {
      return data && data.summary && typeof data.summary.totalMemories === "number";
    },
  },
  {
    name: "Knowledge Source History API",
    method: "GET",
    path: "/api/memory-vault/knowledge-sources/history?limit=5",
    validate(data) {
      return data && Array.isArray(data.histories);
    },
  },
  {
    name: "Semantic Retrieval API",
    method: "POST",
    path: "/api/memory-vault/search",
    body: {
      query: "tone santai WhatsApp marketing CTA natural",
      agentName: "design-agent",
      matchedSkillNames: ["generate_ad_copy", "social_caption"],
      allowedScopes: ["agent", "skill", "project", "global"],
      allowedSensitivityLevels: ["normal", "internal"],
      topK: 5,
      minScore: 0,
    },
    validate(data) {
      return (
        data &&
        typeof data.totalCandidates === "number" &&
        typeof data.eligibleCandidates === "number" &&
        typeof data.returnedCount === "number" &&
        Array.isArray(data.results)
      );
    },
  },
];

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

function pushCheck(input) {
  state.checks.push({
    name: input.name,
    status: input.status,
    details: input.details || "",
    evidence: input.evidence || null,
  });

  if (input.status === "PASS") {
    state.passed += 1;
  }

  if (input.status === "FAIL") {
    state.failed += 1;
  }

  if (input.status === "WARN") {
    state.warnings += 1;
  }
}

function pass(name, details, evidence) {
  pushCheck({
    name,
    status: "PASS",
    details,
    evidence,
  });
}

function fail(name, details, evidence) {
  pushCheck({
    name,
    status: "FAIL",
    details,
    evidence,
  });
}

function warn(name, details, evidence) {
  pushCheck({
    name,
    status: "WARN",
    details,
    evidence,
  });
}

async function requestJson(method, baseUrl, urlPath, body) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
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
        rawText: text.slice(0, 500),
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

async function requestText(baseUrl, urlPath) {
  const response = await fetch(`${baseUrl}${urlPath}`);
  const text = await response.text();

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} GET ${urlPath}`);
    error.response = text.slice(0, 500);
    throw error;
  }

  return text;
}

async function runCoreApiChecks() {
  for (const apiCheck of CORE_API_CHECKS) {
    try {
      const data = await requestJson(
        apiCheck.method,
        BACKEND_BASE_URL,
        apiCheck.path,
        apiCheck.body
      );

      const isValid = apiCheck.validate(data);

      if (!isValid) {
        fail(
          apiCheck.name,
          `Endpoint ${apiCheck.path} returned unexpected response shape.`,
          data
        );
        continue;
      }

      pass(apiCheck.name, `Endpoint ${apiCheck.path} is healthy.`, data);
    } catch (error) {
      fail(apiCheck.name, error.message, error.response || null);
    }
  }
}

async function runFrontendRouteChecks() {
  for (const route of FRONTEND_ROUTES) {
    try {
      const text = await requestText(DASHBOARD_BASE_URL, route);

      const looksLikeHtml =
        text.includes("<html") ||
        text.includes("<!doctype") ||
        text.includes('id="root"') ||
        text.includes("root");

      if (!looksLikeHtml) {
        fail(
          `Frontend route ${route}`,
          "Route returned HTTP 200 but did not look like dashboard HTML.",
          {
            preview: text.slice(0, 300),
          }
        );
        continue;
      }

      pass(`Frontend route ${route}`, `Route ${route} is reachable.`, {
        baseUrl: DASHBOARD_BASE_URL,
        route,
      });
    } catch (error) {
      fail(`Frontend route ${route}`, error.message, error.response || null);
    }
  }
}

function runCommandCheck(input) {
  const startedAt = new Date();

  const result = spawnSync(input.command, input.args, {
    cwd: process.cwd(),
    shell: false,
    encoding: "utf8",
    env: {
      ...process.env,
      QA_BASE_URL: BACKEND_BASE_URL,
    },
  });

  const endedAt = new Date();

  const commandResult = {
    name: input.name,
    command: [input.command, ...input.args].join(" "),
    statusCode: result.status,
    durationMs: endedAt.getTime() - startedAt.getTime(),
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };

  state.commandResults.push(commandResult);

  if (result.status === 0) {
    pass(input.name, `${input.name} completed successfully.`, {
      command: commandResult.command,
      durationMs: commandResult.durationMs,
      stdoutTail: commandResult.stdout.slice(-1200),
    });
    return;
  }

  fail(input.name, `${input.name} failed with exit code ${result.status}.`, {
    command: commandResult.command,
    durationMs: commandResult.durationMs,
    stdoutTail: commandResult.stdout.slice(-1600),
    stderrTail: commandResult.stderr.slice(-1600),
  });
}

function buildFinalReport() {
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - state.startedAt.getTime();

  const lines = [];

  lines.push("# Phase 8.60.3 Final Stable Release QA Report");
  lines.push("");
  lines.push(`Generated: ${nowIso()}`);
  lines.push(`Backend base URL: \`${BACKEND_BASE_URL}\``);
  lines.push(`Dashboard base URL: \`${DASHBOARD_BASE_URL}\``);
  lines.push(`Duration: ${durationMs} ms`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Passed: **${state.passed}**`);
  lines.push(`- Failed: **${state.failed}**`);
  lines.push(`- Warnings: **${state.warnings}**`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");

  state.checks.forEach((check, index) => {
    const icon =
      check.status === "PASS" ? "✅" : check.status === "FAIL" ? "❌" : "⚠️";

    lines.push(`### ${index + 1}. ${icon} ${check.name}`);
    lines.push("");
    lines.push(`Status: **${check.status}**`);
    lines.push("");
    lines.push(check.details || "-");
    lines.push("");

    if (check.evidence) {
      lines.push("<details>");
      lines.push("<summary>Evidence</summary>");
      lines.push("");
      lines.push("```json");
      lines.push(safeJsonStringify(check.evidence));
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  });

  lines.push("## Command Results");
  lines.push("");

  state.commandResults.forEach((commandResult, index) => {
    const icon = commandResult.statusCode === 0 ? "✅" : "❌";

    lines.push(`### ${index + 1}. ${icon} ${commandResult.name}`);
    lines.push("");
    lines.push(`Command: \`${commandResult.command}\``);
    lines.push(`Exit code: **${commandResult.statusCode}**`);
    lines.push(`Duration: ${commandResult.durationMs} ms`);
    lines.push("");
    lines.push("<details>");
    lines.push("<summary>stdout tail</summary>");
    lines.push("");
    lines.push("```text");
    lines.push(commandResult.stdout.slice(-3000));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");

    if (commandResult.stderr) {
      lines.push("<details>");
      lines.push("<summary>stderr tail</summary>");
      lines.push("");
      lines.push("```text");
      lines.push(commandResult.stderr.slice(-3000));
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  });

  lines.push("## Final Status");
  lines.push("");

  if (state.failed === 0) {
    lines.push("✅ Phase 8.60.3 final stable release QA completed without failures.");
  } else {
    lines.push("❌ Phase 8.60.3 final stable release QA found failures.");
  }

  lines.push("");

  return lines.join("\n");
}

function buildCheckpointDocument() {
  const lines = [];

  lines.push("# Phase 8.60.3 Runtime Knowledge System Stable Release Checkpoint");
  lines.push("");
  lines.push(`Checkpoint date: ${nowIso()}`);
  lines.push("");
  lines.push("## Stable Release Scope");
  lines.push("");
  lines.push("Phase 8.60.3 closes the Runtime Knowledge System stable release milestone for the Personal Multi-Agent System.");
  lines.push("");
  lines.push("The stable release includes:");
  lines.push("");
  lines.push("- Agent governance boundary enforcement");
  lines.push("- Runtime Memory Context for Manual Widget and WhatsApp");
  lines.push("- Runtime RAG Context for Manual Widget and WhatsApp");
  lines.push("- Memory Vault chunking and embedding foundation");
  lines.push("- Semantic retrieval with scope, sensitivity, agent, and skill guards");
  lines.push("- Runtime RAG quality tuning");
  lines.push("- Runtime RAG task metadata audit");
  lines.push("- Recent Tasks and Office Detail runtime metadata display");
  lines.push("- Memory, Skill, and Knowledge Source based RAG sources");
  lines.push("- Knowledge Source import, audit, history, diff, and rollback foundation");
  lines.push("- RAG retrieval evaluation dataset and QA automation");
  lines.push("- Tasks Center Tab");
  lines.push("- WhatsApp Operations Tab");
  lines.push("");
  lines.push("## Completed Roadmap");
  lines.push("");
  lines.push("- ✅ 8.57 Knowledge Source Versioning / Import History");
  lines.push("- ✅ 8.58 Knowledge Source Diff + Rollback Foundation");
  lines.push("- ✅ 8.59 RAG Evaluation Dataset + Retrieval QA");
  lines.push("- ✅ 8.60.1 Tasks Center Tab");
  lines.push("- ✅ 8.60.2 WhatsApp Operations Tab");
  lines.push("- ✅ 8.60.3 Final Stable Release QA + PRD Checkpoint");
  lines.push("");
  lines.push("## Active Main Routes");
  lines.push("");
  FRONTEND_ROUTES.forEach((route) => {
    lines.push(`- \`${route}\``);
  });
  lines.push("");
  lines.push("## Runtime Channels");
  lines.push("");
  lines.push("### Manual Widget");
  lines.push("");
  lines.push("- Runtime Provider metadata active");
  lines.push("- Governance metadata active");
  lines.push("- Runtime Memory Context active");
  lines.push("- Runtime RAG Context active");
  lines.push("- Output guardrails active");
  lines.push("- Task audit metadata active");
  lines.push("");
  lines.push("### WhatsApp");
  lines.push("");
  lines.push("- Security and authorization checks active");
  lines.push("- Rate limit checks active");
  lines.push("- Governance boundary active");
  lines.push("- Runtime Memory Context active");
  lines.push("- Runtime RAG Context active");
  lines.push("- WhatsApp output guardrails active");
  lines.push("- Task audit metadata active");
  lines.push("- WhatsApp Operations monitoring tab active");
  lines.push("");
  lines.push("## Knowledge Sources");
  lines.push("");
  lines.push("- Seed Memory");
  lines.push("- Runtime Memory");
  lines.push("- Skill Knowledge");
  lines.push("- Imported Knowledge Sources");
  lines.push("- Knowledge Source Import History");
  lines.push("- Knowledge Source Diff");
  lines.push("- Knowledge Source Rollback Foundation");
  lines.push("");
  lines.push("## QA Baseline");
  lines.push("");
  lines.push("- Runtime RAG Regression QA");
  lines.push("- RAG Retrieval Evaluation QA");
  lines.push("- Final Stable Release QA");
  lines.push("");
  lines.push("Expected final status:");
  lines.push("");
  lines.push("```text");
  lines.push("Runtime QA: Passed 8, Failed 0, Warnings 0");
  lines.push("Retrieval QA: Failed cases 0");
  lines.push("Final Stable QA: Failed 0");
  lines.push("```");
  lines.push("");
  lines.push("## Next Roadmap");
  lines.push("");
  lines.push("- 8.61 Frontend Design System + Page Layout Refactor");
  lines.push("- 8.62 3D Agent Office / GLB Workspace Foundation");
  lines.push("- 8.63 3D Workspace Interaction + Visual Polish");
  lines.push("- 9.0 Agent Workflow Orchestration Foundation");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("This checkpoint is the stable baseline before frontend design system refactor, 3D workspace work, and Agent Workflow Orchestration.");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" Phase 8.60.3 Final Stable Release QA");
  console.log("===============================================");
  console.log("");
  console.log(`[QA] Backend:   ${BACKEND_BASE_URL}`);
  console.log(`[QA] Dashboard: ${DASHBOARD_BASE_URL}`);
  console.log("");

  ensureDir(DOCS_DIR);

  await runCoreApiChecks();
  await runFrontendRouteChecks();

  runCommandCheck({
    name: "Runtime RAG Regression QA",
    command: "node",
    args: ["scripts/runtime-rag-regression-qa.cjs"],
  });

  runCommandCheck({
    name: "RAG Retrieval Evaluation QA",
    command: "node",
    args: ["scripts/rag-retrieval-evaluation-qa.cjs"],
  });

  fs.writeFileSync(FINAL_REPORT_PATH, buildFinalReport(), "utf8");
  fs.writeFileSync(CHECKPOINT_PATH, buildCheckpointDocument(), "utf8");

  console.log("");
  console.log("===============================================");
  console.log(" FINAL STABLE QA SUMMARY");
  console.log("===============================================");
  console.log(`Passed:   ${state.passed}`);
  console.log(`Failed:   ${state.failed}`);
  console.log(`Warnings: ${state.warnings}`);
  console.log("");
  console.log(`[QA] Final report: ${FINAL_REPORT_PATH}`);
  console.log(`[QA] Checkpoint:   ${CHECKPOINT_PATH}`);
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