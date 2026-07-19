import {
    findAllMemoryChunks,
    findMemoryChunkById,
    findMemoryChunksByMemoryId,
    findPendingMemoryChunks,
    updateMemoryChunkEmbedding,
} from "../../repositories/memoryChunkRepository";
import { embedTexts, getActiveEmbeddingProviderInfo } from "./embeddingClient";

export type EmbedMemoryChunksInput = {
    chunkId?: string;
    memoryId?: string;
    onlyPending?: boolean;
    limit?: number;
};

export type EmbedMemoryChunksResult = {
    provider: ReturnType<typeof getActiveEmbeddingProviderInfo>;
    processedChunkCount: number;
    embeddedChunkCount: number;
    failedChunkCount: number;
    skippedChunkCount: number;
    chunkResults: Array<{
        chunkId: string;
        memoryId: string;
        agentName: string;
        chunkIndex: number;
        status: "embedded" | "error" | "skipped";
        reason?: string;
    }>;
};

type ChunkRecord = Awaited<ReturnType<typeof findAllMemoryChunks>>[number];

async function resolveTargetChunks(input: EmbedMemoryChunksInput) {
    if (input.chunkId) {
        const chunk = await findMemoryChunkById(input.chunkId);
        return chunk ? [chunk] : [];
    }

    if (input.memoryId) {
        const chunks = await findMemoryChunksByMemoryId(input.memoryId);

        if (input.onlyPending === false) {
            return chunks.slice(0, input.limit || chunks.length);
        }

        return chunks
            .filter((chunk) => chunk.embeddingStatus !== "embedded")
            .slice(0, input.limit || chunks.length);
    }

    if (input.onlyPending === false) {
        const chunks = await findAllMemoryChunks();
        return chunks.slice(0, input.limit || chunks.length);
    }

    return findPendingMemoryChunks({
        limit: input.limit,
    });
}

function buildEmbeddingText(chunk: ChunkRecord) {
    return [
        `Agent: ${chunk.agentName}`,
        `Memory type: ${chunk.memoryType}`,
        `Scope: ${chunk.scope}`,
        `Sensitivity: ${chunk.sensitivityLevel}`,
        `Source: ${chunk.sourceRef || chunk.sourceType}`,
        "",
        chunk.content,
    ].join("\n");
}

export async function embedMemoryChunks(
    input: EmbedMemoryChunksInput = {}
): Promise<EmbedMemoryChunksResult> {
    const provider = getActiveEmbeddingProviderInfo();
    const chunks = await resolveTargetChunks(input);

    let embeddedChunkCount = 0;
    let failedChunkCount = 0;
    let skippedChunkCount = 0;

    const chunkResults: EmbedMemoryChunksResult["chunkResults"] = [];

    if (chunks.length === 0) {
        return {
            provider,
            processedChunkCount: 0,
            embeddedChunkCount: 0,
            failedChunkCount: 0,
            skippedChunkCount: 0,
            chunkResults: [],
        };
    }

    const embeddingResults = await embedTexts(
        chunks.map((chunk) => ({
            id: chunk.id,
            text: buildEmbeddingText(chunk),
        }))
    );

    for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const embeddingResult = embeddingResults[index];

        if (!embeddingResult) {
            failedChunkCount += 1;

            await updateMemoryChunkEmbedding({
                chunkId: chunk.id,
                embeddingStatus: "error",
                embeddingModel: provider.model,
                embeddingVectorJson: null,
            });

            chunkResults.push({
                chunkId: chunk.id,
                memoryId: chunk.memoryId,
                agentName: chunk.agentName,
                chunkIndex: chunk.chunkIndex,
                status: "error",
                reason: "Embedding result missing.",
            });

            continue;
        }

        if (!embeddingResult.vector || embeddingResult.vector.length === 0) {
            failedChunkCount += 1;

            await updateMemoryChunkEmbedding({
                chunkId: chunk.id,
                embeddingStatus: "error",
                embeddingModel: provider.model,
                embeddingVectorJson: null,
            });

            chunkResults.push({
                chunkId: chunk.id,
                memoryId: chunk.memoryId,
                agentName: chunk.agentName,
                chunkIndex: chunk.chunkIndex,
                status: "error",
                reason: "Embedding vector is empty.",
            });

            continue;
        }

        await updateMemoryChunkEmbedding({
            chunkId: chunk.id,
            embeddingStatus: "embedded",
            embeddingModel: embeddingResult.model,
            embeddingVectorJson: JSON.stringify(embeddingResult.vector),
        });

        embeddedChunkCount += 1;

        chunkResults.push({
            chunkId: chunk.id,
            memoryId: chunk.memoryId,
            agentName: chunk.agentName,
            chunkIndex: chunk.chunkIndex,
            status: "embedded",
        });
    }

    return {
        provider,
        processedChunkCount: chunks.length,
        embeddedChunkCount,
        failedChunkCount,
        skippedChunkCount,
        chunkResults,
    };
}