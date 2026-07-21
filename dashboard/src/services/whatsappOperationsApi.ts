import type { TaskSnapshot } from "../types/api";

const API_BASE_URL = "http://localhost:3000";

export type WhatsAppOperationsFilters = {
  search?: string;
  status?: string;
  governanceAllowed?: "all" | "true" | "false";
  runtimeMemoryInjected?: "all" | "true" | "false";
  runtimeRagRetrieved?: "all" | "true" | "false";
  limit?: number;
};

export type WhatsAppOperationsResponse = {
  tasks: TaskSnapshot[];
  totalCount: number;
  limit: number;
  filters: {
    agentName: string;
    source: string;
    status: string;
    search: string;
    governanceAllowed: boolean | null;
    runtimeMemoryInjected: boolean | null;
    runtimeRagRetrieved: boolean | null;
  };
  summary: {
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
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

function appendBooleanFilter(
  params: URLSearchParams,
  key: string,
  value?: "all" | "true" | "false"
) {
  if (!value || value === "all") {
    return;
  }

  params.set(key, value);
}

export async function fetchWhatsAppOperations(
  filters: WhatsAppOperationsFilters = {}
) {
  const params = new URLSearchParams();

  params.set("source", "whatsapp");
  params.set("limit", String(filters.limit || 80));

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  appendBooleanFilter(params, "governanceAllowed", filters.governanceAllowed);
  appendBooleanFilter(
    params,
    "runtimeMemoryInjected",
    filters.runtimeMemoryInjected
  );
  appendBooleanFilter(params, "runtimeRagRetrieved", filters.runtimeRagRetrieved);

  const response = await fetch(`${API_BASE_URL}/api/tasks?${params.toString()}`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch WhatsApp Operations"
    );

    throw new Error(errorMessage);
  }

  const data: WhatsAppOperationsResponse = await response.json();
  return data;
}