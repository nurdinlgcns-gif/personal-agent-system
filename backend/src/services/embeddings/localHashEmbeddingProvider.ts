import crypto from "crypto";
import type { EmbeddingResult } from "./embeddingTypes";

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value: string) {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 1);
}

function buildNgrams(tokens: string[]) {
    const ngrams: string[] = [];

    for (let index = 0; index < tokens.length; index += 1) {
        ngrams.push(tokens[index]);

        if (tokens[index + 1]) {
            ngrams.push(`${tokens[index]}_${tokens[index + 1]}`);
        }
    }

    return ngrams;
}

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest();
}

function normalizeVector(vector: number[]) {
    const magnitude = Math.sqrt(
        vector.reduce((total, value) => total + value * value, 0)
    );

    if (magnitude === 0) {
        return vector;
    }

    return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function buildLocalHashEmbedding(input: {
    id?: string;
    text: string;
    model: string;
    dimensions: number;
}): EmbeddingResult {
    const vector = Array.from({ length: input.dimensions }, () => 0);
    const tokens = tokenize(input.text);
    const features = buildNgrams(tokens);

    features.forEach((feature) => {
        const hash = hashToken(feature);
        const index = hash.readUInt16BE(0) % input.dimensions;

        /**
         * Important:
         * Use positive weights only.
         * This makes local-hash useful for lexical semantic preview because
         * overlapping words/features between query and chunks produce positive cosine score.
         */
        const magnitude = 1 + (hash.readUInt8(2) % 7) / 10;

        vector[index] += magnitude;
    });

    return {
        id: input.id,
        vector: normalizeVector(vector),
        model: input.model,
        dimensions: input.dimensions,
        provider: "local-hash",
    };
}