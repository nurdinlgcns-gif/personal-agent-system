import { prisma } from "../db/prisma";
import { TASK_STATUS } from "../types/status";

export async function createTask(params: {
  agentId: string;
  inputText: string;
  source?: string;
}) {
  return prisma.task.create({
    data: {
      agentId: params.agentId,
      inputText: params.inputText,
      status: TASK_STATUS.IN_PROGRESS,
      source: params.source || "manual",
    },
  });
}

export async function markTaskDone(params: {
  taskId: string;
  outputText: string;
}) {
  return prisma.task.update({
    where: {
      id: params.taskId,
    },
    data: {
      outputText: params.outputText,
      status: TASK_STATUS.DONE,
    },
  });
}

export async function findRecentTasks(limit = 10) {
    return prisma.task.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        agent: {
          select: {
            name: true,
          },
        },
      },
    });
  }

export async function markTaskError(params: {
  taskId: string;
  outputText: string;
}) {
  return prisma.task.update({
    where: {
      id: params.taskId,
    },
    data: {
      outputText: params.outputText,
      status: TASK_STATUS.ERROR,
    },
  });
}