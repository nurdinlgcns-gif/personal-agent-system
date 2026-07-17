import {
  findAgentCapabilityContract,
  type AgentCapabilityContract,
} from "./agentCapabilityContracts";
import { getDynamicAgentCapabilityContract } from "./dynamicAgentCapabilityContractService";
import {
  findSkillGovernanceMatches,
  flattenSkillMatchNames,
  flattenSkillMatchSignals,
  type SkillGovernanceMatch,
} from "./skillGovernanceMapping";

export type AgentCapabilityCheckResult = {
  allowed: boolean;
  agentName: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  matchedAllowedKeywords: string[];
  matchedDeniedKeywords: string[];
  matchedSoftAllowedKeywords: string[];
  matchedSmallTalkKeywords: string[];
  matchedSkillNames: string[];
  matchedSkillSignals: string[];
  suggestedAgents: string[];
  refusalMessage?: string;
  contract: AgentCapabilityContract | null;
};

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

function normalizeText(inputText: string) {
  return removeLeadingAgentMention(inputText)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isShortKeyword(keyword: string) {
  return keyword.trim().length <= 3;
}

function keywordMatches(inputText: string, keyword: string) {
  const normalizedInput = normalizeText(inputText);
  const normalizedKeyword = keyword.toLowerCase().trim();

  if (!normalizedKeyword) {
    return false;
  }

  if (isShortKeyword(normalizedKeyword)) {
    const keywordPattern = new RegExp(
      `(^|\\s)${escapeRegExp(normalizedKeyword)}($|\\s)`,
      "i"
    );

    return keywordPattern.test(normalizedInput);
  }

  return normalizedInput.includes(normalizedKeyword);
}

function findKeywordMatches(inputText: string, keywords: string[]) {
  return keywords.filter((keyword) => keywordMatches(inputText, keyword));
}

function isVeryShortOrEmptyAfterMention(inputText: string) {
  const normalizedInput = normalizeText(inputText);

  return normalizedInput.length <= 2;
}

function looksLikeSmallTalk(inputText: string, contract: AgentCapabilityContract) {
  const matchedSmallTalkKeywords = findKeywordMatches(
    inputText,
    contract.safeSmallTalkKeywords
  );

  if (matchedSmallTalkKeywords.length > 0) {
    return true;
  }

  const normalizedInput = normalizeText(inputText);

  return /^(halo|hai|hello|hi|pagi|siang|sore|malam)$/i.test(
    normalizedInput
  );
}

function looksLikeQuestionWithoutDomain(inputText: string) {
  const normalizedInput = normalizeText(inputText);

  const questionMarkers = [
    "apa",
    "apakah",
    "bagaimana",
    "gimana",
    "kenapa",
    "mengapa",
    "siapa",
    "kapan",
    "dimana",
    "di mana",
    "jelaskan",
    "explain",
    "how",
    "why",
    "what",
  ];

  return questionMarkers.some((marker) => keywordMatches(normalizedInput, marker));
}

function buildPoliteRefusalMessage(input: {
  contract: AgentCapabilityContract;
  matchedDeniedKeywords: string[];
}) {
  const { contract, matchedDeniedKeywords } = input;

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

function buildUnknownIntentMessage(contract: AgentCapabilityContract) {
  const fallbackSuggestion =
    contract.fallbackAgents.length > 0
      ? ` Pilihan agent yang mungkin lebih cocok: ${contract.fallbackAgents
          .map((agentName) => `@${agentName}`)
          .join(", ")}.`
      : "";

  return `${contract.unknownIntentMessage}${fallbackSuggestion}`;
}

function makeResult(input: {
  allowed: boolean;
  agentName: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  matchedAllowedKeywords: string[];
  matchedDeniedKeywords: string[];
  matchedSoftAllowedKeywords: string[];
  matchedSmallTalkKeywords: string[];
  matchedSkillNames: string[];
  matchedSkillSignals: string[];
  suggestedAgents: string[];
  refusalMessage?: string;
  contract: AgentCapabilityContract | null;
}): AgentCapabilityCheckResult {
  return {
    allowed: input.allowed,
    agentName: input.agentName,
    reason: input.reason,
    confidence: input.confidence,
    matchedAllowedKeywords: input.matchedAllowedKeywords,
    matchedDeniedKeywords: input.matchedDeniedKeywords,
    matchedSoftAllowedKeywords: input.matchedSoftAllowedKeywords,
    matchedSmallTalkKeywords: input.matchedSmallTalkKeywords,
    matchedSkillNames: input.matchedSkillNames,
    matchedSkillSignals: input.matchedSkillSignals,
    suggestedAgents: input.suggestedAgents,
    refusalMessage: input.refusalMessage,
    contract: input.contract,
  };
}

function evaluateAgentCapability(input: {
  agentName: string;
  inputText: string;
  contract: AgentCapabilityContract | null;
  skillMatches?: SkillGovernanceMatch[];
}): AgentCapabilityCheckResult {
  const { contract } = input;

  const matchedSkillNames = flattenSkillMatchNames(input.skillMatches || []);
  const matchedSkillSignals = flattenSkillMatchSignals(input.skillMatches || []);

  if (!contract) {
    return makeResult({
      allowed: true,
      agentName: input.agentName,
      reason:
        "No capability contract found for this agent. Allowed by compatibility fallback.",
      confidence: "low",
      matchedAllowedKeywords: [],
      matchedDeniedKeywords: [],
      matchedSoftAllowedKeywords: [],
      matchedSmallTalkKeywords: [],
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: [],
      contract: null,
    });
  }

  const matchedDeniedKeywords = findKeywordMatches(
    input.inputText,
    contract.deniedKeywords
  );

  const matchedAllowedKeywords = findKeywordMatches(
    input.inputText,
    contract.allowedKeywords
  );

  const matchedSoftAllowedKeywords = findKeywordMatches(
    input.inputText,
    contract.softAllowedKeywords
  );

  const matchedSmallTalkKeywords = findKeywordMatches(
    input.inputText,
    contract.safeSmallTalkKeywords
  );

  if (isVeryShortOrEmptyAfterMention(input.inputText)) {
    return makeResult({
      allowed: true,
      agentName: input.agentName,
      reason: "Very short or empty message after mention. Allowed as harmless.",
      confidence: "low",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  /**
   * Denied precedence:
   * For strict agents, denied keywords always win over allowed keywords or skill matches.
   */
  if (matchedDeniedKeywords.length > 0 && contract.strictBoundary) {
    const confidence: "high" | "medium" =
      matchedAllowedKeywords.length > 0 || matchedSkillNames.length > 0
        ? "medium"
        : "high";

    return makeResult({
      allowed: false,
      agentName: input.agentName,
      reason:
        matchedAllowedKeywords.length > 0 || matchedSkillNames.length > 0
          ? "Request matched denied keywords. For strict agents, denied domains take precedence over allowed keywords and skill matches."
          : "Request matched denied keywords and no allowed keywords.",
      confidence,
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      refusalMessage: buildPoliteRefusalMessage({
        contract,
        matchedDeniedKeywords,
      }),
      contract,
    });
  }

  if (matchedDeniedKeywords.length > 0 && matchedAllowedKeywords.length === 0) {
    return makeResult({
      allowed: false,
      agentName: input.agentName,
      reason: "Request matched denied keywords and no allowed keywords.",
      confidence: "high",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      refusalMessage: buildPoliteRefusalMessage({
        contract,
        matchedDeniedKeywords,
      }),
      contract,
    });
  }

  if (matchedDeniedKeywords.length > matchedAllowedKeywords.length) {
    return makeResult({
      allowed: false,
      agentName: input.agentName,
      reason:
        "Request appears more aligned with denied domains than allowed domains.",
      confidence: "medium",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      refusalMessage: buildPoliteRefusalMessage({
        contract,
        matchedDeniedKeywords,
      }),
      contract,
    });
  }

  if (looksLikeSmallTalk(input.inputText, contract)) {
    return makeResult({
      allowed: true,
      agentName: input.agentName,
      reason: "Request matched safe small talk.",
      confidence: "medium",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  if (matchedAllowedKeywords.length > 0) {
    return makeResult({
      allowed: true,
      agentName: input.agentName,
      reason: "Request matched allowed capability keywords.",
      confidence: "high",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  if (matchedSkillNames.length > 0) {
    return makeResult({
      allowed: true,
      agentName: input.agentName,
      reason: "Request matched assigned agent skills.",
      confidence: "high",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  if (
    contract.strictBoundary &&
    contract.unknownIntentPolicy === "clarify_or_refuse"
  ) {
    const unknownReason = looksLikeQuestionWithoutDomain(input.inputText)
      ? "Unknown question did not match this agent's allowed domains or assigned skills."
      : "Unknown intent did not match this agent's allowed domains or assigned skills.";

    return makeResult({
      allowed: false,
      agentName: input.agentName,
      reason: unknownReason,
      confidence: "low",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
      matchedSkillNames,
      matchedSkillSignals,
      suggestedAgents: contract.fallbackAgents,
      refusalMessage: buildUnknownIntentMessage(contract),
      contract,
    });
  }

  return makeResult({
    allowed: true,
    agentName: input.agentName,
    reason:
      "No strong denied domain detected and unknown intent policy allows fallback.",
    confidence: "low",
    matchedAllowedKeywords,
    matchedDeniedKeywords,
    matchedSoftAllowedKeywords,
    matchedSmallTalkKeywords,
    matchedSkillNames,
    matchedSkillSignals,
    suggestedAgents: contract.fallbackAgents,
    contract,
  });
}

/**
 * Static fallback checker.
 * Kept for compatibility and low-risk fallback.
 */
export function checkAgentCapability(input: {
  agentName: string;
  inputText: string;
}): AgentCapabilityCheckResult {
  const staticContract = findAgentCapabilityContract(input.agentName);

  return evaluateAgentCapability({
    ...input,
    contract: staticContract,
    skillMatches: [],
  });
}

/**
 * Dynamic checker.
 * Reads DB contract and assigned skills.
 */
export async function checkAgentCapabilityDynamic(input: {
  agentName: string;
  inputText: string;
}): Promise<AgentCapabilityCheckResult> {
  const dynamicContract = await getDynamicAgentCapabilityContract(
    input.agentName
  );

  const skillMatches = await findSkillGovernanceMatches({
    agentName: input.agentName,
    inputText: input.inputText,
  });

  return evaluateAgentCapability({
    ...input,
    contract: dynamicContract,
    skillMatches,
  });
}