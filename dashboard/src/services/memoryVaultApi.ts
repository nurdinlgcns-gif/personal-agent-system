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

export type KnowledgeSourceFileItem = {
  relativePath: string;
  fileName: string;
  extension: string;
  size: number;
};

export type KnowledgeSourceImportResult = {
  imported: boolean;
  memoryId?: string;
  title: string;
  sourceRef: string;
  agentName: string;
  scope: string;
  contentChars: number;
  action: "created" | "updated" | "skipped";
  reason?: string;
};

export type KnowledgeSourceFolderImportResult = {
  processedFileCount: number;
  importedCount: number;
  skippedCount: number;
  results: KnowledgeSourceImportResult[];
};

export type SkillRagSyncResult = {
  processedSkillCount: number;
  syncedSkillMemoryCount: number;
  skippedSkillCount: number;
  skillResults: Array<{
    skillId: string;
    skillName: string;
    agentName: string;
    memoryId?: string;
    synced: boolean;
    skipped: boolean;
    reason?: string;
  }>;
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
  matchedSkillNames: string[];
  sensitivityLevel: string;
  sourceType: string;
  sourceRef?: string | null;
  embeddingStatus: string;
  embeddingModel?: string | null;
  accessReasons: string[];
  matchReasons: string[];
};

export type SemanticMemorySearchResponse = {
  provider: EmbeddingProviderInfo;
  query: string;
  agentName?: string;
  matchedSkillNames: string[];
  allowedScopes: string[];
  allowedSensitivityLevels: string[];
  totalCandidates: number;
  eligibleCandidates: number;
  returnedCount: number;
  topK: number;
  minScore: number;
  results: SemanticMemorySearchResultItem[];
};

export type MemoryVaultMaintenanceResponse = {
  startedAt: string;
  completedAt: string;
  memoryId?: string;
  syncSkillsRequested: boolean;
  rebuildRequested: boolean;
  embedRequested: boolean;
  embedOnlyPending: boolean;
  skillSyncResult: SkillRagSyncResult | null;
  rebuildResult: RebuildMemoryChunksResponse | null;
  embedResult: {
    processedChunkCount: number;
    embeddedChunkCount: number;
    failedChunkCount: number;
    skippedChunkCount: number;
    provider: EmbeddingProviderInfo;
  } | null;
  summary: {
    totalChunks: number;
    chunkedMemoryCount: number;
    pendingEmbeddings: number;
    embeddedChunks: number;
    failedEmbeddings: number;
    totalChars: number;
    totalTokenEstimate: number;
    byAgent: Record<string, number>;
    byType: Record<string, number>;
    byScope: Record<string, number>;
  };
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

export async function fetchKnowledgeSourceFiles() {
  const response = await fetch(
    `${API_BASE_URL}/api/memory-vault/knowledge-sources/files`
  );

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch knowledge source files"
    );

    throw new Error(errorMessage);
  }

  const data: { files: KnowledgeSourceFileItem[] } = await response.json();
  return data.files;
}

export async function importKnowledgeSource(payload: {
  title: string;
  content?: string;
  fileRelativePath?: string;
  agentName: string;
  scope?: string;
  ownerAgentName?: string | null;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  sensitivityLevel?: string;
  sourceRef?: string;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/memory-vault/knowledge-sources/import`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to import knowledge source"
    );

    throw new Error(errorMessage);
  }

  const data: KnowledgeSourceImportResult = await response.json();
  return data;
}

export async function importKnowledgeSourceFolder(payload: {
  agentName: string;
  scope?: string;
  ownerAgentName?: string | null;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  sensitivityLevel?: string;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/memory-vault/knowledge-sources/import-folder`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to import knowledge source folder"
    );

    throw new Error(errorMessage);
  }

  const data: KnowledgeSourceFolderImportResult = await response.json();
  return data;
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

