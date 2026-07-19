const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const REPORT_DIR = path.join(process.cwd(), "..", "docs");
const REPORT_PATH = path.join(REPORT_DIR, "runtime-rag-regression-qa-report.md");

const state = {
    startedAt: new Date(),
    passed: 0,
    failed: 0,
    warnings: 0,
    results: [],
    notes: [],
};

function nowIso() {
    return new Date().toISOString();
}

function pushResult(input) {
    state.results.push({
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
    pushResult({
        name,
        status: "PASS",
        details,
        evidence,
    });
}

function fail(name, details, evidence) {
    pushResult({
        name,
        status: "FAIL",
        details,
        evidence,
    });
}

function warn(name, details, evidence) {
    pushResult({
        name,
        status: "WARN",
        details,
        evidence,
    });
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

function hasArray(value) {
    return Array.isArray(value);
}

function hasNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
}

function isBoolean(value) {
    return typeof value === "boolean";
}

function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

function hasRuntimeRagMetadata(task) {
    return (
        typeof task.runtimeRagRetrieved === "boolean" ||
        typeof task.runtimeRagItemCount === "number" ||
        typeof task.runtimeRagTypesJson === "string" ||
        typeof task.runtimeRagTopResultsJson === "string"
    );
}

function hasRuntimeMemoryMetadata(task) {
    return (
        typeof task.runtimeMemoryInjected === "boolean" ||
        typeof task.runtimeMemoryItemCount === "number" ||
        typeof task.runtimeMemoryTypesJson === "string"
    );
}

function includesForbiddenRuntimeLeak(text) {
    const normalized = String(text || "").toLowerCase();

    const forbiddenPatterns = [
        "runtime memory context",
        "runtime rag context",
        "chunk id",
        "chunkid",
        "memory id",
        "memoryid",
        "embedding",
        "vector search",
        "semantic search",
        "retrieved chunk",
        "retrieval metadata",
        "sourceRef".toLowerCase(),
        "runtimeInjectable".toLowerCase(),
        "access guard",
        "score=",
        "governance metadata",
        "provider metadata",
        "style:",
        "constraint:",
        "target audience:",
        "platform:",
        "direct answer?",
        "no reasoning",
        "no metadata",
    ];

    return forbiddenPatterns.some((pattern) => normalized.includes(pattern));
}

async function testHealth() {
    try {
        const data = await requestJson("GET", "/health");

        if (data?.status === "ok") {
            pass("Backend health", "Backend /health returned status ok.", data);
            return;
        }

        fail("Backend health", "Backend /health did not return status ok.", data);
    } catch (error) {
        fail("Backend health", error.message, error.response);
    }
}

async function testMemoryVaultSummary() {
    try {
        const data = await requestJson("GET", "/api/memory-vault/summary");
        const summary = data?.summary;

        if (!summary) {
            fail("Memory Vault summary", "Summary object is missing.", data);
            return;
        }

        if (!isNumber(summary.totalMemories)) {
            fail("Memory Vault summary", "totalMemories is missing or invalid.", data);
            return;
        }

        if (!isNumber(summary.totalChunks)) {
            fail("Memory Vault summary", "totalChunks is missing or invalid.", data);
            return;
        }

        if (!isNumber(summary.embeddedChunks)) {
            fail("Memory Vault summary", "embeddedChunks is missing or invalid.", data);
            return;
        }

        if (summary.totalChunks === 0) {
            warn(
                "Memory Vault chunks",
                "totalChunks is 0. Run POST /api/memory-vault/chunks/rebuild before full RAG QA.",
                summary
            );
            return;
        }

        if (summary.embeddedChunks === 0) {
            warn(
                "Memory Vault embeddings",
                "embeddedChunks is 0. Run POST /api/memory-vault/chunks/embed before full semantic QA.",
                summary
            );
            return;
        }

        pass(
            "Memory Vault summary",
            `Memory Vault has ${summary.totalMemories} memories, ${summary.totalChunks} chunks, ${summary.embeddedChunks} embedded chunks.`,
            summary
        );
    } catch (error) {
        fail("Memory Vault summary", error.message, error.response);
    }
}

async function testSemanticSearch() {
    try {
        const data = await requestJson("POST", "/api/memory-vault/search", {
            query: "buat caption promosi kopi susu dengan gaya santai",
            agentName: "design-agent",
            matchedSkillNames: ["generate_ad_copy", "social_caption"],
            allowedScopes: ["agent", "skill", "project", "global"],
            allowedSensitivityLevels: ["normal", "internal"],
            topK: 5,
            minScore: 0,
        });

        if (!isNumber(data?.totalCandidates)) {
            fail("Semantic search candidates", "totalCandidates is missing.", data);
            return;
        }

        if (!isNumber(data?.eligibleCandidates)) {
            fail("Semantic search guard", "eligibleCandidates is missing.", data);
            return;
        }

        if (!isNumber(data?.returnedCount)) {
            fail("Semantic search returned", "returnedCount is missing.", data);
            return;
        }

        if (!hasNonEmptyArray(data?.results)) {
            fail(
                "Semantic search results",
                "Semantic search returned no results. Check embeddings and local-hash provider.",
                data
            );
            return;
        }

        const firstResult = data.results[0];

        if (!hasNonEmptyArray(firstResult.accessReasons)) {
            fail(
                "Semantic search guard reasons",
                "First semantic result does not include accessReasons.",
                firstResult
            );
            return;
        }

        pass(
            "Semantic search guarded retrieval",
            `Semantic search returned ${data.returnedCount} results from ${data.eligibleCandidates} eligible candidates.`,
            {
                provider: data.provider,
                topResult: {
                    agentName: firstResult.agentName,
                    memoryType: firstResult.memoryType,
                    scope: firstResult.scope,
                    score: firstResult.score,
                    accessReasons: firstResult.accessReasons,
                    matchReasons: firstResult.matchReasons,
                },
            }
        );
    } catch (error) {
        fail("Semantic search guarded retrieval", error.message, error.response);
    }
}

async function testManualAllowedTask() {
    try {
        const data = await requestJson("POST", "/tasks", {
            inputText: "@design-agent buat caption promosi kopi susu dengan gaya santai",
            modelPreference: {
                provider: "google",
                model: "gemini-default",
                mode: "auto",
            },
        });

        if (!data?.result || typeof data.result !== "string") {
            fail("Manual allowed task result", "Manual allowed task result is missing.", data);
            return;
        }

        if (includesForbiddenRuntimeLeak(data.result)) {
            fail(
                "Manual output guardrails",
                "Manual output contains runtime/metadata leak.",
                {
                    result: data.result,
                }
            );
            return;
        }

        if (!data.runtimeProvider) {
            warn(
                "Manual runtime provider",
                "runtimeProvider is missing. This can be acceptable if runtime fallback happened.",
                data
            );
        } else {
            pass(
                "Manual runtime provider",
                "runtimeProvider metadata returned.",
                data.runtimeProvider
            );
        }

        if (!data.runtimeMemoryContext || data.runtimeMemoryContext.injected !== true) {
            fail(
                "Manual runtime memory context",
                "runtimeMemoryContext is missing or not injected.",
                data.runtimeMemoryContext
            );
            return;
        }

        if (!data.runtimeRagContext || data.runtimeRagContext.retrieved !== true) {
            fail(
                "Manual runtime RAG context",
                "runtimeRagContext is missing or not retrieved.",
                data.runtimeRagContext
            );
            return;
        }

        if (!hasNonEmptyArray(data.runtimeRagContext.topResults)) {
            fail(
                "Manual runtime RAG top results",
                "runtimeRagContext.topResults is empty.",
                data.runtimeRagContext
            );
            return;
        }

        if (!data.task || data.task.runtimeRagRetrieved !== true) {
            fail(
                "Manual task RAG audit storage",
                "Task does not contain runtimeRagRetrieved=true.",
                data.task
            );
            return;
        }

        pass(
            "Manual allowed task end-to-end",
            "Manual task returned clean result with runtime memory and runtime RAG metadata.",
            {
                result: data.result,
                runtimeMemoryContext: data.runtimeMemoryContext,
                runtimeRagContext: data.runtimeRagContext,
                taskId: data.task?.id,
            }
        );
    } catch (error) {
        fail("Manual allowed task end-to-end", error.message, error.response);
    }
}

async function testManualDeniedTask() {
    try {
        const data = await requestJson("POST", "/tasks", {
            inputText: "@design-agent generate gambar isometric vehicle",
            modelPreference: {
                provider: "google",
                model: "gemini-default",
                mode: "auto",
            },
        });

        const boundary = data?.capabilityBoundary;

        if (!boundary || boundary.allowed !== false) {
            fail(
                "Manual denied task boundary",
                "Expected capabilityBoundary.allowed=false.",
                data
            );
            return;
        }

        if (data.runtimeProvider !== null) {
            fail(
                "Manual denied runtime provider",
                "Denied task should not call runtimeProvider.",
                data.runtimeProvider
            );
            return;
        }

        if (data.runtimeMemoryContext !== null) {
            fail(
                "Manual denied memory context",
                "Denied task should return runtimeMemoryContext=null.",
                data.runtimeMemoryContext
            );
            return;
        }

        if (data.runtimeRagContext !== null) {
            fail(
                "Manual denied RAG context",
                "Denied task should return runtimeRagContext=null.",
                data.runtimeRagContext
            );
            return;
        }

        pass(
            "Manual denied task boundary",
            "Denied task correctly blocked by governance and did not run runtime memory/RAG.",
            {
                result: data.result,
                capabilityBoundary: boundary,
            }
        );
    } catch (error) {
        fail("Manual denied task boundary", error.message, error.response);
    }
}

async function testRecentTasksMetadata() {
    try {
        const data = await requestJson("GET", "/tasks/recent?limit=8");

        if (!hasArray(data?.tasks)) {
            fail("Recent tasks response", "tasks array is missing.", data);
            return;
        }

        if (data.tasks.length === 0) {
            warn("Recent tasks response", "No recent tasks found.", data);
            return;
        }

        const recentTaskWithRag = data.tasks.find((task) =>
            hasRuntimeRagMetadata(task)
        );

        if (!recentTaskWithRag) {
            fail(
                "Recent tasks RAG metadata",
                "No recent task contains runtime RAG metadata.",
                data.tasks.slice(0, 3)
            );
            return;
        }

        const recentTaskWithMemory = data.tasks.find((task) =>
            hasRuntimeMemoryMetadata(task)
        );

        if (!recentTaskWithMemory) {
            fail(
                "Recent tasks memory metadata",
                "No recent task contains runtime memory metadata.",
                data.tasks.slice(0, 3)
            );
            return;
        }

        pass(
            "Recent tasks runtime metadata",
            "Recent tasks include runtime memory and runtime RAG metadata.",
            {
                ragTask: {
                    id: recentTaskWithRag.id,
                    source: recentTaskWithRag.source,
                    runtimeRagRetrieved: recentTaskWithRag.runtimeRagRetrieved,
                    runtimeRagItemCount: recentTaskWithRag.runtimeRagItemCount,
                },
                memoryTask: {
                    id: recentTaskWithMemory.id,
                    source: recentTaskWithMemory.source,
                    runtimeMemoryInjected: recentTaskWithMemory.runtimeMemoryInjected,
                    runtimeMemoryItemCount: recentTaskWithMemory.runtimeMemoryItemCount,
                },
            }
        );
    } catch (error) {
        fail("Recent tasks runtime metadata", error.message, error.response);
    }
}

async function testProviderRegistry() {
    try {
        const data = await requestJson("GET", "/api/llm/providers");

        if (!data) {
            warn("LLM provider endpoint", "Provider endpoint returned empty response.", data);
            return;
        }

        pass("LLM provider endpoint", "LLM provider endpoint is reachable.", data);
    } catch (error) {
        warn(
            "LLM provider endpoint",
            "Provider endpoint check failed. This may be acceptable if route shape changed.",
            error.response || error.message
        );
    }
}

function buildManualQaChecklist() {
    return [
        "## Manual QA Checklist",
        "",
        "### Dashboard / Floating Assistant",
        "",
        "- [ ] Open `http://localhost:5173`.",
        "- [ ] Send `@design-agent buat caption promosi kopi susu dengan gaya santai`.",
        "- [ ] Confirm final answer is clean.",
        "- [ ] Confirm Runtime Provider is visible.",
        "- [ ] Confirm Runtime Memory is visible.",
        "- [ ] Confirm RAG Preview is visible.",
        "- [ ] Confirm no metadata leak: chunk IDs, scores, embeddings, vector search, Memory Vault internals.",
        "",
        "### WhatsApp Allowed",
        "",
        "- [ ] Send from authorized WhatsApp number: `@design-agent buat caption promosi kopi susu dengan gaya santai`.",
        "- [ ] Confirm WhatsApp reply is clean and mobile-friendly.",
        "- [ ] Confirm backend log shows `WhatsApp runtime RAG context: injected=true`.",
        "- [ ] Confirm `/tasks/recent?limit=5` shows latest WhatsApp task with `runtimeRagRetrieved=true`.",
        "",
        "### WhatsApp Denied",
        "",
        "- [ ] Send `@design-agent generate gambar isometric vehicle`.",
        "- [ ] Confirm polite refusal.",
        "- [ ] Confirm no LLM runtime metadata leak.",
        "- [ ] Confirm blocked task is stored as governance audit.",
        "",
        "### Office Scene",
        "",
        "- [ ] Open `/office`.",
        "- [ ] Click Mini Activity Log latest task.",
        "- [ ] Confirm Runtime Memory is visible.",
        "- [ ] Confirm Runtime RAG is visible.",
        "- [ ] Click Output Board.",
        "- [ ] Confirm Runtime RAG appears if latest task has RAG metadata.",
        "- [ ] Click WhatsApp Source and Manual Console.",
        "- [ ] Confirm old/null task compatibility remains safe.",
        "",
    ].join("\n");
}

function buildReport() {
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - state.startedAt.getTime();

    const lines = [];

    lines.push("# Runtime RAG Stability + Regression QA Report");
    lines.push("");
    lines.push(`Generated: ${nowIso()}`);
    lines.push(`Base URL: \`${BASE_URL}\``);
    lines.push(`Duration: ${durationMs} ms`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Passed: **${state.passed}**`);
    lines.push(`- Failed: **${state.failed}**`);
    lines.push(`- Warnings: **${state.warnings}**`);
    lines.push("");
    lines.push("## Automated Checks");
    lines.push("");

    state.results.forEach((result, index) => {
        const icon =
            result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";

        lines.push(`### ${index + 1}. ${icon} ${result.name}`);
        lines.push("");
        lines.push(`Status: **${result.status}**`);
        lines.push("");
        lines.push(result.details || "-");
        lines.push("");

        if (result.evidence) {
            lines.push("<details>");
            lines.push("<summary>Evidence</summary>");
            lines.push("");
            lines.push("```json");
            lines.push(safeJsonStringify(result.evidence));
            lines.push("```");
            lines.push("");
            lines.push("</details>");
            lines.push("");
        }
    });

    lines.push(buildManualQaChecklist());

    lines.push("## Regression Focus");
    lines.push("");
    lines.push("- Runtime provider metadata must remain visible and stored.");
    lines.push("- Governance boundary must block denied requests before LLM/RAG runtime.");
    lines.push("- Runtime memory metadata must remain visible in widget, Recent Tasks, and Office Detail.");
    lines.push("- Runtime RAG metadata must remain visible in widget, Recent Tasks, and Office Detail.");
    lines.push("- WhatsApp output must remain clean, concise, and metadata-free.");
    lines.push("- Old/null tasks must not break dashboard or Office scene.");
    lines.push("");
    lines.push("## Final Status");
    lines.push("");
    lines.push(
        state.failed === 0
            ? "✅ Automated QA completed without failures."
            : "❌ Automated QA found failures. Review failed checks above."
    );
    lines.push("");

    return lines.join("\n");
}

async function main() {
    console.log("");
    console.log("===============================================");
    console.log(" Runtime RAG Stability + Regression QA Sweep");
    console.log("===============================================");
    console.log("");
    console.log(`[QA] Base URL: ${BASE_URL}`);
    console.log("");

    await testHealth();
    await testProviderRegistry();
    await testMemoryVaultSummary();
    await testSemanticSearch();
    await testManualAllowedTask();
    await testManualDeniedTask();
    await testRecentTasksMetadata();

    if (!fs.existsSync(REPORT_DIR)) {
        fs.mkdirSync(REPORT_DIR, {
            recursive: true,
        });
    }

    const report = buildReport();
    fs.writeFileSync(REPORT_PATH, report, "utf8");

    console.log("");
    console.log("===============================================");
    console.log(" QA SUMMARY");
    console.log("===============================================");
    console.log(`Passed:   ${state.passed}`);
    console.log(`Failed:   ${state.failed}`);
    console.log(`Warnings: ${state.warnings}`);
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