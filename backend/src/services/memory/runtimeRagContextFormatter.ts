import type {
    SemanticMemorySearchResult,
    SemanticMemorySearchResultItem,
} from "../embeddings/semanticMemorySearchService";

export type RuntimeRagContextTopResult = {
    chunkId: string;
    memoryId: string;
    agentName: string;
    memoryType: string;
    scope: string;
    score: number;
    contentPreview: string;
};

export type RuntimeRagContextSummary = {
    previewOnly: boolean;
    retrieved: boolean;
    query: string;
    itemCount: number;
    totalChars: number;
    usedChunkIds: string[];
    usedMemoryIds: string[];
    usedMemoryTypes: string[];
    usedMemoryScopes: string[];
    usedMemorySources: string[];
    scores: number[];
    topResults: RuntimeRagContextTopResult[];
};

export type RuntimeRagContextBuildResult = {
    contextBlock: string;
    summary: RuntimeRagContextSummary;
};

type RuntimeRagContextFormatterOptions = {
    maxItems?: number;
    maxTotalChars?: number;
    maxCharsPerChunk?: number;
};

const DEFAULT_MAX_ITEMS = 3;
const DEFAULT_MAX_TOTAL_CHARS = 1400;
const DEFAULT_MAX_CHARS_PER_CHUNK = 420;

function normalizeWhitespace(value: string) {
    return value
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .trim();
}

function sanitizeChunkContent(value: string) {
    return normalizeWhitespace(value)
        .replace(/```/g, "")
        .replace(/\b(system|developer|assistant|user)\s*:/gi, "$1 note:")
        .trim();
}

function truncateText(value: string, maxChars: number) {
    if (value.length <= maxChars) {
        return value;
    }

    const slice = value.slice(0, maxChars);
    const lastSentenceEnd = Math.max(
        slice.lastIndexOf("."),
        slice.lastIndexOf("!"),
        slice.lastIndexOf("?")
    );

    if (lastSentenceEnd > 120) {
        return slice.slice(0, lastSentenceEnd + 1).trim();
    }

    const lastSpace = slice.lastIndexOf(" ");

    if (lastSpace > 120) {
        return `${slice.slice(0, lastSpace).trim()}...`;
    }

    return `${slice.trim()}...`;
}

function formatRagChunkLine(
    item: SemanticMemorySearchResultItem,
    index: number,
    maxCharsPerChunk: number
) {
    const content = truncateText(
        sanitizeChunkContent(item.content),
        maxCharsPerChunk
    );

    const skillHint =
        item.linkedSkillNames.length > 0
            ? ` Linked skills: ${item.linkedSkillNames.join(", ")}.`
            : "";

    const guardHint =
        item.accessReasons.length > 0
            ? ` Access guard: ${item.accessReasons.join(", ")}.`
            : "";

    return [
        `RAG Chunk ${index + 1}:`,
        `[agent=${item.agentName}; type=${item.memoryType}; scope=${item.scope}; score=${item.score}; sensitivity=${item.sensitivityLevel}]`,
        content,
        skillHint,
        guardHint,
    ]
        .filter(Boolean)
        .join(" ");
}

function emptySummary(query = ""): RuntimeRagContextSummary {
    return {
        previewOnly: true,
        retrieved: false,
        query,
        itemCount: 0,
        totalChars: 0,
        usedChunkIds: [],
        usedMemoryIds: [],
        usedMemoryTypes: [],
        usedMemoryScopes: [],
        usedMemorySources: [],
        scores: [],
        topResults: [],
    };
}

function getSourceValue(item: SemanticMemorySearchResultItem) {
    return item.sourceRef || item.sourceType || "unknown";
}

export function buildRuntimeRagContextBlock(
    searchResult: SemanticMemorySearchResult | null | undefined,
    options: RuntimeRagContextFormatterOptions = {}
): RuntimeRagContextBuildResult {
    const maxItems = options.maxItems || DEFAULT_MAX_ITEMS;
    const maxTotalChars = options.maxTotalChars || DEFAULT_MAX_TOTAL_CHARS;
    const maxCharsPerChunk =
        options.maxCharsPerChunk || DEFAULT_MAX_CHARS_PER_CHUNK;

    if (!searchResult || searchResult.results.length === 0) {
        return {
            contextBlock: "",
            summary: emptySummary(searchResult?.query || ""),
        };
    }

    const usableResults = searchResult.results.slice(0, maxItems);

    const header = [
        "Runtime RAG context preview:",
        "Use the following semantic retrieval chunks only as background context.",
        "Do not mention chunk IDs, scores, retrieval metadata, embeddings, vector search, or internal RAG details to the user.",
        "If semantic retrieval context is unrelated to the user's request, ignore it.",
    ].join("\n");

    const chunkLines: string[] = [];
    let currentLength = header.length;

    for (const item of usableResults) {
        const nextLine = formatRagChunkLine(
            item,
            chunkLines.length,
            maxCharsPerChunk
        );

        if (currentLength + nextLine.length > maxTotalChars) {
            break;
        }

        chunkLines.push(nextLine);
        currentLength += nextLine.length;
    }

    if (chunkLines.length === 0) {
        return {
            contextBlock: "",
            summary: emptySummary(searchResult.query),
        };
    }

    const usedResults = usableResults.slice(0, chunkLines.length);
    const contextBlock = [header, "", chunkLines.join("\n")].join("\n").trim();

    return {
        contextBlock,
        summary: {
            previewOnly: true,
            retrieved: true,
            query: searchResult.query,
            itemCount: usedResults.length,
            totalChars: contextBlock.length,
            usedChunkIds: usedResults.map((item) => item.chunkId),
            usedMemoryIds: usedResults.map((item) => item.memoryId),
            usedMemoryTypes: usedResults.map((item) => item.memoryType),
            usedMemoryScopes: usedResults.map((item) => item.scope),
            usedMemorySources: usedResults.map((item) => getSourceValue(item)),
            scores: usedResults.map((item) => item.score),
            topResults: usedResults.map((item) => ({
                chunkId: item.chunkId,
                memoryId: item.memoryId,
                agentName: item.agentName,
                memoryType: item.memoryType,
                scope: item.scope,
                score: item.score,
                contentPreview: truncateText(sanitizeChunkContent(item.content), 180),
            })),
        },
    };
}
