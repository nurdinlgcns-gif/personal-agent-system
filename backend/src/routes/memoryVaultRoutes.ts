import { Router } from "express";
import {
  findAllMemories,
  findMemoriesByAgentName,
} from "../repositories/memoryRepository";
import { resolveRuntimeMemoriesForAgent } from "../services/memory/memoryRuntimeScopeResolver";

export const memoryVaultRoutes = Router();

function safeJsonParse<TValue>(value: string | null | undefined, fallback: TValue) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

type MemoryWithAgent = Awaited<ReturnType<typeof findAllMemories>>[number];

function mapMemory(memory: MemoryWithAgent) {
  return {
    id: memory.id,
    agentId: memory.agentId,
    agentName: memory.agent.name,
    agentColor: memory.agent.color,
    content: memory.content,
    type: memory.type,

    scope: memory.scope,
    ownerAgentName: memory.ownerAgentName,
    allowedAgents: safeJsonParse<string[]>(memory.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(memory.linkedSkillNamesJson, []),
    runtimeInjectable: memory.runtimeInjectable,
    ragEnabled: memory.ragEnabled,
    sensitivityLevel: memory.sensitivityLevel,
    sourceType: memory.sourceType,
    sourceRef: memory.sourceRef,

    createdAt: memory.createdAt,
  };
}

memoryVaultRoutes.get("/memories", async (_request, response) => {
  const memories = await findAllMemories();

  response.json({
    memories: memories.map(mapMemory),
  });
});

memoryVaultRoutes.get("/memories/:agentName", async (request, response) => {
  const memories = await findMemoriesByAgentName(request.params.agentName);

  response.json({
    memories: memories.map(mapMemory),
  });
});

memoryVaultRoutes.get("/summary", async (_request, response) => {
  const memories = await findAllMemories();

  const byAgent = memories.reduce<Record<string, number>>((accumulator, memory) => {
    const agentName = memory.agent.name;

    accumulator[agentName] = (accumulator[agentName] || 0) + 1;

    return accumulator;
  }, {});

  const byType = memories.reduce<Record<string, number>>((accumulator, memory) => {
    accumulator[memory.type] = (accumulator[memory.type] || 0) + 1;

    return accumulator;
  }, {});

  const byScope = memories.reduce<Record<string, number>>((accumulator, memory) => {
    accumulator[memory.scope] = (accumulator[memory.scope] || 0) + 1;

    return accumulator;
  }, {});

  const ragReadyCount = memories.filter((memory) => memory.ragEnabled).length;
  const runtimeInjectableCount = memories.filter(
    (memory) => memory.runtimeInjectable
  ).length;

  response.json({
    summary: {
      totalMemories: memories.length,
      agentCount: Object.keys(byAgent).length,
      byAgent,
      byType,
      byScope,
      ragReadyCount,
      runtimeInjectableCount,
    },
  });
});

memoryVaultRoutes.post("/resolve", async (request, response) => {
  const agentName =
    typeof request.body?.agentName === "string" ? request.body.agentName : "";

  if (!agentName.trim()) {
    response.status(400).json({
      message: "agentName is required.",
    });
    return;
  }

  const inputText =
    typeof request.body?.inputText === "string" ? request.body.inputText : "";

  const source =
    request.body?.source === "whatsapp" ||
    request.body?.source === "api" ||
    request.body?.source === "system"
      ? request.body.source
      : "manual";

  const matchedSkillNames = Array.isArray(request.body?.matchedSkillNames)
    ? request.body.matchedSkillNames.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : [];

  const maxResults =
    typeof request.body?.maxResults === "number" &&
    request.body.maxResults > 0
      ? Math.min(request.body.maxResults, 20)
      : 8;

  const includeNonRuntimeInjectable =
    typeof request.body?.includeNonRuntimeInjectable === "boolean"
      ? request.body.includeNonRuntimeInjectable
      : false;

  const allowedSensitivityLevels = Array.isArray(
    request.body?.allowedSensitivityLevels
  )
    ? request.body.allowedSensitivityLevels.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : undefined;

  const result = await resolveRuntimeMemoriesForAgent({
    agentName,
    inputText,
    source,
    matchedSkillNames,
    maxResults,
    includeNonRuntimeInjectable,
    allowedSensitivityLevels,
  });

  response.json(result);
});