import { prisma } from "../db/prisma";

export async function findSkillByAgentAndName(
  agentName: string,
  skillName: string
) {
  return prisma.skill.findFirst({
    where: {
      name: skillName,
      agent: {
        name: agentName,
      },
    },
  });
}

export async function findSkillsByAgentName(agentName: string) {
  return prisma.skill.findMany({
    where: {
      agent: {
        name: agentName,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function findAllSkills() {
  return prisma.skill.findMany({
    orderBy: {
      createdAt: "asc",
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