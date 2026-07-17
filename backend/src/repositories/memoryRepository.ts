import { prisma } from "../db/prisma";

export type CreateMemoryParams = {
  agentId: string;
  content: string;
  type?: string;
  scope?: string;
  ownerAgentName?: string | null;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  runtimeInjectable?: boolean;
  ragEnabled?: boolean;
  sensitivityLevel?: string;
  sourceType?: string;
  sourceRef?: string | null;
};

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? []);
}

export async function createMemory(params: CreateMemoryParams) {
  return prisma.memory.create({
    data: {
      agentId: params.agentId,
      content: params.content,
      type: params.type || "general",
      scope: params.scope || "agent",
      ownerAgentName: params.ownerAgentName || null,
      allowedAgentsJson: stringifyJson(params.allowedAgents || []),
      linkedSkillNamesJson: stringifyJson(params.linkedSkillNames || []),
      runtimeInjectable: params.runtimeInjectable ?? false,
      ragEnabled: params.ragEnabled ?? false,
      sensitivityLevel: params.sensitivityLevel || "normal",
      sourceType: params.sourceType || "manual",
      sourceRef: params.sourceRef || null,
    },
  });
}

export async function findRecentMemoriesByAgentId(params: {
  agentId: string;
  limit?: number;
}) {
  return prisma.memory.findMany({
    where: {
      agentId: params.agentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params.limit || 5,
  });
}

export async function deleteMemoriesByAgentId(agentId: string) {
  return prisma.memory.deleteMany({
    where: {
      agentId,
    },
  });
}

/**
 * Phase 8.41 / 8.43 — Memory Vault
 * Used by Memory Vault dashboard page.
 */
export async function findAllMemories() {
  return prisma.memory.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      agent: {
        select: {
          name: true,
          color: true,
        },
      },
    },
  });
}

export async function findMemoriesByAgentName(agentName: string) {
  return prisma.memory.findMany({
    where: {
      agent: {
        name: agentName,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      agent: {
        select: {
          name: true,
          color: true,
        },
      },
    },
  });
}