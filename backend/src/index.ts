import express from "express";
import cors from "cors";
import http from "http";

import { routeTask } from "./orchestrator";
import { startWhatsApp } from "./webhook/whatsapp";
import { env, validateEnv } from "./config/env";
import { logger } from "./utils/logger";
import { initWebSocket } from "./websocket";
import { findAllAgents } from "./repositories/agentRepository";
import { findRecentTasks, getTaskSummary } from "./repositories/taskRepository";
import { findAllSkills } from "./repositories/skillRepository";
import { llmRoutes } from "./routes/llmRoutes";
import { llmProviderRegistryRoutes } from "./routes/llmProviderRegistryRoutes";
import { agentGovernanceRoutes } from "./routes/agentGovernanceRoutes";
import { memoryVaultRoutes } from "./routes/memoryVaultRoutes";
import { extractManualTaskModelPreference } from "./services/llm/manualTaskModelPreference";
import { runLlmCompletion } from "./services/llm/llmClient";
import {
  storeGovernanceBlockedTask,
  storeLatestTaskRuntimeResult,
} from "./services/llm/taskRuntimeMetadataService";
import { checkAgentCapabilityDynamic } from "./services/agents/agentCapabilityGuard";
import { resolveRuntimeMemoriesForAgent } from "./services/memory/memoryRuntimeScopeResolver";
import { buildRuntimeMemoryContextBlock } from "./services/memory/runtimeMemoryContextFormatter";
import { buildRuntimeRagContextBlock } from "./services/memory/runtimeRagContextFormatter";
import {
  buildRuntimeRagQuery,
  getRuntimeRagQualityConfig,
} from "./services/memory/runtimeRagQualityTuning";
import { searchSemanticMemoryChunks } from "./services/embeddings/semanticMemorySearchService";
import { formatManualRuntimeOutput } from "./services/llm/manualRuntimeOutputGuardrails";

validateEnv();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/llm", llmRoutes);
app.use("/api/llm/registry", llmProviderRegistryRoutes);
app.use("/api/agent-governance", agentGovernanceRoutes);
app.use("/api/memory-vault", memoryVaultRoutes);

app.get("/health", (_req, res) => {
  res.json({
    app: "personal-agent-system",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

function extractInputText(body: unknown) {
  const requestBody = body as {
    message?: unknown;
    inputText?: unknown;
  };

  if (typeof requestBody.inputText === "string") {
    return requestBody.inputText;
  }

  if (typeof requestBody.message === "string") {
    return requestBody.message;
  }

  return "";
}

function extractAgentNameFromMessage(message: string) {
  const agentMentionMatch = message.match(/@([\w-]+)/);

  return agentMentionMatch?.[1] || "design-agent";
}

function buildManualSystemPrompt(input: {
  agentName: string;
  memoryContextBlock?: string;
  ragContextBlock?: string;
}) {
  return [
    `You are ${input.agentName}.`,
    "Answer the user's request directly and clearly.",
    "Keep the response practical and useful.",
    "Return only the final answer.",
    "Do not expose internal reasoning.",
    "Do not include bullet-point analysis, constraints, self-checks, labels, or hidden planning.",
    "Do not include lines such as Style, Constraint, Target audience, Tone, Content, Direct answer only, or Language matches.",
    "If the user requests a short answer, keep it short.",
    "Never mention internal runtime metadata, provider metadata, governance metadata, memory retrieval metadata, RAG metadata, chunk IDs, scores, embeddings, vector search, or source references.",
    "If runtime memory context is provided, use it silently only when it improves relevance.",
    "If runtime RAG context is provided, use it silently only when it improves relevance.",
    "If any context is unrelated to the user's request, ignore that context.",
    input.memoryContextBlock
      ? [
        "",
        "Scoped runtime memory:",
        input.memoryContextBlock,
        "",
        "Important memory handling rules:",
        "1. Use memory only as background context.",
        "2. Do not quote memory metadata.",
        "3. Do not say that memory was retrieved.",
        "4. Do not reveal Memory Vault internals.",
        "5. If memory is unrelated, ignore it.",
      ].join("\n")
      : "",
    input.ragContextBlock
      ? [
        "",
        "Scoped runtime RAG context:",
        input.ragContextBlock,
        "",
        "Important RAG handling rules:",
        "1. Use RAG chunks only as background context.",
        "2. Do not mention chunk IDs, scores, embeddings, vector search, retrieval, semantic search, or RAG internals.",
        "3. Do not quote RAG metadata.",
        "4. Do not say that chunks were retrieved.",
        "5. If RAG context is unrelated, ignore it.",
        "6. Keep the final answer user-facing only.",
      ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCapabilityBoundaryResponse(input: {
  agentName: string;
  refusalMessage?: string;
}) {
  return (
    input.refusalMessage ||
    `Maaf, @${input.agentName} belum punya capability yang sesuai untuk request ini. Coba arahkan ke agent yang lebih tepat.`
  );
}


app.post("/tasks", async (req, res) => {
  try {
    const inputText = extractInputText(req.body);

    if (!inputText || typeof inputText !== "string") {
      return res.status(400).json({
        error:
          "Field 'message' atau 'inputText' wajib diisi dan harus berupa string.",
      });
    }

    if (!inputText.includes("@")) {
      return res.status(400).json({
        error:
          "Message harus menyertakan mention agent, contoh: @design-agent halo",
      });
    }

    const agentName = extractAgentNameFromMessage(inputText);

    const capabilityCheck = await checkAgentCapabilityDynamic({
      agentName,
      inputText,
    });

    if (!capabilityCheck.allowed) {
      const boundaryResponse = buildCapabilityBoundaryResponse({
        agentName,
        refusalMessage: capabilityCheck.refusalMessage,
      });

      const blockedTask = await storeGovernanceBlockedTask({
        inputText,
        agentName,
        source: "manual",
        outputText: boundaryResponse,
        capabilityCheck,
      });

      logger.task(
        `Manual task blocked by capability guard: ${agentName} | ${capabilityCheck.reason}`
      );

      return res.json({
        result: boundaryResponse,
        task: blockedTask,
        runtimeProvider: null,
        memoryContext: null,
        runtimeMemoryContext: null,
        runtimeRagContext: null,
        capabilityBoundary: {
          allowed: capabilityCheck.allowed,
          agentName: capabilityCheck.agentName,
          reason: capabilityCheck.reason,
          confidence: capabilityCheck.confidence,
          matchedAllowedKeywords: capabilityCheck.matchedAllowedKeywords,
          matchedDeniedKeywords: capabilityCheck.matchedDeniedKeywords,
          matchedSoftAllowedKeywords: capabilityCheck.matchedSoftAllowedKeywords,
          matchedSmallTalkKeywords: capabilityCheck.matchedSmallTalkKeywords,
          matchedSkillNames: capabilityCheck.matchedSkillNames,
          matchedSkillSignals: capabilityCheck.matchedSkillSignals,
          suggestedAgents: capabilityCheck.suggestedAgents,
        },
      });
    }

    const modelPreference = extractManualTaskModelPreference(req.body);

    const memoryContext = await resolveRuntimeMemoriesForAgent({
      agentName,
      inputText,
      source: "manual",
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      maxResults: 5,
    });

    const runtimeMemoryContext = buildRuntimeMemoryContextBlock(memoryContext, {
      maxItems: 3,
      maxTotalChars: 1500,
      maxCharsPerMemory: 430,
    });

    logger.task(
      `Manual runtime memory context: injected=${runtimeMemoryContext.summary.injected} items=${runtimeMemoryContext.summary.itemCount} chars=${runtimeMemoryContext.summary.totalChars}`
    );

    const ragQualityConfig = getRuntimeRagQualityConfig("manual");
    const runtimeRagQuery = buildRuntimeRagQuery(inputText);

    const semanticRagSearch = await searchSemanticMemoryChunks({
      query: runtimeRagQuery,
      agentName,
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      allowedScopes: ragQualityConfig.allowedScopes,
      allowedSensitivityLevels: ragQualityConfig.allowedSensitivityLevels,
      topK: ragQualityConfig.topK,
      minScore: ragQualityConfig.minScore,
    });

    const runtimeRagContext = buildRuntimeRagContextBlock(semanticRagSearch, {
      maxItems: ragQualityConfig.maxItems,
      maxTotalChars: ragQualityConfig.maxTotalChars,
      maxCharsPerChunk: ragQualityConfig.maxCharsPerChunk,
      minScore: ragQualityConfig.minScore,
      excludedMemoryIds: runtimeMemoryContext.summary.usedMemoryIds,
      previewOnly: false,
    });

    logger.task(
      `Manual runtime RAG context: injected=${runtimeRagContext.summary.retrieved} items=${runtimeRagContext.summary.itemCount} chars=${runtimeRagContext.summary.totalChars}`
    );

    const fallbackResult = await routeTask(inputText, {
      source: "manual",
    });

    const runtimeResult = await runLlmCompletion({
      agentName,
      systemPrompt: buildManualSystemPrompt({
        agentName,
        memoryContextBlock: runtimeMemoryContext.contextBlock,
        ragContextBlock: runtimeRagContext.contextBlock,
      }),
      inputText,
      preference: modelPreference,
    });

    const finalOutputText = runtimeResult.isMock
      ? fallbackResult
      : formatManualRuntimeOutput(inputText, runtimeResult.outputText);

    const updatedTaskWithRuntimeMetadata = await storeLatestTaskRuntimeResult({
      inputText,
      agentName,
      source: "manual",
      outputText: finalOutputText,
      runtimeResult,
      capabilityCheck,
      runtimeMemoryContext: runtimeMemoryContext.summary,
      runtimeRagContext: runtimeRagContext.summary,
    });

    return res.json({
      result: finalOutputText,
      task: updatedTaskWithRuntimeMetadata,
      memoryContext,
      runtimeMemoryContext: runtimeMemoryContext.summary,
      runtimeRagContext: runtimeRagContext.summary,
      runtimeProvider: {
        providerId: runtimeResult.providerId || null,
        providerName: runtimeResult.providerName || runtimeResult.provider,
        providerType: runtimeResult.providerType || runtimeResult.provider,
        model: runtimeResult.model,
        mode: runtimeResult.mode,
        resolvedFrom: runtimeResult.resolvedFrom,
        isMock: runtimeResult.isMock,
      },
      capabilityBoundary: {
        allowed: capabilityCheck.allowed,
        agentName: capabilityCheck.agentName,
        reason: capabilityCheck.reason,
        confidence: capabilityCheck.confidence,
        matchedAllowedKeywords: capabilityCheck.matchedAllowedKeywords,
        matchedDeniedKeywords: capabilityCheck.matchedDeniedKeywords,
        matchedSoftAllowedKeywords: capabilityCheck.matchedSoftAllowedKeywords,
        matchedSmallTalkKeywords: capabilityCheck.matchedSmallTalkKeywords,
        matchedSkillNames: capabilityCheck.matchedSkillNames,
        matchedSkillSignals: capabilityCheck.matchedSkillSignals,
        suggestedAgents: capabilityCheck.suggestedAgents,
      },
    });
  } catch (error) {
    logger.error("Failed to process manual task request", error);

    return res.status(500).json({
      error: "Terjadi error saat memproses task.",
    });
  }
});

app.get("/agents/status", async (_req, res) => {
  try {
    const agents = await findAllAgents();

    return res.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        color: agent.color,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      })),
    });
  } catch (error) {
    logger.error("Failed to fetch agent status", error);

    return res.status(500).json({
      error: "Terjadi error saat mengambil status agent.",
    });
  }
});

type TaskGovernanceMetadata = {
  governanceAllowed?: boolean | null;
  governanceReason?: string | null;
  governanceConfidence?: string | null;
  governanceMatchedAllowedJson?: string | null;
  governanceMatchedDeniedJson?: string | null;
  governanceMatchedSoftJson?: string | null;
  governanceMatchedSmallTalkJson?: string | null;
  governanceSuggestedAgentsJson?: string | null;
};

type TaskRuntimeMemoryMetadata = {
  runtimeMemoryInjected?: boolean | null;
  runtimeMemoryItemCount?: number | null;
  runtimeMemoryTotalChars?: number | null;
  runtimeMemoryIdsJson?: string | null;
  runtimeMemoryTypesJson?: string | null;
  runtimeMemoryScopesJson?: string | null;
  runtimeMemorySourcesJson?: string | null;
};

type TaskRuntimeRagMetadata = {
  runtimeRagPreviewOnly?: boolean | null;
  runtimeRagRetrieved?: boolean | null;
  runtimeRagQuery?: string | null;
  runtimeRagItemCount?: number | null;
  runtimeRagTotalChars?: number | null;
  runtimeRagChunkIdsJson?: string | null;
  runtimeRagMemoryIdsJson?: string | null;
  runtimeRagTypesJson?: string | null;
  runtimeRagScopesJson?: string | null;
  runtimeRagSourcesJson?: string | null;
  runtimeRagScoresJson?: string | null;
  runtimeRagTopResultsJson?: string | null;
};

app.get("/tasks/recent", async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit || 10);
    const limit = Number.isNaN(rawLimit) ? 10 : rawLimit;

    const tasks = await findRecentTasks(limit);

    return res.json({
      tasks: tasks.map((task) => {
        const taskWithMetadata = task as typeof task &
          TaskGovernanceMetadata &
          TaskRuntimeMemoryMetadata &
          TaskRuntimeRagMetadata;

        return {
          id: task.id,
          agentName: task.agent.name,
          inputText: task.inputText,
          outputText: task.outputText,
          status: task.status,
          source: task.source,

          runtimeProviderId: task.runtimeProviderId,
          runtimeProviderName: task.runtimeProviderName,
          runtimeProviderType: task.runtimeProviderType,
          runtimeModel: task.runtimeModel,
          runtimeMode: task.runtimeMode,
          runtimeResolvedFrom: task.runtimeResolvedFrom,

          governanceAllowed: taskWithMetadata.governanceAllowed ?? null,
          governanceReason: taskWithMetadata.governanceReason ?? null,
          governanceConfidence: taskWithMetadata.governanceConfidence ?? null,
          governanceMatchedAllowedJson:
            taskWithMetadata.governanceMatchedAllowedJson ?? null,
          governanceMatchedDeniedJson:
            taskWithMetadata.governanceMatchedDeniedJson ?? null,
          governanceMatchedSoftJson:
            taskWithMetadata.governanceMatchedSoftJson ?? null,
          governanceMatchedSmallTalkJson:
            taskWithMetadata.governanceMatchedSmallTalkJson ?? null,
          governanceSuggestedAgentsJson:
            taskWithMetadata.governanceSuggestedAgentsJson ?? null,

          runtimeMemoryInjected:
            taskWithMetadata.runtimeMemoryInjected ?? null,
          runtimeMemoryItemCount:
            taskWithMetadata.runtimeMemoryItemCount ?? null,
          runtimeMemoryTotalChars:
            taskWithMetadata.runtimeMemoryTotalChars ?? null,
          runtimeMemoryIdsJson:
            taskWithMetadata.runtimeMemoryIdsJson ?? null,
          runtimeMemoryTypesJson:
            taskWithMetadata.runtimeMemoryTypesJson ?? null,
          runtimeMemoryScopesJson:
            taskWithMetadata.runtimeMemoryScopesJson ?? null,
          runtimeMemorySourcesJson:
            taskWithMetadata.runtimeMemorySourcesJson ?? null,

          runtimeRagPreviewOnly:
            taskWithMetadata.runtimeRagPreviewOnly ?? null,
          runtimeRagRetrieved:
            taskWithMetadata.runtimeRagRetrieved ?? null,
          runtimeRagQuery:
            taskWithMetadata.runtimeRagQuery ?? null,
          runtimeRagItemCount:
            taskWithMetadata.runtimeRagItemCount ?? null,
          runtimeRagTotalChars:
            taskWithMetadata.runtimeRagTotalChars ?? null,
          runtimeRagChunkIdsJson:
            taskWithMetadata.runtimeRagChunkIdsJson ?? null,
          runtimeRagMemoryIdsJson:
            taskWithMetadata.runtimeRagMemoryIdsJson ?? null,
          runtimeRagTypesJson:
            taskWithMetadata.runtimeRagTypesJson ?? null,
          runtimeRagScopesJson:
            taskWithMetadata.runtimeRagScopesJson ?? null,
          runtimeRagSourcesJson:
            taskWithMetadata.runtimeRagSourcesJson ?? null,
          runtimeRagScoresJson:
            taskWithMetadata.runtimeRagScoresJson ?? null,
          runtimeRagTopResultsJson:
            taskWithMetadata.runtimeRagTopResultsJson ?? null,

          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      }),
    });
  } catch (error) {
    logger.error("Failed to fetch recent tasks", error);

    return res.status(500).json({
      error: "Terjadi error saat mengambil recent tasks.",
    });
  }
});

app.get("/skills", async (_req, res) => {
  try {
    const skills = await findAllSkills();

    return res.json({
      skills: skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        filePath: skill.filePath,
        content: skill.content,
        agentName: skill.agent.name,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      })),
    });
  } catch (error) {
    logger.error("Failed to fetch skills", error);

    return res.status(500).json({
      error: "Terjadi error saat mengambil skills.",
    });
  }
});

app.get("/dashboard/summary", async (_req, res) => {
  try {
    const summary = await getTaskSummary();

    return res.json({
      summary,
    });
  } catch (error) {
    logger.error("Failed to fetch dashboard summary", error);

    return res.status(500).json({
      error: "Terjadi error saat mengambil dashboard summary.",
    });
  }
});

const server = http.createServer(app);

initWebSocket(server);

server.listen(env.PORT, () => {
  logger.server(`Server jalan di port ${env.PORT}`);
});

startWhatsApp();