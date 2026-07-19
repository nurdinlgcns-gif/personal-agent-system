export type RuntimeRagChannel = "manual" | "whatsapp";

export type RuntimeRagQualityConfig = {
    topK: number;
    minScore: number;
    maxItems: number;
    maxTotalChars: number;
    maxCharsPerChunk: number;
    allowedScopes: string[];
    allowedSensitivityLevels: string[];
};

const MANUAL_RAG_CONFIG: RuntimeRagQualityConfig = {
    topK: 6,
    minScore: 0.12,
    maxItems: 3,
    maxTotalChars: 1400,
    maxCharsPerChunk: 420,
    allowedScopes: ["agent", "skill", "project", "global"],
    allowedSensitivityLevels: ["normal", "internal"],
};

const WHATSAPP_RAG_CONFIG: RuntimeRagQualityConfig = {
    topK: 5,
    minScore: 0.15,
    maxItems: 2,
    maxTotalChars: 900,
    maxCharsPerChunk: 320,
    allowedScopes: ["agent", "skill", "project", "global"],
    allowedSensitivityLevels: ["normal", "internal"],
};

export function getRuntimeRagQualityConfig(
    channel: RuntimeRagChannel
): RuntimeRagQualityConfig {
    if (channel === "whatsapp") {
        return WHATSAPP_RAG_CONFIG;
    }

    return MANUAL_RAG_CONFIG;
}

export function stripAgentMention(inputText: string) {
    return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

export function buildRuntimeRagQuery(inputText: string) {
    const cleanedQuery = stripAgentMention(inputText)
        .replace(/\s+/g, " ")
        .trim();

    return cleanedQuery || inputText.trim();
}