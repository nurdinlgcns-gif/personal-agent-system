import { findEmbeddedMemoryChunks } from "../../repositories/memoryChunkRepository";
import { embedText, getActiveEmbeddingProviderInfo } from "./embeddingClient";

export type SemanticMemorySearchInput = {
  query: string;
  agentName?: string;
  topK?: number;
  minScore?: number;
  allowedAgents?: string[];
  matchedSkillNames?: string[];
  allowedScopes?: string[];
  allowedSensitivityLevels?: string[];
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

export type SemanticMemorySearchResult = {
  provider: ReturnType<typeof getActiveEmbeddingProviderInfo>;
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

type EmbeddedChunk = Awaited<ReturnType<typeof findEmbeddedMemoryChunks>>[number];

const DEFAULT_ALLOWED_SCOPES = ["global", "project", "agent", "skill", "whatsapp"];
const DEFAULT_ALLOWED_SENSITIVITY_LEVELS = ["normal", "internal"];

function safeJsonParse<TValue>(
  value: string | null | undefined,
  fallback: TValue
) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function parseVector(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function normalizeList(values?: string[]) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function hasOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));

  return left.some((item) => rightSet.has(item.toLowerCase()));
}

function getOverlaps(left: string[], right: string[]) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));

  return left.filter((item) => rightSet.has(item.toLowerCase()));
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const length = Math.min(left.length, right.length);

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;

    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function evaluateChunkAccess(input: {
  chunk: EmbeddedChunk;
  agentName?: string;
  allowedAgentsFilter: string[];
  matchedSkillNames: string[];
  allowedScopes: string[];
  allowedSensitivityLevels: string[];
}) {
  const {
    chunk,
    agentName,
    allowedAgentsFilter,
    matchedSkillNames,
    allowedScopes,
    allowedSensitivityLevels,
  } = input;

  const chunkAllowedAgents = safeJsonParse<string[]>(chunk.allowedAgentsJson, []);
  const chunkLinkedSkillNames = safeJsonParse<string[]>(
    chunk.linkedSkillNamesJson,
    []
  );

  const accessReasons: string[] = [];
  const matchReasons: string[] = [];

  if (!allowedScopes.includes(chunk.scope)) {
    return {
      allowed: false,
      accessReasons,
      matchReasons,
      matchedMemorySkills: [],
      deniedReason: "scope_not_allowed",
    };
  }

  accessReasons.push("scope_allowed");

  if (!allowedSensitivityLevels.includes(chunk.sensitivityLevel)) {
    return {
      allowed: false,
      accessReasons,
      matchReasons,
      matchedMemorySkills: [],
      deniedReason: "sensitivity_not_allowed",
    };
  }

  accessReasons.push("sensitivity_allowed");

  if (allowedAgentsFilter.length > 0) {
    const passesAllowedAgentsFilter =
      allowedAgentsFilter.includes(chunk.agentName) ||
      chunkAllowedAgents.some((agent) => allowedAgentsFilter.includes(agent));

    if (!passesAllowedAgentsFilter) {
      return {
        allowed: false,
        accessReasons,
        matchReasons,
        matchedMemorySkills: [],
        deniedReason: "allowed_agents_filter_mismatch",
      };
    }

    accessReasons.push("allowed_agents_filter_match");
  }

  if (agentName) {
    const isChunkAgent = chunk.agentName === agentName;
    const isOwnerAgent = chunk.ownerAgentName === agentName;
    const isExplicitlyAllowed = chunkAllowedAgents.includes(agentName);
    const isOpenGlobalOrProject =
      (chunk.scope === "global" || chunk.scope === "project") &&
      chunkAllowedAgents.length === 0;

    if (
      !isChunkAgent &&
      !isOwnerAgent &&
      !isExplicitlyAllowed &&
      !isOpenGlobalOrProject
    ) {
      return {
        allowed: false,
        accessReasons,
        matchReasons,
        matchedMemorySkills: [],
        deniedReason: "agent_access_denied",
      };
    }

    if (isChunkAgent) {
      accessReasons.push("chunk_agent_match");
    }

    if (isOwnerAgent) {
      accessReasons.push("owner_agent_match");
    }

    if (isExplicitlyAllowed) {
      accessReasons.push("allowed_agent_match");
    }

    if (isOpenGlobalOrProject) {
      accessReasons.push("open_global_or_project_scope");
    }
  } else {
    accessReasons.push("no_agent_filter");
  }

  const matchedMemorySkills = getOverlaps(chunkLinkedSkillNames, matchedSkillNames);

  /**
   * Skill-scope hardening:
   * If the chunk is skill scoped and the caller provides matched skills,
   * then linkedSkillNames must overlap with matchedSkillNames.
   */
  if (
    chunk.scope === "skill" &&
    chunkLinkedSkillNames.length > 0 &&
    matchedSkillNames.length > 0 &&
    matchedMemorySkills.length === 0
  ) {
    return {
      allowed: false,
      accessReasons,
      matchReasons,
      matchedMemorySkills,
      deniedReason: "skill_scope_mismatch",
    };
  }

  if (matchedMemorySkills.length > 0) {
    matchReasons.push("linked_skill_match");
  }

  if (chunkLinkedSkillNames.length === 0) {
    matchReasons.push("no_linked_skill_constraint");
  }

  if (matchedSkillNames.length === 0) {
    matchReasons.push("no_matched_skill_filter");
  }

  return {
    allowed: true,
    accessReasons,
    matchReasons,
    matchedMemorySkills,
  };
}

function calculateGuardBoost(input: {
  chunk: EmbeddedChunk;
  agentName?: string;
  matchedSkillNames: string[];
  matchedMemorySkills: string[];
}) {
  let boost = 0;

  if (input.agentName && input.chunk.agentName === input.agentName) {
    boost += 0.08;
  }

  if (input.agentName && input.chunk.ownerAgentName === input.agentName) {
    boost += 0.06;
  }

  if (input.chunk.scope === "skill" && input.matchedMemorySkills.length > 0) {
    boost += 0.08;
  }

  if (input.chunk.scope === "agent") {
    boost += 0.04;
  }

  if (input.chunk.scope === "project") {
    boost += 0.02;
  }

  return boost;
}

function mapSearchResult(input: {
  chunk: EmbeddedChunk;
  score: number;
  accessReasons: string[];
  matchReasons: string[];
  matchedMemorySkills: string[];
}): SemanticMemorySearchResultItem {
  return {
    chunkId: input.chunk.id,
    memoryId: input.chunk.memoryId,
    agentId: input.chunk.agentId,
    agentName: input.chunk.agentName,
    chunkIndex: input.chunk.chunkIndex,
    content: input.chunk.content,
    score: Number(input.score.toFixed(6)),

    charCount: input.chunk.charCount,
    tokenEstimate: input.chunk.tokenEstimate,
    memoryType: input.chunk.memoryType,
    scope: input.chunk.scope,
    ownerAgentName: input.chunk.ownerAgentName,
    allowedAgents: safeJsonParse<string[]>(input.chunk.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(
      input.chunk.linkedSkillNamesJson,
      []
    ),
    matchedSkillNames: input.matchedMemorySkills,
    sensitivityLevel: input.chunk.sensitivityLevel,
    sourceType: input.chunk.sourceType,
    sourceRef: input.chunk.sourceRef,
    embeddingStatus: input.chunk.embeddingStatus,
    embeddingModel: input.chunk.embeddingModel,
    accessReasons: input.accessReasons,
    matchReasons: input.matchReasons,
  };
}

export async function searchSemanticMemoryChunks(
  input: SemanticMemorySearchInput
): Promise<SemanticMemorySearchResult> {
  const query = input.query.trim();
  const topK = Math.min(Math.max(input.topK || 5, 1), 50);
  const minScore = input.minScore ?? 0;
  const matchedSkillNames = normalizeList(input.matchedSkillNames);
  const allowedAgentsFilter = normalizeList(input.allowedAgents);
  const allowedScopes =
    input.allowedScopes && input.allowedScopes.length > 0
      ? normalizeList(input.allowedScopes)
      : DEFAULT_ALLOWED_SCOPES;
  const allowedSensitivityLevels =
    input.allowedSensitivityLevels && input.allowedSensitivityLevels.length > 0
      ? normalizeList(input.allowedSensitivityLevels)
      : DEFAULT_ALLOWED_SENSITIVITY_LEVELS;

  if (!query) {
    return {
      provider: getActiveEmbeddingProviderInfo(),
      query,
      agentName: input.agentName,
      matchedSkillNames,
      allowedScopes,
      allowedSensitivityLevels,
      totalCandidates: 0,
      eligibleCandidates: 0,
      returnedCount: 0,
      topK,
      minScore,
      results: [],
    };
  }

  const provider = getActiveEmbeddingProviderInfo();

  const queryEmbedding = await embedText({
    id: "query",
    text: query,
  });

  const candidateChunks = await findEmbeddedMemoryChunks();

  const eligibleScoredResults = candidateChunks
    .map((chunk) => {
      const access = evaluateChunkAccess({
        chunk,
        agentName: input.agentName,
        allowedAgentsFilter,
        matchedSkillNames,
        allowedScopes,
        allowedSensitivityLevels,
      });

      if (!access.allowed) {
        return null;
      }

      const chunkVector = parseVector(chunk.embeddingVectorJson);
      const baseScore = cosineSimilarity(queryEmbedding.vector, chunkVector);
      const boost = calculateGuardBoost({
        chunk,
        agentName: input.agentName,
        matchedSkillNames,
        matchedMemorySkills: access.matchedMemorySkills,
      });

      const score = Math.min(1, baseScore + boost);

      return {
        chunk,
        score,
        accessReasons: access.accessReasons,
        matchReasons: access.matchReasons,
        matchedMemorySkills: access.matchedMemorySkills,
      };
    })
    .filter(
      (
        result
      ): result is {
        chunk: EmbeddedChunk;
        score: number;
        accessReasons: string[];
        matchReasons: string[];
        matchedMemorySkills: string[];
      } => result !== null
    );

  const results = eligibleScoredResults
    .filter((result) => result.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.chunk.updatedAt.getTime() - left.chunk.updatedAt.getTime();
    })
    .slice(0, topK)
    .map(mapSearchResult);

  return {
    provider,
    query,
    agentName: input.agentName,
    matchedSkillNames,
    allowedScopes,
    allowedSensitivityLevels,
    totalCandidates: candidateChunks.length,
    eligibleCandidates: eligibleScoredResults.length,
    returnedCount: results.length,
    topK,
    minScore,
    results,
  };
}