import {
    findAgentCapabilityContract,
    type AgentCapabilityContract,
  } from "./agentCapabilityContracts";
  
  export type AgentCapabilityCheckResult = {
    allowed: boolean;
    agentName: string;
    reason: string;
    confidence: "high" | "medium" | "low";
    matchedAllowedKeywords: string[];
    matchedDeniedKeywords: string[];
    suggestedAgents: string[];
    refusalMessage?: string;
    contract: AgentCapabilityContract | null;
  };
  
  function removeLeadingAgentMention(inputText: string) {
    return inputText.replace(/^@[\w-]+\s*/i, "").trim();
  }
  
  function normalizeText(inputText: string) {
    return removeLeadingAgentMention(inputText).toLowerCase();
  }
  
  function findKeywordMatches(inputText: string, keywords: string[]) {
    const normalizedInput = normalizeText(inputText);
  
    return keywords.filter((keyword) =>
      normalizedInput.includes(keyword.toLowerCase())
    );
  }
  
  function buildPoliteRefusalMessage(
    contract: AgentCapabilityContract,
    matchedDeniedKeywords: string[]
  ) {
    const fallbackSuggestion =
      contract.fallbackAgents.length > 0
        ? ` Coba arahkan ke ${contract.fallbackAgents
            .map((agentName) => `@${agentName}`)
            .join(", ")}.`
        : "";
  
    const deniedReason =
      matchedDeniedKeywords.length > 0
        ? ` Request ini terdeteksi mengarah ke area di luar scope: ${matchedDeniedKeywords.join(
            ", "
          )}.`
        : "";
  
    return `${contract.refusalMessage}${deniedReason}${fallbackSuggestion}`;
  }
  
  export function checkAgentCapability(input: {
    agentName: string;
    inputText: string;
  }): AgentCapabilityCheckResult {
    const contract = findAgentCapabilityContract(input.agentName);
  
    if (!contract) {
      return {
        allowed: true,
        agentName: input.agentName,
        reason:
          "No capability contract found for this agent. Allowed by compatibility fallback.",
        confidence: "low",
        matchedAllowedKeywords: [],
        matchedDeniedKeywords: [],
        suggestedAgents: [],
        contract: null,
      };
    }
  
    const matchedDeniedKeywords = findKeywordMatches(
      input.inputText,
      contract.deniedKeywords
    );
  
    const matchedAllowedKeywords = findKeywordMatches(
      input.inputText,
      contract.allowedKeywords
    );
  
    if (matchedDeniedKeywords.length > 0 && matchedAllowedKeywords.length === 0) {
      return {
        allowed: false,
        agentName: input.agentName,
        reason: "Request matched denied keywords and no allowed keywords.",
        confidence: "high",
        matchedAllowedKeywords,
        matchedDeniedKeywords,
        suggestedAgents: contract.fallbackAgents,
        refusalMessage: buildPoliteRefusalMessage(
          contract,
          matchedDeniedKeywords
        ),
        contract,
      };
    }
  
    if (matchedDeniedKeywords.length > matchedAllowedKeywords.length) {
      return {
        allowed: false,
        agentName: input.agentName,
        reason: "Request appears more aligned with denied domains than allowed domains.",
        confidence: "medium",
        matchedAllowedKeywords,
        matchedDeniedKeywords,
        suggestedAgents: contract.fallbackAgents,
        refusalMessage: buildPoliteRefusalMessage(
          contract,
          matchedDeniedKeywords
        ),
        contract,
      };
    }
  
    if (matchedAllowedKeywords.length > 0) {
      return {
        allowed: true,
        agentName: input.agentName,
        reason: "Request matched allowed capability keywords.",
        confidence: "high",
        matchedAllowedKeywords,
        matchedDeniedKeywords,
        suggestedAgents: contract.fallbackAgents,
        contract,
      };
    }
  
    return {
      allowed: true,
      agentName: input.agentName,
      reason:
        "No strong denied domain detected. Allowed for now until stricter semantic skill matching is implemented.",
      confidence: "low",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      suggestedAgents: contract.fallbackAgents,
      contract,
    };
  }