export async function syncSkillsToRag() {
  const response = await fetch(`${API_BASE_URL}/api/memory-vault/skills/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to sync skills into RAG memories"
    );

    throw new Error(errorMessage);
  }

  const data: SkillRagSyncResult = await response.json();
  return data;
}

export async function runMemoryVaultMaintenance(payload?: {
  memoryId?: string;
  syncSkills?: boolean;
  rebuild?: boolean;
  embed?: boolean;
  embedOnlyPending?: boolean;
  limit?: number;
  maxChunkChars?: number;
  overlapChars?: number;
  minChunkChars?: number;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/memory-vault/maintenance/rebuild-embed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    }
  );

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to run Memory Vault maintenance"
    );

    throw new Error(errorMessage);
  }

  const data: MemoryVaultMaintenanceResponse = await response.json();
  return data;
}

export async function searchSemanticMemory(payload: {
  query: string;
  agentName?: string;
  topK?: number;
  minScore?: number;
  matchedSkillNames?: string[];
  allowedScopes?: string[];
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

export type KnowledgeSourceImportHistoryItem = {
    id: string;
    memoryId?: string | null;
    title: string;
    sourceRef: string;
    agentName: string;
    scope: string;
    action: string;
    previousContentHash?: string | null;
    nextContentHash: string;
    previousContentChars: number;
    nextContentChars: number;
    allowedAgents: string[];
    linkedSkillNames: string[];
    sensitivityLevel: string;
    sourceMode: string;
    fileRelativePath?: string | null;
    createdAt: string;
  };

  export async function fetchKnowledgeSourceImportHistory(payload?: {
    sourceRef?: string;
    memoryId?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
  
    if (payload?.sourceRef) {
      params.set("sourceRef", payload.sourceRef);
    }
  
    if (payload?.memoryId) {
      params.set("memoryId", payload.memoryId);
    }
  
    if (payload?.limit) {
      params.set("limit", String(payload.limit));
    }
  
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/memory-vault/knowledge-sources/history${
      queryString ? `?${queryString}` : ""
    }`;
  
    const response = await fetch(url);
  
    if (!response.ok) {
      const errorMessage = await readErrorMessage(
        response,
        "Failed to fetch knowledge source import history"
      );
  
      throw new Error(errorMessage);
    }
  
    const data: { histories: KnowledgeSourceImportHistoryItem[] } =
      await response.json();
  
    return data.histories;
  }

  export async function fetchKnowledgeSourceImportHistoryDetail(historyId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/memory-vault/knowledge-sources/history/${historyId}`
    );
  
    if (!response.ok) {
      const errorMessage = await readErrorMessage(
        response,
        "Failed to fetch knowledge source import history detail"
      );
  
      throw new Error(errorMessage);
    }
  
    const data: { detail: KnowledgeSourceImportHistoryDetail } =
      await response.json();
  
    return data.detail;
  }
  
  export async function fetchKnowledgeSourceImportHistoryDiff(historyId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/memory-vault/knowledge-sources/history/${historyId}/diff`
    );
  
    if (!response.ok) {
      const errorMessage = await readErrorMessage(
        response,
        "Failed to fetch knowledge source import history diff"
      );
  
      throw new Error(errorMessage);
    }
  
    const data: { diff: KnowledgeSourceDiffResult } = await response.json();
    return data.diff;
  }
  
  export async function rollbackKnowledgeSourceImportHistory(payload: {
    historyId: string;
    target?: "previous" | "next";
  }) {
    const response = await fetch(
      `${API_BASE_URL}/api/memory-vault/knowledge-sources/history/${payload.historyId}/rollback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: payload.target || "previous",
        }),
      }
    );
  
    if (!response.ok) {
      const errorMessage = await readErrorMessage(
        response,
        "Failed to rollback knowledge source import history"
      );
  
      throw new Error(errorMessage);
    }
  
    const data: KnowledgeSourceRollbackResult = await response.json();
    return data;
  }

  export type KnowledgeSourceImportHistoryDetail =
  KnowledgeSourceImportHistoryItem & {
    previousContent?: string | null;
    nextContent: string;
  };

export type KnowledgeSourceDiffLine = {
  type: "added" | "removed" | "unchanged";
  lineNumberBefore?: number;
  lineNumberAfter?: number;
  text: string;
};

export type KnowledgeSourceDiffResult = {
  historyId: string;
  title: string;
  sourceRef: string;
  action: string;
  previousContentHash?: string | null;
  nextContentHash: string;
  previousContentChars: number;
  nextContentChars: number;
  addedLineCount: number;
  removedLineCount: number;
  unchangedLineCount: number;
  lines: KnowledgeSourceDiffLine[];
};

export type KnowledgeSourceRollbackResult = {
  rolledBack: boolean;
  memoryId?: string;
  historyId: string;
  rollbackHistoryId?: string;
  sourceRef: string;
  title: string;
  target: "previous" | "next";
  previousContentChars: number;
  nextContentChars: number;
  reason?: string;
};

  