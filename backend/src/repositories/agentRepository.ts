import { prisma } from "../db/prisma";
import { AGENT_STATUS, AgentStatus } from "../types/status";

export async function findAgentByName(agentName: string) {
  return prisma.agent.findUnique({
    where: {
      name: agentName,
    },
  });
}

export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus
) {
  return prisma.agent.update({
    where: {
      id: agentId,
    },
    data: {
      status,
    },
  });
}

export async function setAgentWorking(agentId: string) {
  return updateAgentStatus(agentId, AGENT_STATUS.WORKING);
}

export async function setAgentIdle(agentId: string) {
  return updateAgentStatus(agentId, AGENT_STATUS.IDLE);
}

export async function setAgentError(agentId: string) {
  return updateAgentStatus(agentId, AGENT_STATUS.ERROR);
}