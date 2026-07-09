import { prisma } from "../db/prisma";

export async function createMemory(params: {
  agentId: string;
  content: string;
  type?: string;
}) {
  return prisma.memory.create({
    data: {
      agentId: params.agentId,
      content: params.content,
      type: params.type || "general",
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