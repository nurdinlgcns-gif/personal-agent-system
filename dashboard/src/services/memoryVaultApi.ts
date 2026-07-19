const API_BASE_URL = "http://localhost:3000";

export type MemoryVaultItem = {
  id: string;
  agentId: string;
  agentName: string;
  agentColor?: string | null;
  content: string;
  type: string;

  scope: string;
  ownerAgentName?: string | null;
  allowedAgents: string[];
  linkedSkillNames: string[];
  runtimeInjectable: boolean;
  ragEnabled: boolean;
  sensitivityLevel: string;
  sourceType: string;
  sourceRef?: string | null;

  createdAt: string;
};

export type MemoryVaultChunk = {
  id: string;
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
  allowedAgents: string[];
  linkedSkillNames: string[];
  sensitivityLevel: string;
  sourceType: string;
  sourceRef?: string | null;
  embeddingStatus: string;
  embeddingModel?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryVaultResponse = {
  memories: MemoryVaultItem[];
};

export type MemoryVaultChunksResponse = {
  chunks: MemoryVaultChunk[];
};

export type MemoryVaultSummary = {
  totalMemories: number;
  agentCount: number;
  byAgent: Record<string, number>;
  byType: Record<string, number>;
  byScope: Record<string, number>;
  ragReadyCount: number;
  runtimeInjectableCount: number;

  totalChunks?: number;
  chunkedMemoryCount?: number;
  pendingEmbeddings?: number;
  embeddedChunks?: number;
  failedEmbeddings?: number;
  totalChunkChars?: number;
  totalChunkTokenEstimate?: number;
  chunksByAgent?: Record<string, number>;
  chunksByType?: Record<string, number>;
  chunksByScope?: Record<string, number>;
};

export type MemoryVaultSummaryResponse = {
  summary: MemoryVaultSummary;
};

export type RebuildMemoryChunksResponse = {
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

export type EmbeddingProviderInfo = {
  id: string;
  type: string;
  model: string;
  dimensions: number;
  enabled: boolean;
  description: string;
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

export type SemanticMemorySearchResponse = {
  provider: EmbeddingProviderInfo;
  query: string;
  agentName?: string;
  totalCandidates: number;
  returnedCount: number;
  topK: number;
  minScore: number;
  results: SemanticMemorySearchResultItem[];
};

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const errorText = await response.text();

  if (!errorText) {
    return `${fallbackMessage}. HTTP ${response.status}`;
  }

  try {
    const parsedError = JSON.parse(errorText) as {
      message?: string;
      error?: string;
    };

    return (
      parsedError.message ||
      parsedError.error ||
      `${fallbackMessage}. HTTP ${response.status}: ${errorText}`
    );
  } catch {
    return `${fallbackMessage}. HTTP ${response.status}: ${errorText}`;
  }
}

export async function fetchMemoryVaultItems() {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/memories`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch Memory Vault items"
    );

    throw new Error(errorMessage);
  }

  const data: MemoryVaultResponse = await response.json();
  return data.memories;
}

export async function fetchMemoryVaultSummary() {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/summary`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch Memory Vault summary"
    );

    throw new Error(errorMessage);
  }

  const data: MemoryVaultSummaryResponse = await response.json();
  return data.summary;
}

export async function fetchMemoryVaultChunks() {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/chunks`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch Memory Vault chunks"
    );

    throw new Error(errorMessage);
  }

  const data: MemoryVaultChunksResponse = await response.json();
  return data.chunks;
}

export async function rebuildMemoryVaultChunks(payload?: {
  memoryId?: string;
  maxChunkChars?: number;
  overlapChars?: number;
  minChunkChars?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/chunks/rebuild`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to rebuild Memory Vault chunks"
    );

    throw new Error(errorMessage);
  }

  const data: RebuildMemoryChunksResponse = await response.json();
  return data;
}

export async function searchSemanticMemory(payload: {
  query: string;
  agentName?: string;
  topK?: number;
  minScore?: number;
  allowedSensitivityLevels?: string[];
}) {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to run semantic memory search"
    );

    throw new Error(errorMessage);
  }

  const data: SemanticMemorySearchResponse = await response.json();
  return data;
}