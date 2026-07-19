import { findAllMemories } from "../../repositories/memoryRepository";
import {
    createMemoryChunks,
    deleteChunksByMemoryId,
    type CreateMemoryChunkInput,
} from "../../repositories/memoryChunkRepository";

type MemoryRecord = Awaited<ReturnType<typeof findAllMemories>>[number];

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

type MemoryRecordWithScopeMetadata = MemoryRecord & MemoryScopeMetadata;

export type MemoryChunkingOptions = {
    maxChunkChars?: number;
    overlapChars?: number;
    minChunkChars?: number;
};

export type RebuildMemoryChunksResult = {
    processedMemoryCount: number;
    createdChunkCount: number;
    skippedMemoryCount: number;
    memoryResults: Array<{
        memoryId: string;
        agentName: string;
        type: string;
        createdChunks: number;
        skipped: boolean;
        reason?: string;
    }>;
};

const DEFAULT_MAX_CHUNK_CHARS = 900;
const DEFAULT_OVERLAP_CHARS = 120;
const DEFAULT_MIN_CHUNK_CHARS = 40;

function withScopeMetadata(memory: MemoryRecord): MemoryRecordWithScopeMetadata {
    return memory as MemoryRecordWithScopeMetadata;
}

function normalizeWhitespace(value: string) {
    return value
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
        .trim();
}

function estimateTokens(value: string) {
    /**
     * Rough token estimate.
     * Good enough for local chunk planning before real tokenizer integration.
     */
    return Math.ceil(value.length / 4);
}

function splitByParagraphs(content: string) {
    return content
        .split(/\n{2,}/g)
        .map((paragraph) => normalizeWhitespace(paragraph))
        .filter(Boolean);
}

function splitLongText(value: string, maxChunkChars: number) {
    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < value.length) {
        const slice = value.slice(cursor, cursor + maxChunkChars);

        if (slice.length < maxChunkChars) {
            chunks.push(slice.trim());
            break;
        }

        const lastSentenceBreak = Math.max(
            slice.lastIndexOf(". "),
            slice.lastIndexOf("! "),
            slice.lastIndexOf("? ")
        );

        const lastSpace = slice.lastIndexOf(" ");

        const breakIndex =
            lastSentenceBreak > maxChunkChars * 0.45
                ? lastSentenceBreak + 1
                : lastSpace > maxChunkChars * 0.45
                    ? lastSpace
                    : maxChunkChars;

        chunks.push(value.slice(cursor, cursor + breakIndex).trim());
        cursor += breakIndex;
    }

    return chunks.filter(Boolean);
}

function chunkText(
    content: string,
    options: Required<MemoryChunkingOptions>
) {
    const normalizedContent = normalizeWhitespace(content);

    if (!normalizedContent) {
        return [];
    }

    const paragraphs = splitByParagraphs(normalizedContent);
    const chunks: string[] = [];

    let currentChunk = "";

    for (const paragraph of paragraphs) {
        if (paragraph.length > options.maxChunkChars) {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }

            chunks.push(...splitLongText(paragraph, options.maxChunkChars));
            continue;
        }

        const nextChunk = currentChunk
            ? `${currentChunk}\n\n${paragraph}`
            : paragraph;

        if (nextChunk.length <= options.maxChunkChars) {
            currentChunk = nextChunk;
            continue;
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        currentChunk = paragraph;
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    const cleanedChunks = chunks
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length >= options.minChunkChars);

    if (options.overlapChars <= 0 || cleanedChunks.length <= 1) {
        return cleanedChunks;
    }

    return cleanedChunks.map((chunk, index) => {
        if (index === 0) {
            return chunk;
        }

        const previousChunk = cleanedChunks[index - 1];
        const overlap = previousChunk
            .slice(Math.max(0, previousChunk.length - options.overlapChars))
            .trim();

        if (!overlap) {
            return chunk;
        }

        return `${overlap}\n\n${chunk}`.trim();
    });
}

function buildChunkInputs(
    memory: MemoryRecord,
    chunks: string[]
): CreateMemoryChunkInput[] {
    const scopedMemory = withScopeMetadata(memory);

    return chunks.map((chunk, index) => ({
        memoryId: scopedMemory.id,
        agentId: scopedMemory.agentId,
        agentName: scopedMemory.agent.name,
        chunkIndex: index,
        content: chunk,
        charCount: chunk.length,
        tokenEstimate: estimateTokens(chunk),

        memoryType: scopedMemory.type,
        scope: scopedMemory.scope || "agent",
        ownerAgentName: scopedMemory.ownerAgentName || null,
        allowedAgentsJson: scopedMemory.allowedAgentsJson || "[]",
        linkedSkillNamesJson: scopedMemory.linkedSkillNamesJson || "[]",
        sensitivityLevel: scopedMemory.sensitivityLevel || "normal",
        sourceType: scopedMemory.sourceType || "manual",
        sourceRef: scopedMemory.sourceRef || null,
    }));
}

export async function rebuildMemoryChunks(input?: {
    memoryId?: string;
    options?: MemoryChunkingOptions;
}): Promise<RebuildMemoryChunksResult> {
    const options: Required<MemoryChunkingOptions> = {
        maxChunkChars: input?.options?.maxChunkChars || DEFAULT_MAX_CHUNK_CHARS,
        overlapChars: input?.options?.overlapChars || DEFAULT_OVERLAP_CHARS,
        minChunkChars: input?.options?.minChunkChars || DEFAULT_MIN_CHUNK_CHARS,
    };

    const memories = await findAllMemories();

    const targetMemories = input?.memoryId
        ? memories.filter((memory) => memory.id === input.memoryId)
        : memories;

    let createdChunkCount = 0;
    let skippedMemoryCount = 0;

    const memoryResults: RebuildMemoryChunksResult["memoryResults"] = [];

    for (const memory of targetMemories) {
        const scopedMemory = withScopeMetadata(memory);

        await deleteChunksByMemoryId(memory.id);

        const chunks = chunkText(scopedMemory.content, options);

        if (chunks.length === 0) {
            skippedMemoryCount += 1;

            memoryResults.push({
                memoryId: memory.id,
                agentName: memory.agent.name,
                type: memory.type,
                createdChunks: 0,
                skipped: true,
                reason: "Memory content is empty or too short to chunk.",
            });

            continue;
        }

        const chunkInputs = buildChunkInputs(memory, chunks);
        const created = await createMemoryChunks(chunkInputs);

        createdChunkCount += created.count;

        memoryResults.push({
            memoryId: memory.id,
            agentName: memory.agent.name,
            type: memory.type,
            createdChunks: created.count,
            skipped: false,
        });
    }

    return {
        processedMemoryCount: targetMemories.length,
        createdChunkCount,
        skippedMemoryCount,
        memoryResults,
    };
}