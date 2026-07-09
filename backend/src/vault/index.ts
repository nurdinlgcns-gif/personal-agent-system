import {
    createMemory,
    findRecentMemoriesByAgentId,
  } from "../repositories/memoryRepository";
  import { logger } from "../utils/logger";
  
  export async function saveMemory(
    agentId: string,
    content: string,
    type = "general"
  ) {
    logger.agent(`Saving memory for agentId: ${agentId}`);
  
    return createMemory({
      agentId,
      content,
      type,
    });
  }
  
  export async function getRecentMemory(agentId: string, limit = 5) {
    logger.agent(`Loading recent memories for agentId: ${agentId}`);
  
    return findRecentMemoriesByAgentId({
      agentId,
      limit,
    });
  }