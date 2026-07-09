import { runDesignAgent } from "../agents/designAgent";
import { logger } from "../utils/logger";
import {
  findAgentByName,
  setAgentError,
  setAgentIdle,
  setAgentWorking,
} from "../repositories/agentRepository";
import {
  createTask,
  markTaskDone,
  markTaskError,
} from "../repositories/taskRepository";

type RouteTaskOptions = {
  source?: "manual" | "whatsapp";
  senderId?: string;
};

function extractAgentName(rawMessage: string): string | null {
  const mentionMatch = rawMessage.match(/@([a-zA-Z-]+)/);
  return mentionMatch ? mentionMatch[1] : null;
}

function cleanUserMessage(rawMessage: string): string {
  return rawMessage.replace(/@[a-zA-Z-]+/, "").trim();
}

export async function routeTask(
  rawMessage: string,
  options: RouteTaskOptions = {}
): Promise<string> {
  const agentName = extractAgentName(rawMessage);
  const cleanMessage = cleanUserMessage(rawMessage);
  const source = options.source || "manual";

  if (!agentName) {
    return "Agent tidak ditemukan. Coba gunakan @design-agent.";
  }

  const agent = await findAgentByName(agentName);

  if (!agent) {
    return `Agent "${agentName}" belum terdaftar di database.`;
  }

  const task = await createTask({
    agentId: agent.id,
    inputText: cleanMessage,
    source,
  });

  try {
    await setAgentWorking(agent.id);

    logger.task(`Agent ${agent.name} mulai memproses task`);
    logger.task(`Task source: ${source}`);

    if (options.senderId) {
      logger.task(`Sender ID: ${options.senderId}`);
    }

    let result = "";

    switch (agentName) {
      case "design-agent":
        result = await runDesignAgent(cleanMessage);
        break;

      default:
        result = `Agent "${agentName}" belum punya handler.`;
        break;
    }

    await markTaskDone({
      taskId: task.id,
      outputText: result,
    });

    await setAgentIdle(agent.id);

    logger.task(`Agent ${agent.name} selesai memproses task`);

    return result;
  } catch (error) {
    logger.error(`Agent ${agent.name} gagal memproses task`, error);

    await markTaskError({
      taskId: task.id,
      outputText: "Terjadi error saat memproses task.",
    });

    await setAgentError(agent.id);

    return "Terjadi error saat memproses task.";
  }
}