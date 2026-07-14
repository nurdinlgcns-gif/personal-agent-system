import type {
  AgentsStatusResponse,
  RecentTasksResponse,
  ManualTaskResponse,
  SkillsResponse,
  DashboardSummaryResponse,
} from "../types/api";

const API_BASE_URL = "http://localhost:3000";

export type ManualTaskModelPreference = {
  providerId?: string | null;
  provider?: string;
  model?: string;
  mode?: "auto" | "fast" | "deep" | "creative";
};

export type ManualTaskPayload = {
  inputText: string;
  modelPreference?: ManualTaskModelPreference;
};

export type ManualTaskResponseWithRuntime = ManualTaskResponse & {
  ok?: boolean;
  runtimeProvider?: {
    providerId?: string | null;
    providerName?: string;
    providerType?: string;
    model?: string;
    mode?: string;
    resolvedFrom?: string;
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

export async function fetchAgentsStatus() {
  const response = await fetch(`${API_BASE_URL}/agents/status`);

  if (!response.ok) {
    throw new Error("Failed to fetch agents status");
  }

  const data: AgentsStatusResponse = await response.json();
  return data.agents;
}

export async function fetchRecentTasks(limit = 10) {
  const response = await fetch(`${API_BASE_URL}/tasks/recent?limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to fetch recent tasks");
  }

  const data: RecentTasksResponse = await response.json();
  return data.tasks;
}

export async function sendManualTask(
  payload: string | ManualTaskPayload
): Promise<ManualTaskResponseWithRuntime> {
  const inputText = typeof payload === "string" ? payload : payload.inputText;

  const requestBody =
    typeof payload === "string"
      ? {
          message: inputText,
          inputText,
        }
      : {
          message: inputText,
          inputText,
          modelPreference: payload.modelPreference,
        };

  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to send manual task"
    );

    throw new Error(errorMessage);
  }

  const data: ManualTaskResponseWithRuntime = await response.json();
  return data;
}

export async function fetchSkills() {
  const response = await fetch(`${API_BASE_URL}/skills`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch skills"
    );

    throw new Error(errorMessage);
  }

  const data: SkillsResponse = await response.json();
  return data.skills;
}

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch dashboard summary"
    );

    throw new Error(errorMessage);
  }

  const data: DashboardSummaryResponse = await response.json();
  return data.summary;
}