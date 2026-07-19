import { findEmbeddedMemoryChunks } from "../../repositories/memoryChunkRepository";
import { embedText, getActiveEmbeddingProviderInfo } from "./embeddingClient";

export type SemanticMemorySearchInput = {
    query: string;
    agentName?: string;
    topK?: number;
    minScore?: number;
    allowedAgents?: string[];
    allowedSensitivityLevels?: string[];
};

export type SemanticMemorySearchResultItem = {
    chunkId: string;
    memoryId: string;
    agentId: string;
    agentName: string;
    chunkIndex: number;
    content: string;
    score: number;

    charCount: number;
    tokenEstimate: number;
    memoryType: string;
    scope: string;
    ownerAgentName?: string | null;
    allowedAgents: string[];
    linkedSkillNames: string[];
    sensitivityLevel: string;
    sourceType: string;
    sourceRef?: string | null;
    embeddingStatus: string;
    embeddingModel?: string | null;
};

export type SemanticMemorySearchResult = {
    provider: ReturnType<typeof getActiveEmbeddingProviderInfo>;
    query: string;
    agentName?: string;
    totalCandidates: number;
    returnedCount: number;
    topK: number;
    minScore: number;
    results: SemanticMemorySearchResultItem[];
};

type EmbeddedChunk = Awaited<ReturnType<typeof findEmbeddedMemoryChunks>>[number];

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

function parseVector(value?: string | null) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item));
    } catch {
        return [];
    }
}

function cosineSimilarity(left: number[], right: number[]) {
    if (left.length === 0 || right.length === 0) {
        return 0;
    }

    const length = Math.min(left.length, right.length);

    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < length; index += 1) {
        const leftValue = left[index] || 0;
        const rightValue = right[index] || 0;

        dot += leftValue * rightValue;
        leftMagnitude += leftValue * leftValue;
        rightMagnitude += rightValue * rightValue;
    }

    if (leftMagnitude === 0 || rightMagnitude === 0) {
        return 0;
    }

    return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function chunkAllowedForAgent(input: {
    chunk: EmbeddedChunk;
    agentName?: string;
    allowedAgentsFilter: string[];
}) {
    const allowedAgents = safeJsonParse<string[]>(input.chunk.allowedAgentsJson, []);

    const allowedByExplicitFilter =
        input.allowedAgentsFilter.length === 0 ||
        input.allowedAgentsFilter.includes(input.chunk.agentName) ||
        allowedAgents.some((agentName) => input.allowedAgentsFilter.includes(agentName));

    if (!allowedByExplicitFilter) {
        return false;
    }

    if (!input.agentName) {
        return true;
    }

    if (input.chunk.agentName === input.agentName) {
        return true;
    }

    if (input.chunk.ownerAgentName === input.agentName) {
        return true;
    }

    if (allowedAgents.includes(input.agentName)) {
        return true;
    }

    if (
        (input.chunk.scope === "global" || input.chunk.scope === "project") &&
        allowedAgents.length === 0
    ) {
        return true;
    }

    return false;
}

function chunkAllowedBySensitivity(input: {
    chunk: EmbeddedChunk;
    allowedSensitivityLevels: string[];
}) {
    return input.allowedSensitivityLevels.includes(input.chunk.sensitivityLevel);
}

function mapSearchResult(input: {
    chunk: EmbeddedChunk;
    score: number;
}): SemanticMemorySearchResultItem {
    return {
        chunkId: input.chunk.id,
        memoryId: input.chunk.memoryId,
        agentId: input.chunk.agentId,
        agentName: input.chunk.agentName,
        chunkIndex: input.chunk.chunkIndex,
        content: input.chunk.content,
        score: Number(input.score.toFixed(6)),

        charCount: input.chunk.charCount,
        tokenEstimate: input.chunk.tokenEstimate,
        memoryType: input.chunk.memoryType,
        scope: input.chunk.scope,
        ownerAgentName: input.chunk.ownerAgentName,
        allowedAgents: safeJsonParse<string[]>(input.chunk.allowedAgentsJson, []),
        linkedSkillNames: safeJsonParse<string[]>(
            input.chunk.linkedSkillNamesJson,
            []
        ),
        sensitivityLevel: input.chunk.sensitivityLevel,
        sourceType: input.chunk.sourceType,
        sourceRef: input.chunk.sourceRef,
        embeddingStatus: input.chunk.embeddingStatus,
        embeddingModel: input.chunk.embeddingModel,
    };
}

export async function searchSemanticMemoryChunks(
    input: SemanticMemorySearchInput
): Promise<SemanticMemorySearchResult> {
    const query = input.query.trim();

    if (!query) {
        return {
            provider: getActiveEmbeddingProviderInfo(),
            query,
            agentName: input.agentName,
            totalCandidates: 0,
            returnedCount: 0,
            topK: input.topK || 5,
            minScore: input.minScore ?? 0,
            results: [],
        };
    }

    const topK = Math.min(Math.max(input.topK || 5, 1), 50);
    const minScore = input.minScore ?? 0;
    const allowedAgentsFilter = input.allowedAgents || [];
    const allowedSensitivityLevels =
        input.allowedSensitivityLevels && input.allowedSensitivityLevels.length > 0
            ? input.allowedSensitivityLevels
            : ["normal", "internal"];

    const provider = getActiveEmbeddingProviderInfo();

    const queryEmbedding = await embedText({
        id: "query",
        text: query,
    });

    const candidateChunks = await findEmbeddedMemoryChunks({
        agentName: undefined,
    });

    const scoredResults = candidateChunks
        .filter((chunk) =>
            chunkAllowedBySensitivity({
                chunk,
                allowedSensitivityLevels,
            })
        )
        .filter((chunk) =>
            chunkAllowedForAgent({
                chunk,
                agentName: input.agentName,
                allowedAgentsFilter,
            })
        )
        .map((chunk) => {
            const chunkVector = parseVector(chunk.embeddingVectorJson);
            const score = cosineSimilarity(queryEmbedding.vector, chunkVector);

            return {
                chunk,
                score,
            };
        })
        .filter((result) => result.score >= minScore)
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            return right.chunk.updatedAt.getTime() - left.chunk.updatedAt.getTime();
        })
        .slice(0, topK)
        .map(mapSearchResult);

    return {
        provider,
        query,
        agentName: input.agentName,
        totalCandidates: candidateChunks.length,
        returnedCount: scoredResults.length,
        topK,
        minScore,
        results: scoredResults,
    };
}