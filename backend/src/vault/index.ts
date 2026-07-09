import { prisma } from "../db/prisma";

export async function saveMemory(agentId: string, content: string) {
  return prisma.memory.create({
    data: {
      agentId,
      content,
    },
  });
}

export async function getRecentMemory(agentId: string, limit = 5) {
  return prisma.memory.findMany({
    where: {
      agentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}