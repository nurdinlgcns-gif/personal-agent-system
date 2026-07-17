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
validateEnv();
import { resolveRuntimeMemoriesForAgent } from "./services/memory/memoryRuntimeScopeResolver";
import { buildRuntimeMemoryContextBlock } from "./services/memory/runtimeMemoryContextFormatter";
import { formatManualRuntimeOutput } from "./services/llm/manualRuntimeOutputGuardrails";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/llm", llmRoutes);
app.use("/api/llm/registry", llmProviderRegistryRoutes);
app.use("/api/agent-governance", agentGovernanceRoutes);
app.use("/api/memory-vault", memoryVaultRoutes);

app.get("/health", (req, res) => {
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

function buildManualSystemPrompt(agentName: string, memoryContextBlock?: string) {
  return [
    `You are ${agentName}.`,
    "Answer the user's request directly and clearly.",
    "Keep the response practical and useful.",
    "Do not expose internal reasoning.",
    "If the user requests a short answer, keep it short.",
    "Never mention internal runtime metadata, provider metadata, governance metadata, or memory retrieval metadata.",
    "If runtime memory context is provided, use it silently only when it improves relevance.",
    memoryContextBlock
      ? [
          "",
          "Scoped runtime memory:",
          memoryContextBlock,
          "",
          "Important memory handling rules:",
          "1. Use memory only as background context.",
          "2. Do not quote memory metadata.",
          "3. Do not say that memory was retrieved.",
          "4. Do not reveal Memory Vault internals.",
          "5. If memory is unrelated, ignore it.",
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

    /**
     * Phase 8.38.2
     * Manual task capability boundary.
     *
     * If the target agent is not allowed to handle the request,
     * return a polite refusal and DO NOT call routeTask() or the LLM runtime.
     * This keeps agent behavior aligned with its declared contract.
     */
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
        capabilityBoundary: {
          allowed: capabilityCheck.allowed,
          agentName: capabilityCheck.agentName,
          reason: capabilityCheck.reason,
          confidence: capabilityCheck.confidence,
          matchedAllowedKeywords: capabilityCheck.matchedAllowedKeywords,
          matchedDeniedKeywords: capabilityCheck.matchedDeniedKeywords,
          matchedSoftAllowedKeywords: capabilityCheck.matchedSoftAllowedKeywords,
          matchedSmallTalkKeywords: capabilityCheck.matchedSmallTalkKeywords,
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

    /*
      Keep existing orchestrator behavior as safe fallback.
      This also preserves current task creation, socket events, and routing behavior.
    */
    const fallbackResult = await routeTask(inputText, {
      source: "manual",
    });

    /*
      Adapter runtime output:
      - If real provider succeeds: use real output.
      - If provider returns mock/fallback: preserve old routeTask output.
    */
    const runtimeResult = await runLlmCompletion({
      agentName,
      systemPrompt: buildManualSystemPrompt(
        agentName,
        runtimeMemoryContext.contextBlock
      ),
      inputText,
      preference: modelPreference,
    });

    const finalOutputText = runtimeResult.isMock
      ? fallbackResult
      : runtimeResult.outputText;

      const updatedTaskWithRuntimeMetadata = await storeLatestTaskRuntimeResult({
        inputText,
        agentName,
        source: "manual",
        outputText: finalOutputText,
        runtimeResult,
        capabilityCheck,
      });

    return res.json({
      result: finalOutputText,
      task: updatedTaskWithRuntimeMetadata,
      memoryContext,
      runtimeMemoryContext: runtimeMemoryContext.summary,
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

app.get("/agents/status", async (req, res) => {
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

app.get("/tasks/recent", async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit || 10);
    const limit = Number.isNaN(rawLimit) ? 10 : rawLimit;

    const tasks = await findRecentTasks(limit);

    return res.json({
      tasks: tasks.map((task) => ({
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
        governanceAllowed: task.governanceAllowed,
        governanceReason: task.governanceReason,
        governanceConfidence: task.governanceConfidence,
        governanceMatchedAllowedJson: task.governanceMatchedAllowedJson,
        governanceMatchedDeniedJson: task.governanceMatchedDeniedJson,
        governanceMatchedSoftJson: task.governanceMatchedSoftJson,
        governanceMatchedSmallTalkJson: task.governanceMatchedSmallTalkJson,
        governanceSuggestedAgentsJson: task.governanceSuggestedAgentsJson,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    });
  } catch (error) {
    logger.error("Failed to fetch recent tasks", error);

    return res.status(500).json({
      error: "Terjadi error saat mengambil recent tasks.",
    });
  }
});

app.get("/skills", async (req, res) => {
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

app.get("/dashboard/summary", async (req, res) => {
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