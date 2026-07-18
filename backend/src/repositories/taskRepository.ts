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

export async function findRecentTasks(limit = 10) {
  return prisma.task.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      agent: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getTaskSummary() {
  const [
    totalTasks,
    runningTasks,
    completedTasks,
    errorTasks,
    whatsappRequests,
    manualRequests,
  ] = await Promise.all([
    prisma.task.count(),

    prisma.task.count({
      where: {
        status: TASK_STATUS.IN_PROGRESS,
      },
    }),

    prisma.task.count({
      where: {
        status: TASK_STATUS.DONE,
      },
    }),

    prisma.task.count({
      where: {
        status: TASK_STATUS.ERROR,
      },
    }),

    prisma.task.count({
      where: {
        source: "whatsapp",
      },
    }),

    prisma.task.count({
      where: {
        source: "manual",
      },
    }),
  ]);

  return {
    totalTasks,
    runningTasks,
    completedTasks,
    errorTasks,
    whatsappRequests,
    manualRequests,
  };
}