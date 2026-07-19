import { prisma } from "../db/prisma";

export type CreateMemoryChunkInput = {
    memoryId: string;
    agentId: string;
    agentName: string;
    chunkIndex: number;
    content: string;
    charCount: number;
    tokenEstimate: number;
    memoryType: string;
    scope: string;
    ownerAgentName?: string | null;
    allowedAgentsJson: string;
    linkedSkillNamesJson: string;
    sensitivityLevel: string;
    sourceType: string;
    sourceRef?: string | null;
};

export async function deleteChunksByMemoryId(memoryId: string) {
    return prisma.memoryChunk.deleteMany({
        where: {
            memoryId,
        },
    });
}

export async function createMemoryChunks(chunks: CreateMemoryChunkInput[]) {
    if (chunks.length === 0) {
        return {
            count: 0,
        };
    }

    return prisma.memoryChunk.createMany({
        data: chunks,
    });
}

export async function findAllMemoryChunks() {
    return prisma.memoryChunk.findMany({
        orderBy: [
            {
                agentName: "asc",
            },
            {
                memoryType: "asc",
            },
            {
                chunkIndex: "asc",
            },
        ],
    });
}

export async function findMemoryChunkById(chunkId: string) {
    return prisma.memoryChunk.findUnique({
        where: {
            id: chunkId,
        },
    });
}

export async function findMemoryChunksByMemoryId(memoryId: string) {
    return prisma.memoryChunk.findMany({
        where: {
            memoryId,
        },
        orderBy: {
            chunkIndex: "asc",
        },
    });
}

export async function findPendingMemoryChunks(params?: {
    memoryId?: string;
    limit?: number;
}) {
    return prisma.memoryChunk.findMany({
        where: {
            embeddingStatus: "pending",
            memoryId: params?.memoryId,
        },
        take: params?.limit || undefined,
        orderBy: [
            {
                agentName: "asc",
            },
            {
                memoryType: "asc",
            },
            {
                chunkIndex: "asc",
            },
        ],
    });
}

export async function findEmbeddedMemoryChunks(params?: {
    agentName?: string;
    limit?: number;
}) {
    return prisma.memoryChunk.findMany({
        where: {
            embeddingStatus: "embedded",
            agentName: params?.agentName,
        },
        take: params?.limit || undefined,
        orderBy: [
            {
                agentName: "asc",
            },
            {
                memoryType: "asc",
            },
            {
                chunkIndex: "asc",
            },
        ],
    });
}

export async function updateMemoryChunkEmbedding(params: {
    chunkId: string;
    embeddingStatus: string;
    embeddingModel?: string | null;
    embeddingVectorJson?: string | null;
}) {
    const data = {
        embeddingStatus: params.embeddingStatus,
        embeddingModel: params.embeddingModel || null,
        embeddingVectorJson: params.embeddingVectorJson || null,
    } as never;

    return prisma.memoryChunk.update({
        where: {
            id: params.chunkId,
        },
        data,
    });
}

export async function getMemoryChunkSummary() {
    const [totalChunks, pendingEmbeddings, embeddedChunks, failedEmbeddings] =
        await Promise.all([
            prisma.memoryChunk.count(),
            prisma.memoryChunk.count({
                where: {
                    embeddingStatus: "pending",
                },
            }),
            prisma.memoryChunk.count({
                where: {
                    embeddingStatus: "embedded",
                },
            }),
            prisma.memoryChunk.count({
                where: {
                    embeddingStatus: "error",
                },
            }),
        ]);

    const chunks = await prisma.memoryChunk.findMany({
        select: {
            memoryId: true,
            agentName: true,
            memoryType: true,
            scope: true,
            charCount: true,
            tokenEstimate: true,
        },
    });

    const memoryIds = new Set(chunks.map((chunk) => chunk.memoryId));
    const byAgent: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byScope: Record<string, number> = {};

    let totalChars = 0;
    let totalTokenEstimate = 0;

    chunks.forEach((chunk) => {
        byAgent[chunk.agentName] = (byAgent[chunk.agentName] || 0) + 1;
        byType[chunk.memoryType] = (byType[chunk.memoryType] || 0) + 1;
        byScope[chunk.scope] = (byScope[chunk.scope] || 0) + 1;

        totalChars += chunk.charCount;
        totalTokenEstimate += chunk.tokenEstimate;
    });

    return {
        totalChunks,
        chunkedMemoryCount: memoryIds.size,
        pendingEmbeddings,
        embeddedChunks,
        failedEmbeddings,
        totalChars,
        totalTokenEstimate,
        byAgent,
        byType,
        byScope,
    };
}