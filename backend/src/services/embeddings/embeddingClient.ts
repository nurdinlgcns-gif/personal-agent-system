import type {
    EmbeddingInput,
    EmbeddingProviderInfo,
    EmbeddingProviderType,
    EmbeddingResult,
} from "./embeddingTypes";
import { buildLocalHashEmbedding } from "./localHashEmbeddingProvider";

function getEmbeddingProviderType(): EmbeddingProviderType {
    const provider = process.env.EMBEDDING_PROVIDER || "local-hash";

    if (provider === "local-hash") {
        return "local-hash";
    }

    return "local-hash";
}

function getEmbeddingModel() {
    return process.env.EMBEDDING_MODEL || "local-hash-v1";
}

function getEmbeddingDimensions() {
    const parsedDimensions = Number(process.env.EMBEDDING_DIMENSIONS || 96);

    if (Number.isNaN(parsedDimensions) || parsedDimensions <= 0) {
        return 96;
    }

    return Math.min(parsedDimensions, 512);
}

export function getActiveEmbeddingProviderInfo(): EmbeddingProviderInfo {
    const providerType = getEmbeddingProviderType();

    return {
        id: providerType,
        type: providerType,
        model: getEmbeddingModel(),
        dimensions: getEmbeddingDimensions(),
        enabled: true,
        description:
            "Local deterministic hash embedding provider for RAG foundation testing. No external API call is required.",
    };
}

export async function embedText(input: EmbeddingInput): Promise<EmbeddingResult> {
    const providerInfo = getActiveEmbeddingProviderInfo();

    return buildLocalHashEmbedding({
        id: input.id,
        text: input.text,
        model: providerInfo.model,
        dimensions: providerInfo.dimensions,
    });
}

export async function embedTexts(
    inputs: EmbeddingInput[]
): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (const input of inputs) {
        results.push(await embedText(input));
    }

    return results;
}