import fs from "fs";
import path from "path";
import { findSkillByAgentAndName } from "../repositories/skillRepository";
import { logger } from "../utils/logger";

export async function loadSkillForAgent(
  agentName: string,
  skillName: string
): Promise<string> {
  const skill = await findSkillByAgentAndName(agentName, skillName);

  if (!skill) {
    const message = `Skill ${skillName} belum terdaftar untuk agent ${agentName}.`;
    logger.skill(message);
    return message;
  }

  if (!skill.filePath) {
    const message = `Skill ${skillName} belum punya filePath.`;
    logger.skill(message);
    return message;
  }

  const absoluteSkillPath = path.resolve(process.cwd(), skill.filePath);

  logger.skill(`Loading skill: ${skillName}`);
  logger.skill(`Agent: ${agentName}`);
  logger.skill(`Path: ${absoluteSkillPath}`);

  try {
    const content = fs.readFileSync(absoluteSkillPath, "utf-8");

    logger.skill(`Skill loaded successfully: ${skillName}`);

    return content.replace(/\r\n/g, "\n");
  } catch (error) {
    logger.error(`Failed to read skill file: ${skill.filePath}`, error);

    return `File skill tidak bisa dibaca: ${skill.filePath}`;
  }
}