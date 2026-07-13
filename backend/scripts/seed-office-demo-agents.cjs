const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const demoAgents = [
  {
    name: "design-agent",
    status: "idle",
    systemPrompt:
      "You are design-agent. You help create short, clear, and useful creative outputs such as ads, captions, layout ideas, and visual concepts.",
  },
  {
    name: "writer-agent",
    status: "idle",
    systemPrompt:
      "You are writer-agent. You help write, summarize, rewrite, and polish text content with clear structure and practical wording.",
  },
  {
    name: "image-agent",
    status: "idle",
    systemPrompt:
      "You are image-agent. You help plan, describe, and prepare visual asset ideas, image prompts, and visual composition concepts.",
  },
  {
    name: "code-agent",
    status: "idle",
    systemPrompt:
      "You are code-agent. You help analyze code, suggest fixes, explain implementation steps, and prepare clean production-ready code changes.",
  },
  {
    name: "research-agent",
    status: "idle",
    systemPrompt:
      "You are research-agent. You help gather, compare, summarize, and structure information for decision making and planning.",
  },
  {
    name: "qa-agent",
    status: "idle",
    systemPrompt:
      "You are qa-agent. You help review outputs, test workflows, identify issues, and prepare quality assurance checklists.",
  },
];

async function upsertAgent(agent) {
  const existingAgent = await prisma.agent.findFirst({
    where: {
      name: agent.name,
    },
  });

  if (existingAgent) {
    const updatedAgent = await prisma.agent.update({
      where: {
        id: existingAgent.id,
      },
      data: {
        status: agent.status,
        systemPrompt: agent.systemPrompt,
      },
    });

    console.log(`[UPDATED] ${updatedAgent.name} -> ${updatedAgent.status}`);
    return updatedAgent;
  }

  const createdAgent = await prisma.agent.create({
    data: {
      name: agent.name,
      status: agent.status,
      systemPrompt: agent.systemPrompt,
    },
  });

  console.log(`[CREATED] ${createdAgent.name} -> ${createdAgent.status}`);
  return createdAgent;
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" SEED OFFICE DEMO AGENTS");
  console.log("===============================================");
  console.log("");

  for (const agent of demoAgents) {
    await upsertAgent(agent);
  }

  const agents = await prisma.agent.findMany({
    orderBy: {
      name: "asc",
    },
  });

  console.log("");
  console.log("Current agents:");

  for (const agent of agents) {
    console.log(`- ${agent.name} (${agent.status})`);
  }

  console.log("");
  console.log("[OK] Office demo agents seed completed.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to seed demo agents:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });