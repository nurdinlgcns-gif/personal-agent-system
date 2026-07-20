import { getMemoryChunkSummary } from "../../repositories/memoryChunkRepository";
import {
  embedMemoryChunks,
  type EmbedMemoryChunksResult,
} from "../embeddings/memoryChunkEmbeddingService";
import {
  rebuildMemoryChunks,
  type RebuildMemoryChunksResult,
} from "./memoryChunkingService";

export type MemoryVaultMaintenanceInput = {
  memoryId?: string;
  rebuild?: boolean;
  embed?: boolean;
  embedOnlyPending?: boolean;
  limit?: number;
  maxChunkChars?: number;
  overlapChars?: number;
  minChunkChars?: number;
};

export type MemoryVaultMaintenanceResult = {
  startedAt: string;
  completedAt: string;
  memoryId?: string;
  rebuildRequested: boolean;
  embedRequested: boolean;
  embedOnlyPending: boolean;
  rebuildResult: RebuildMemoryChunksResult | null;
  embedResult: EmbedMemoryChunksResult | null;
  summary: Awaited<ReturnType<typeof getMemoryChunkSummary>>;
};

export async function runMemoryVaultMaintenance(
  input: MemoryVaultMaintenanceInput = {}
): Promise<MemoryVaultMaintenanceResult> {
  const startedAt = new Date().toISOString();

  const rebuildRequested = input.rebuild !== false;
  const embedRequested = input.embed !== false;
  const embedOnlyPending =
    typeof input.embedOnlyPending === "boolean"
      ? input.embedOnlyPending
      : false;

  let rebuildResult: RebuildMemoryChunksResult | null = null;
  let embedResult: EmbedMemoryChunksResult | null = null;

  if (rebuildRequested) {
    rebuildResult = await rebuildMemoryChunks({
      memoryId: input.memoryId,
      options: {
        maxChunkChars: input.maxChunkChars,
        overlapChars: input.overlapChars,
        minChunkChars: input.minChunkChars,
      },
    });
  }

  if (embedRequested) {
    embedResult = await embedMemoryChunks({
      memoryId: input.memoryId,
      onlyPending: embedOnlyPending,
      limit: input.limit,
    });
  }

  const summary = await getMemoryChunkSummary();

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    memoryId: input.memoryId,
    rebuildRequested,
    embedRequested,
    embedOnlyPending,
    rebuildResult,
    embedResult,
    summary,
  };
}