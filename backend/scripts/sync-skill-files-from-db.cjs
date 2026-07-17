const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function sanitizeFileName(value) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" SYNC SKILL FILES FROM DATABASE");
  console.log("===============================================");
  console.log("");

  const skills = await prisma.skill.findMany({
    include: {
      agent: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (skills.length === 0) {
    console.log("[INFO] No skills found in database.");
    return;
  }

  const backendRoot = process.cwd();
  const skillsRoot = path.join(backendRoot, "skills");

  if (!fs.existsSync(skillsRoot)) {
    fs.mkdirSync(skillsRoot, { recursive: true });
  }

  for (const skill of skills) {
    const agentName = skill.agent.name;
    const skillName = skill.name;

    const agentDir = path.join(skillsRoot, sanitizeFileName(agentName));

    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    const fileName = `${sanitizeFileName(skillName)}.md`;
    const filePath = path.join(agentDir, fileName);

    const content =
      skill.content ||
      `# Skill: ${skillName}

## Owner Agent
${agentName}

## Description
${skill.description || "No description configured yet."}
`;

    fs.writeFileSync(filePath, content, "utf8");

    console.log(`[SYNCED] ${agentName}/${fileName}`);
  }

  console.log("");
  console.log(`[OK] Synced ${skills.length} skill files.`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to sync skill files:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });