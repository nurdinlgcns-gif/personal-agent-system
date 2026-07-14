const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const builtInProviderNames = [
  "Claude Built-in ENV",
  "Gemini Built-in ENV",
];

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" REMOVE BUILT-IN LLM PROVIDERS FROM REGISTRY");
  console.log("===============================================");
  console.log("");

  const result = await prisma.llmProvider.deleteMany({
    where: {
      name: {
        in: builtInProviderNames,
      },
    },
  });

  console.log(`[OK] Removed built-in registry providers: ${result.count}`);
  console.log("[INFO] Custom providers were not removed.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to remove built-in LLM providers:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });