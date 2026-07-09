import fs from "fs";
import path from "path";
import { prisma } from "../db/prisma";

export async function loadSkillForAgent(
  agentName: string,
  skillName: string
): Promise<string> {
  const agent = await prisma.agent.findUnique({
    where: {
      name: agentName,
    },
  });

  if (!agent) {
    return `Agent ${agentName} tidak ditemukan di database.`;
  }

  const skill = await prisma.skill.findFirst({
    where: {
      agentId: agent.id,
      name: skillName,
    },
  });

  if (!skill) {
    return `Skill ${skillName} belum terdaftar untuk agent ${agentName}.`;
  }

  if (!skill.filePath) {
    return `Skill ${skillName} belum punya filePath.`;
  }

  const skillPath = path.resolve(process.cwd(), skill.filePath);

  console.log("Membaca skill dari:", skillPath);

  try {
    const content = fs.readFileSync(skillPath, "utf-8");
    return content.replace(/\r\n/g, "\n");
  } catch (error) {
    console.error("Gagal membaca file skill:", error);
    return `File skill tidak bisa dibaca: ${skill.filePath}`;
  }
}