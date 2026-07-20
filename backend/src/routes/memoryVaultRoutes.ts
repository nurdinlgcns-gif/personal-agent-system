import { Router } from "express";
import {
  findAllMemories,
  findMemoriesByAgentName,
} from "../repositories/memoryRepository";
import {
  findAllMemoryChunks,
  findMemoryChunksByMemoryId,
  getMemoryChunkSummary,
} from "../repositories/memoryChunkRepository";
import { resolveRuntimeMemoriesForAgent } from "../services/memory/memoryRuntimeScopeResolver";
import { rebuildMemoryChunks } from "../services/memory/memoryChunkingService";
import { getActiveEmbeddingProviderInfo } from "../services/embeddings/embeddingClient";
import { embedMemoryChunks } from "../services/embeddings/memoryChunkEmbeddingService";
import { searchSemanticMemoryChunks } from "../services/embeddings/semanticMemorySearchService";
import { runMemoryVaultMaintenance } from "../services/memory/memoryMaintenanceService";

export const memoryVaultRoutes = Router();

function safeJsonParse<TValue>(
  value: string | null | undefined,
  fallback: TValue
) {
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

type MemoryScopeMetadata = {
  scope?: string | null;
  ownerAgentName?: string | null;
  allowedAgentsJson?: string | null;
  linkedSkillNamesJson?: string | null;
  runtimeInjectable?: boolean | null;
  ragEnabled?: boolean | null;
  sensitivityLevel?: string | null;
  sourceType?: string | null;
  sourceRef?: string | null;
};

type MemoryWithScopeMetadata = MemoryWithAgent & MemoryScopeMetadata;

function withScopeMetadata(memory: MemoryWithAgent): MemoryWithScopeMetadata {
  return memory as MemoryWithScopeMetadata;
}

function mapMemory(memory: MemoryWithAgent) {
  const scopedMemory = withScopeMetadata(memory);

  return {
    id: scopedMemory.id,
    agentId: scopedMemory.agentId,
    agentName: scopedMemory.agent.name,
    agentColor: scopedMemory.agent.color,
    content: scopedMemory.content,
    type: scopedMemory.type,

    scope: scopedMemory.scope || "agent",
    ownerAgentName: scopedMemory.ownerAgentName || null,
    allowedAgents: safeJsonParse<string[]>(scopedMemory.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(
      scopedMemory.linkedSkillNamesJson,
      []
    ),
    runtimeInjectable: scopedMemory.runtimeInjectable ?? false,
    ragEnabled: scopedMemory.ragEnabled ?? false,
    sensitivityLevel: scopedMemory.sensitivityLevel || "normal",
    sourceType: scopedMemory.sourceType || "manual",
    sourceRef: scopedMemory.sourceRef || null,

    createdAt: scopedMemory.createdAt,
  };
}

function mapMemoryChunk(
  chunk: Awaited<ReturnType<typeof findAllMemoryChunks>>[number]
) {
  return {
    id: chunk.id,
    memoryId: chunk.memoryId,
    agentId: chunk.agentId,
    agentName: chunk.agentName,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    charCount: chunk.charCount,
    tokenEstimate: chunk.tokenEstimate,
    memoryType: chunk.memoryType,
    scope: chunk.scope,
    ownerAgentName: chunk.ownerAgentName,
    allowedAgents: safeJsonParse<string[]>(chunk.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(chunk.linkedSkillNamesJson, []),
    sensitivityLevel: chunk.sensitivityLevel,
    sourceType: chunk.sourceType,
    sourceRef: chunk.sourceRef,
    embeddingStatus: chunk.embeddingStatus,
    embeddingModel: chunk.embeddingModel,
    createdAt: chunk.createdAt,
    updatedAt: chunk.updatedAt,
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
  const chunkSummary = await getMemoryChunkSummary();

  const byAgent = memories.reduce<Record<string, number>>(
    (accumulator, memory) => {
      const agentName = memory.agent.name;

      accumulator[agentName] = (accumulator[agentName] || 0) + 1;

      return accumulator;
    },
    {}
  );

  const byType = memories.reduce<Record<string, number>>(
    (accumulator, memory) => {
      accumulator[memory.type] = (accumulator[memory.type] || 0) + 1;

      return accumulator;
    },
    {}
  );

  const byScope = memories.reduce<Record<string, number>>(
    (accumulator, memory) => {
      const scopedMemory = withScopeMetadata(memory);
      const scope = scopedMemory.scope || "agent";

      accumulator[scope] = (accumulator[scope] || 0) + 1;

      return accumulator;
    },
    {}
  );

  const ragReadyCount = memories.filter(
    (memory) => withScopeMetadata(memory).ragEnabled
  ).length;

  const runtimeInjectableCount = memories.filter(
    (memory) => withScopeMetadata(memory).runtimeInjectable
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

      totalChunks: chunkSummary.totalChunks,
      chunkedMemoryCount: chunkSummary.chunkedMemoryCount,
      pendingEmbeddings: chunkSummary.pendingEmbeddings,
      embeddedChunks: chunkSummary.embeddedChunks,
      failedEmbeddings: chunkSummary.failedEmbeddings,
      totalChunkChars: chunkSummary.totalChars,
      totalChunkTokenEstimate: chunkSummary.totalTokenEstimate,
      chunksByAgent: chunkSummary.byAgent,
      chunksByType: chunkSummary.byType,
      chunksByScope: chunkSummary.byScope,
    },
  });
});

memoryVaultRoutes.get("/embedding/providers", async (_request, response) => {
  response.json({
    provider: getActiveEmbeddingProviderInfo(),
  });
});

memoryVaultRoutes.get("/chunks", async (_request, response) => {
  const chunks = await findAllMemoryChunks();

  response.json({
    chunks: chunks.map(mapMemoryChunk),
  });
});

memoryVaultRoutes.post("/chunks/rebuild", async (request, response) => {
  const memoryId =
    typeof request.body?.memoryId === "string"
      ? request.body.memoryId
      : undefined;

  const maxChunkChars =
    typeof request.body?.maxChunkChars === "number"
      ? request.body.maxChunkChars
      : undefined;

  const overlapChars =
    typeof request.body?.overlapChars === "number"
      ? request.body.overlapChars
      : undefined;

  const minChunkChars =
    typeof request.body?.minChunkChars === "number"
      ? request.body.minChunkChars
      : undefined;

  const result = await rebuildMemoryChunks({
    memoryId,
    options: {
      maxChunkChars,
      overlapChars,
      minChunkChars,
    },
  });

  response.json(result);
});

memoryVaultRoutes.post("/chunks/embed", async (request, response) => {
  const memoryId =
    typeof request.body?.memoryId === "string"
      ? request.body.memoryId
      : undefined;

  const chunkId =
    typeof request.body?.chunkId === "string"
      ? request.body.chunkId
      : undefined;

  const onlyPending =
    typeof request.body?.onlyPending === "boolean"
      ? request.body.onlyPending
      : true;

  const limit =
    typeof request.body?.limit === "number" && request.body.limit > 0
      ? Math.min(request.body.limit, 200)
      : undefined;

  const result = await embedMemoryChunks({
    memoryId,
    chunkId,
    onlyPending,
    limit,
  });

  response.json(result);
});

memoryVaultRoutes.post("/maintenance/rebuild-embed", async (request, response) => {
  const memoryId =
    typeof request.body?.memoryId === "string"
      ? request.body.memoryId
      : undefined;

  const rebuild =
    typeof request.body?.rebuild === "boolean" ? request.body.rebuild : true;

  const embed =
    typeof request.body?.embed === "boolean" ? request.body.embed : true;

  const embedOnlyPending =
    typeof request.body?.embedOnlyPending === "boolean"
      ? request.body.embedOnlyPending
      : false;

  const limit =
    typeof request.body?.limit === "number" && request.body.limit > 0
      ? Math.min(request.body.limit, 500)
      : undefined;

  const maxChunkChars =
    typeof request.body?.maxChunkChars === "number"
      ? request.body.maxChunkChars
      : undefined;

  const overlapChars =
    typeof request.body?.overlapChars === "number"
      ? request.body.overlapChars
      : undefined;

  const minChunkChars =
    typeof request.body?.minChunkChars === "number"
      ? request.body.minChunkChars
      : undefined;

  const result = await runMemoryVaultMaintenance({
    memoryId,
    rebuild,
    embed,
    embedOnlyPending,
    limit,
    maxChunkChars,
    overlapChars,
    minChunkChars,
  });

  response.json(result);
});

memoryVaultRoutes.post("/search", async (request, response) => {
  const query =
    typeof request.body?.query === "string" ? request.body.query : "";

  if (!query.trim()) {
    response.status(400).json({
      message: "query is required.",
    });
    return;
  }

  const agentName =
    typeof request.body?.agentName === "string"
      ? request.body.agentName
      : undefined;

  const topK =
    typeof request.body?.topK === "number" && request.body.topK > 0
      ? Math.min(request.body.topK, 50)
      : 5;

  const minScore =
    typeof request.body?.minScore === "number" ? request.body.minScore : 0;

  const allowedAgents = Array.isArray(request.body?.allowedAgents)
    ? request.body.allowedAgents.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : undefined;

  const matchedSkillNames = Array.isArray(request.body?.matchedSkillNames)
    ? request.body.matchedSkillNames.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : undefined;

  const allowedScopes = Array.isArray(request.body?.allowedScopes)
    ? request.body.allowedScopes.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : undefined;

  const allowedSensitivityLevels = Array.isArray(
    request.body?.allowedSensitivityLevels
  )
    ? request.body.allowedSensitivityLevels.filter(
        (item: unknown): item is string => typeof item === "string"
      )
    : undefined;

  const result = await searchSemanticMemoryChunks({
    query,
    agentName,
    topK,
    minScore,
    allowedAgents,
    matchedSkillNames,
    allowedScopes,
    allowedSensitivityLevels,
  });

  response.json(result);
});

memoryVaultRoutes.get("/chunks/:memoryId", async (request, response) => {
  const chunks = await findMemoryChunksByMemoryId(request.params.memoryId);

  response.json({
    chunks: chunks.map(mapMemoryChunk),
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