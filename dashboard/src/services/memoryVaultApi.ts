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

export type MemoryVaultResponse = {
  memories: MemoryVaultItem[];
};

export type MemoryVaultSummary = {
  totalMemories: number;
  agentCount: number;
  byAgent: Record<string, number>;
  byType: Record<string, number>;
  byScope: Record<string, number>;
  ragReadyCount: number;
  runtimeInjectableCount: number;
};

export type MemoryVaultSummaryResponse = {
  summary: MemoryVaultSummary;
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