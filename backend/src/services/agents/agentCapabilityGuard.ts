import {
  findAgentCapabilityContract,
  type AgentCapabilityContract,
} from "./agentCapabilityContracts";
import { getDynamicAgentCapabilityContract } from "./dynamicAgentCapabilityContractService";

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

  /**
   * Important:
   * Short keywords like "hi" must not match inside words like "vehicle".
   * For short keywords, require whole-word matching.
   */
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
    suggestedAgents: input.suggestedAgents,
    refusalMessage: input.refusalMessage,
    contract: input.contract,
  };
}

function evaluateAgentCapability(input: {
  agentName: string;
  inputText: string;
  contract: AgentCapabilityContract | null;
}): AgentCapabilityCheckResult {
  const { contract } = input;

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
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  /**
   * Important security/boundary order:
   * Denied keywords must win before small talk.
   * Example: "vehicle" should not be allowed just because it contains "hi".
   */
    /**
   * Hard boundary rule:
   * For strict agents, denied keywords must take precedence over allowed keywords.
   *
   * Example:
   * "@design-agent buatkan promosi kopi generate gambar"
   *
   * This contains allowed keywords:
   * - promosi
   *
   * But also denied keywords:
   * - gambar
   * - generate gambar
   *
   * Since design-agent is not an image generation agent, the request must be denied
   * and redirected to image-agent, even if it also contains copywriting keywords.
   */
    if (matchedDeniedKeywords.length > 0 && contract.strictBoundary) {
      const confidence: "high" | "medium" =
        matchedAllowedKeywords.length > 0 ? "medium" : "high";
  
      return makeResult({
        allowed: false,
        agentName: input.agentName,
        reason:
          matchedAllowedKeywords.length > 0
            ? "Request matched denied keywords. For strict agents, denied domains take precedence over allowed keywords."
            : "Request matched denied keywords and no allowed keywords.",
        confidence,
        matchedAllowedKeywords,
        matchedDeniedKeywords,
        matchedSoftAllowedKeywords,
        matchedSmallTalkKeywords,
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
      suggestedAgents: contract.fallbackAgents,
      contract,
    });
  }

  if (
    contract.strictBoundary &&
    contract.unknownIntentPolicy === "clarify_or_refuse"
  ) {
    const unknownReason = looksLikeQuestionWithoutDomain(input.inputText)
      ? "Unknown question did not match this agent's allowed domains."
      : "Unknown intent did not match this agent's allowed domains.";

    return makeResult({
      allowed: false,
      agentName: input.agentName,
      reason: unknownReason,
      confidence: "low",
      matchedAllowedKeywords,
      matchedDeniedKeywords,
      matchedSoftAllowedKeywords,
      matchedSmallTalkKeywords,
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
  });
}

/**
 * Dynamic checker.
 * Reads DB first, then falls back to static contract if DB is empty.
 */
export async function checkAgentCapabilityDynamic(input: {
  agentName: string;
  inputText: string;
}): Promise<AgentCapabilityCheckResult> {
  const dynamicContract = await getDynamicAgentCapabilityContract(
    input.agentName
  );

  return evaluateAgentCapability({
    ...input,
    contract: dynamicContract,
  });
}