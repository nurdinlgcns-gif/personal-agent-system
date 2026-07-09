import { runDesignAgent } from "../agents/designAgent";
import { prisma } from "../db/prisma";

export async function routeTask(rawMessage: string): Promise<string> {
  const mentionMatch = rawMessage.match(/@([a-zA-Z-]+)/);
  const agentName = mentionMatch ? mentionMatch[1] : null;
  const cleanMessage = rawMessage.replace(/@[a-zA-Z-]+/, "").trim();

  if (!agentName) {
    return "Agent tidak ditemukan. Coba gunakan @design-agent.";
  }

  const agent = await prisma.agent.findUnique({
    where: {
      name: agentName,
    },
  });

  if (!agent) {
    return `Agent "${agentName}" belum terdaftar di database.`;
  }

  await prisma.agent.update({
    where: {
      id: agent.id,
    },
    data: {
      status: "working",
    },
  });

  const task = await prisma.task.create({
    data: {
      agentId: agent.id,
      inputText: cleanMessage,
      status: "in_progress",
      source: "manual",
    },
  });

  try {
    let result = "";
    console.log(
        `[TASK] Agent ${agent.name} mulai memproses task`
      );

    switch (agentName) {
      case "design-agent":
        result = await runDesignAgent(cleanMessage);
        break;

      default:
        result = `Agent "${agentName}" belum punya handler.`;
        break;
    }

    console.log(
        `[TASK] Agent ${agent.name} selesai memproses task`
      );

    await prisma.task.update({
      where: {
        id: task.id,
      },
      data: {
        outputText: result,
        status: "done",
      },
    });
    
    await prisma.agent.update({
        where: {
          id: agent.id,
        },
        data: {
          status: "idle",
        },
    });

    return result;
  } catch (error) {
    console.error("Error saat routeTask:", error);
    
    console.log(
        `[TASK] Agent ${agent.name} gagal memproses task`
      );

    await prisma.task.update({
      where: {
        id: task.id,
      },
      data: {
        status: "error",
        outputText: "Terjadi error saat memproses task.",
      },
    });

    await prisma.agent.update({
        where: {
          id: agent.id,
        },
        data: {
          status: "error",
        },
      });

    return "Terjadi error saat memproses task.";
  }
  
}