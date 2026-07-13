const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const removableDemoAgentNames = [
  "writer-agent",
  "image-agent",
  "code-agent",
  "research-agent",
  "qa-agent",
];

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" REMOVE OFFICE DEMO AGENTS");
  console.log("===============================================");
  console.log("");

  const result = await prisma.agent.deleteMany({
    where: {
      name: {
        in: removableDemoAgentNames,
      },
    },
  });

  console.log(`[OK] Removed demo agents: ${result.count}`);
  console.log("[INFO] design-agent was not removed.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to remove demo agents:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });