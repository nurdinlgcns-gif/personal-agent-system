import { findAllMemories } from "../../repositories/memoryRepository";

export type MemoryRuntimeSource = "manual" | "whatsapp" | "api" | "system";

export type MemoryRuntimeScopeResolveInput = {
  agentName: string;
  inputText?: string;
  matchedSkillNames?: string[];
  source?: MemoryRuntimeSource;
  maxResults?: number;
  includeNonRuntimeInjectable?: boolean;
  allowedSensitivityLevels?: string[];
};

export type MemoryRuntimeScopeResolvedItem = {
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

  createdAt: Date;

  score: number;
  matchReasons: string[];
  matchedSkillNames: string[];
};

export type MemoryRuntimeScopeResolveResult = {
  agentName: string;
  source: MemoryRuntimeSource;
  inputText: string;
  matchedSkillNames: string[];
  totalCandidates: number;
  eligibleCount: number;
  returnedCount: number;
  memories: MemoryRuntimeScopeResolvedItem[];
};

type MemoryRecord = Awaited<ReturnType<typeof findAllMemories>>[number];

function safeJsonParse<TValue>(value: string | null | undefined, fallback: TValue) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeList(values: string[] | undefined) {
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

function memoryTextMatchesQuery(memory: MemoryRecord, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return false;
  }

  const allowedAgents = safeJsonParse<string[]>(memory.allowedAgentsJson, []);
  const linkedSkillNames = safeJsonParse<string[]>(
    memory.linkedSkillNamesJson,
    []
  );

  const searchableText = normalizeText(
    [
      memory.agent.name,
      memory.content,
      memory.type,
      memory.scope,
      memory.ownerAgentName || "",
      allowedAgents.join(" "),
      linkedSkillNames.join(" "),
      memory.sensitivityLevel,
      memory.sourceType,
      memory.sourceRef || "",
    ].join(" ")
  );

  return searchableText.includes(normalizedQuery);
}

function mapMemoryBase(memory: MemoryRecord) {
  return {
    id: memory.id,
    agentId: memory.agentId,
    agentName: memory.agent.name,
    agentColor: memory.agent.color,
    content: memory.content,
    type: memory.type,

    scope: memory.scope,
    ownerAgentName: memory.ownerAgentName,
    allowedAgents: safeJsonParse<string[]>(memory.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(
      memory.linkedSkillNamesJson,
      []
    ),
    runtimeInjectable: memory.runtimeInjectable,
    ragEnabled: memory.ragEnabled,
    sensitivityLevel: memory.sensitivityLevel,
    sourceType: memory.sourceType,
    sourceRef: memory.sourceRef,

    createdAt: memory.createdAt,
  };
}

function evaluateMemoryEligibility(input: {
  memory: MemoryRecord;
  agentName: string;
  matchedSkillNames: string[];
  source: MemoryRuntimeSource;
  inputText: string;
  includeNonRuntimeInjectable: boolean;
  allowedSensitivityLevels: string[];
}): MemoryRuntimeScopeResolvedItem | null {
  const {
    memory,
    agentName,
    matchedSkillNames,
    source,
    inputText,
    includeNonRuntimeInjectable,
    allowedSensitivityLevels,
  } = input;

  const baseMemory = mapMemoryBase(memory);

  const matchReasons: string[] = [];
  let score = 0;

  if (!includeNonRuntimeInjectable && !baseMemory.runtimeInjectable) {
    return null;
  }

  if (!allowedSensitivityLevels.includes(baseMemory.sensitivityLevel)) {
    return null;
  }

  const isOwnerAgent = baseMemory.ownerAgentName === agentName;
  const isMemoryAgent = baseMemory.agentName === agentName;
  const isAllowedAgent = baseMemory.allowedAgents.includes(agentName);
  const isGlobalOpen =
    baseMemory.scope === "global" && baseMemory.allowedAgents.length === 0;
  const isProjectOpen =
    baseMemory.scope === "project" && baseMemory.allowedAgents.length === 0;
  const isWhatsappScope = baseMemory.scope === "whatsapp" && source === "whatsapp";

  const agentScopeEligible =
    isOwnerAgent ||
    isMemoryAgent ||
    isAllowedAgent ||
    isGlobalOpen ||
    isProjectOpen ||
    isWhatsappScope;

  if (!agentScopeEligible) {
    return null;
  }

  if (isOwnerAgent) {
    score += 35;
    matchReasons.push("owner_agent_match");
  }

  if (isMemoryAgent) {
    score += 30;
    matchReasons.push("memory_agent_match");
  }

  if (isAllowedAgent) {
    score += 35;
    matchReasons.push("allowed_agent_match");
  }

  if (isGlobalOpen) {
    score += 25;
    matchReasons.push("global_scope_open");
  }

  if (isProjectOpen) {
    score += 20;
    matchReasons.push("project_scope_open");
  }

  if (isWhatsappScope) {
    score += 20;
    matchReasons.push("whatsapp_scope_match");
  }

  if (baseMemory.runtimeInjectable) {
    score += 15;
    matchReasons.push("runtime_injectable");
  }

  if (baseMemory.ragEnabled) {
    score += 10;
    matchReasons.push("rag_enabled");
  }

  if (baseMemory.scope === "agent") {
    score += 15;
    matchReasons.push("agent_scope");
  }

  if (baseMemory.scope === "skill") {
    score += 12;
    matchReasons.push("skill_scope");
  }

  if (baseMemory.scope === "project") {
    score += 8;
    matchReasons.push("project_scope");
  }

  const matchedMemorySkills = getOverlaps(
    baseMemory.linkedSkillNames,
    matchedSkillNames
  );

  if (baseMemory.linkedSkillNames.length > 0 && matchedSkillNames.length > 0) {
    if (matchedMemorySkills.length === 0 && baseMemory.scope === "skill") {
      return null;
    }

    if (matchedMemorySkills.length > 0) {
      score += 35;
      matchReasons.push("linked_skill_match");
    }
  }

  if (memoryTextMatchesQuery(memory, inputText)) {
    score += 12;
    matchReasons.push("lightweight_text_match");
  }

  if (baseMemory.sensitivityLevel === "normal") {
    score += 4;
  }

  if (baseMemory.sensitivityLevel === "internal") {
    score += 2;
  }

  return {
    ...baseMemory,
    score,
    matchReasons,
    matchedSkillNames: matchedMemorySkills,
  };
}

export async function resolveRuntimeMemoriesForAgent(
  input: MemoryRuntimeScopeResolveInput
): Promise<MemoryRuntimeScopeResolveResult> {
  const agentName = input.agentName.trim();
  const inputText = input.inputText || "";
  const source = input.source || "manual";
  const maxResults = input.maxResults || 8;
  const matchedSkillNames = normalizeList(input.matchedSkillNames);
  const includeNonRuntimeInjectable = input.includeNonRuntimeInjectable || false;
  const allowedSensitivityLevels =
    input.allowedSensitivityLevels && input.allowedSensitivityLevels.length > 0
      ? input.allowedSensitivityLevels
      : ["normal", "internal"];

  const memories = await findAllMemories();

  const eligibleMemories = memories
    .map((memory) =>
      evaluateMemoryEligibility({
        memory,
        agentName,
        matchedSkillNames,
        source,
        inputText,
        includeNonRuntimeInjectable,
        allowedSensitivityLevels,
      })
    )
    .filter(
      (memory): memory is MemoryRuntimeScopeResolvedItem => memory !== null
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

  const returnedMemories = eligibleMemories.slice(0, maxResults);

  return {
    agentName,
    source,
    inputText,
    matchedSkillNames,
    totalCandidates: memories.length,
    eligibleCount: eligibleMemories.length,
    returnedCount: returnedMemories.length,
    memories: returnedMemories,
  };
}