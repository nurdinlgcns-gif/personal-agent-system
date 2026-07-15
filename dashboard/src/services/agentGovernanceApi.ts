const API_BASE_URL = "http://localhost:3000";

export type AgentUnknownIntentPolicy = "allow" | "clarify_or_refuse";
export type AgentRefusalStyle = "polite_redirect" | "polite_decline";

export type AgentCapabilityContract = {
  agentName: string;
  displayName: string;
  role: string;
  description: string;
  strictBoundary: boolean;
  unknownIntentPolicy: AgentUnknownIntentPolicy;
  allowedDomains: string[];
  deniedDomains: string[];
  allowedKeywords: string[];
  deniedKeywords: string[];
  softAllowedKeywords: string[];
  safeSmallTalkKeywords: string[];
  primarySkills: string[];
  fallbackAgents: string[];
  refusalStyle: AgentRefusalStyle;
  refusalMessage: string;
  unknownIntentMessage: string;
};

export type AgentCapabilityContractsResponse = {
  contracts: AgentCapabilityContract[];
};

export type AgentCapabilityCheckResult = {
  allowed: boolean;
  agentName: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  matchedAllowedKeywords: string[];
  matchedDeniedKeywords: string[];
  matchedSoftAllowedKeywords: string[];
  matchedSmallTalkKeywords: string[];
  suggestedAgents: string[];
  refusalMessage?: string;
  contract: AgentCapabilityContract | null;
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

export async function fetchAgentCapabilityContracts() {
  const response = await fetch(`${API_BASE_URL}/api/agent-governance/contracts`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch agent capability contracts"
    );

    throw new Error(errorMessage);
  }

  const data: AgentCapabilityContractsResponse = await response.json();
  return data.contracts;
}

export async function checkAgentCapability(payload: {
  agentName: string;
  inputText: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/agent-governance/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to check agent capability"
    );

    throw new Error(errorMessage);
  }

  const data: AgentCapabilityCheckResult = await response.json();
  return data;
}