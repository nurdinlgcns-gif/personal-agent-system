export type EmbeddingProviderType = "local-hash";

export type EmbeddingProviderInfo = {
    id: string;
    type: EmbeddingProviderType;
    model: string;
    dimensions: number;
    enabled: boolean;
    description: string;
};

export type EmbeddingInput = {
    id?: string;
    text: string;
};

export type EmbeddingResult = {
    id?: string;
    vector: number[];
    model: string;
    dimensions: number;
    provider: EmbeddingProviderType;
};