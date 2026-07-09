import { prisma } from "../db/prisma";

async function main() {
  const agent = await prisma.agent.findUnique({
    where: {
      name: "design-agent",
    },
  });

  if (!agent) {
    console.log("Agent design-agent belum ditemukan di database.");
    return;
  }

  const existingSkill = await prisma.skill.findFirst({
    where: {
      agentId: agent.id,
      name: "generate_ad_copy",
    },
  });

  if (existingSkill) {
    console.log("Skill generate_ad_copy sudah terdaftar.");
    return;
  }

  const skill = await prisma.skill.create({
    data: {
      agentId: agent.id,
      name: "generate_ad_copy",
      description: "Membuat 3 variasi ad copy singkat dengan hook, benefit, dan CTA.",
      filePath: "../skills-library/design-agent/generate_ad_copy.md",
    },
  });

  console.log("Skill berhasil didaftarkan:", skill.name);
}

main()
  .catch((error) => {
    console.error("Gagal register skill:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });