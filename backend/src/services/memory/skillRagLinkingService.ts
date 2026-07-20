import { prisma } from "../../db/prisma";

export type SkillRagSyncResult = {
  processedSkillCount: number;
  syncedSkillMemoryCount: number;
  skippedSkillCount: number;
  skillResults: Array<{
    skillId: string;
    skillName: string;
    agentName: string;
    memoryId?: string;
    synced: boolean;
    skipped: boolean;
    reason?: string;
  }>;
};

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function buildSkillSourceRef(skillId: string) {
  return `skill/${skillId}`;
}

function buildSkillMemoryContent(input: {
  skillName: string;
  skillDescription?: string | null;
  skillFilePath?: string | null;
  skillContent?: string | null;
  agentName: string;
}) {
  return normalizeWhitespace(
    [
      `Skill name: ${input.skillName}`,
      `Assigned agent: ${input.agentName}`,
      input.skillDescription
        ? `Skill description: ${input.skillDescription}`
        : "",
      input.skillFilePath ? `Skill file path: ${input.skillFilePath}` : "",
      input.skillContent ? `Skill content:\n${input.skillContent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

export async function syncSkillsToRagMemories(): Promise<SkillRagSyncResult> {
  const skills = await prisma.skill.findMany({
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: [
      {
        agent: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  let syncedSkillMemoryCount = 0;
  let skippedSkillCount = 0;

  const skillResults: SkillRagSyncResult["skillResults"] = [];

  for (const skill of skills) {
    const sourceRef = buildSkillSourceRef(skill.id);

    const content = buildSkillMemoryContent({
      skillName: skill.name,
      skillDescription: skill.description,
      skillFilePath: skill.filePath,
      skillContent: skill.content,
      agentName: skill.agent.name,
    });

    if (!content || content.length < 20) {
      skippedSkillCount += 1;

      skillResults.push({
        skillId: skill.id,
        skillName: skill.name,
        agentName: skill.agent.name,
        synced: false,
        skipped: true,
        reason: "Skill content is empty or too short.",
      });

      continue;
    }

    const existingMemory = await prisma.memory.findFirst({
      where: {
        sourceType: "skill",
        sourceRef,
      },
      select: {
        id: true,
      },
    });

    const memoryData = {
      agentId: skill.agentId,
      content,
      type: "skill_knowledge",
      scope: "skill",
      ownerAgentName: skill.agent.name,
      allowedAgentsJson: JSON.stringify([skill.agent.name]),
      linkedSkillNamesJson: JSON.stringify([skill.name]),
      runtimeInjectable: false,
      ragEnabled: true,
      sensitivityLevel: "normal",
      sourceType: "skill",
      sourceRef,
    };

    if (existingMemory) {
      const updatedMemory = await prisma.memory.update({
        where: {
          id: existingMemory.id,
        },
        data: memoryData as never,
      });

      syncedSkillMemoryCount += 1;

      skillResults.push({
        skillId: skill.id,
        skillName: skill.name,
        agentName: skill.agent.name,
        memoryId: updatedMemory.id,
        synced: true,
        skipped: false,
      });

      continue;
    }

    const createdMemory = await prisma.memory.create({
      data: memoryData as never,
    });

    syncedSkillMemoryCount += 1;

    skillResults.push({
      skillId: skill.id,
      skillName: skill.name,
      agentName: skill.agent.name,
      memoryId: createdMemory.id,
      synced: true,
      skipped: false,
    });
  }

  return {
    processedSkillCount: skills.length,
    syncedSkillMemoryCount,
    skippedSkillCount,
    skillResults,
  };
}