const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const AGENTS = [
  {
    name: "design-agent",
    color: "#60a5fa",
    systemPrompt:
      "You are design-agent, a creative marketing and copywriting specialist.",
  },
  {
    name: "writer-agent",
    color: "#a78bfa",
    systemPrompt:
      "You are writer-agent, a structured writing and summarization specialist.",
  },
  {
    name: "code-agent",
    color: "#34d399",
    systemPrompt:
      "You are code-agent, a software engineering and debugging specialist.",
  },
  {
    name: "research-agent",
    color: "#f59e0b",
    systemPrompt:
      "You are research-agent, a research and information synthesis specialist.",
  },
  {
    name: "image-agent",
    color: "#fb7185",
    systemPrompt:
      "You are image-agent, a visual prompt and media generation specialist.",
  },
  {
    name: "qa-agent",
    color: "#22c55e",
    systemPrompt:
      "You are qa-agent, a testing and quality assurance specialist.",
  },
];

const MEMORIES = [
  {
    agentName: "design-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["design-agent"],
    linkedSkillNames: ["generate_ad_copy", "brand_message", "social_caption"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/design-agent-agent-scope",
    content:
      "design-agent focuses on copywriting, captions, promotional copy, branding, slogans, headlines, CTA copy, and campaign wording. design-agent should not handle coding, debugging, database tasks, or image generation.",
  },
  {
    agentName: "design-agent",
    type: "brand_tone",
    scope: "skill",
    allowedAgents: ["design-agent", "writer-agent"],
    linkedSkillNames: ["generate_ad_copy", "brand_message", "social_caption"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/brand-tone",
    content:
      "Preferred creative tone: concise, practical, friendly, modern, clear, and suitable for Indonesian social media or WhatsApp marketing copy.",
  },
  {
    agentName: "code-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["code-agent"],
    linkedSkillNames: ["technical_debugging", "implementation_planning"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/code-agent-agent-scope",
    content:
      "code-agent focuses on TypeScript, Node.js, Express, Prisma, React, Vite, API routes, debugging, implementation planning, refactoring, and technical architecture.",
  },
  {
    agentName: "code-agent",
    type: "project_context",
    scope: "project",
    allowedAgents: ["code-agent", "research-agent", "qa-agent"],
    linkedSkillNames: [
      "technical_debugging",
      "implementation_planning",
      "source_research_summary",
      "qa_test_plan",
      "regression_checklist"
    ],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "internal",
    sourceType: "seed",
    sourceRef: "memory-foundation/project-context",
    content:
      "The Personal Multi-Agent System is a local-first AI agent platform with Express backend, Prisma SQLite database, React/Vite dashboard, Socket.io realtime events, WhatsApp runtime integration, dynamic LLM provider registry, and agent governance.",
  },
  {
    agentName: "research-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["research-agent"],
    linkedSkillNames: ["source_research_summary", "comparison_brief"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/research-agent-agent-scope",
    content:
      "research-agent focuses on source gathering, comparison, trend analysis, technical research, structured findings, and decision support. research-agent should not directly implement code unless paired with code-agent.",
  },
  {
    agentName: "writer-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["writer-agent"],
    linkedSkillNames: ["long_form_draft", "rewrite_and_summarize"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/writer-agent-agent-scope",
    content:
      "writer-agent focuses on articles, summaries, documentation drafts, emails, rewriting, paraphrasing, proposals, and structured long-form content.",
  },
  {
    agentName: "image-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["image-agent"],
    linkedSkillNames: ["visual_prompt_design", "media_generation_planning"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/image-agent-agent-scope",
    content:
      "image-agent focuses on image prompts, visual direction, isometric concepts, 3D render prompts, poster concepts, thumbnail concepts, and future media generation workflows.",
  },
  {
    agentName: "qa-agent",
    type: "agent_scope",
    scope: "agent",
    allowedAgents: ["qa-agent"],
    linkedSkillNames: ["qa_test_plan", "regression_checklist"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "normal",
    sourceType: "seed",
    sourceRef: "memory-foundation/qa-agent-agent-scope",
    content:
      "qa-agent focuses on QA checklist, regression testing, smoke testing, acceptance criteria, validation, test scenarios, and bug reproduction steps.",
  },
  {
    agentName: "qa-agent",
    type: "regression_policy",
    scope: "project",
    allowedAgents: ["qa-agent", "code-agent"],
    linkedSkillNames: ["qa_test_plan", "regression_checklist", "implementation_planning"],
    runtimeInjectable: true,
    ragEnabled: false,
    sensitivityLevel: "internal",
    sourceType: "seed",
    sourceRef: "memory-foundation/regression-policy",
    content:
      "When adding or modifying features, stable flows must be protected: Overview, Agent Office, Settings, provider registry, runtime adapter, Widget, WhatsApp, governance guard, Skills page, and Memory Vault should not regress.",
  },
];

function stringifyJson(value) {
  return JSON.stringify(value || []);
}

async function upsertAgent(agentSeed) {
  const existingAgent = await prisma.agent.findUnique({
    where: {
      name: agentSeed.name,
    },
  });

  if (existingAgent) {
    return prisma.agent.update({
      where: {
        id: existingAgent.id,
      },
      data: {
        systemPrompt: existingAgent.systemPrompt || agentSeed.systemPrompt,
        color: existingAgent.color || agentSeed.color,
      },
    });
  }

  return prisma.agent.create({
    data: {
      name: agentSeed.name,
      systemPrompt: agentSeed.systemPrompt,
      color: agentSeed.color,
      status: "idle",
    },
  });
}

async function upsertMemory(memorySeed) {
  const agent = await prisma.agent.findUnique({
    where: {
      name: memorySeed.agentName,
    },
  });

  if (!agent) {
    throw new Error(`Agent "${memorySeed.agentName}" not found.`);
  }

  const existingMemory = await prisma.memory.findFirst({
    where: {
      agentId: agent.id,
      type: memorySeed.type,
      content: memorySeed.content,
    },
  });

  const data = {
    agentId: agent.id,
    type: memorySeed.type,
    content: memorySeed.content,

    scope: memorySeed.scope || "agent",
    ownerAgentName: memorySeed.agentName,
    allowedAgentsJson: stringifyJson(memorySeed.allowedAgents || [memorySeed.agentName]),
    linkedSkillNamesJson: stringifyJson(memorySeed.linkedSkillNames || []),
    runtimeInjectable: Boolean(memorySeed.runtimeInjectable),
    ragEnabled: Boolean(memorySeed.ragEnabled),
    sensitivityLevel: memorySeed.sensitivityLevel || "normal",
    sourceType: memorySeed.sourceType || "seed",
    sourceRef: memorySeed.sourceRef || null,
  };

  if (existingMemory) {
    return prisma.memory.update({
      where: {
        id: existingMemory.id,
      },
      data,
    });
  }

  return prisma.memory.create({
    data,
  });
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" SEED MEMORY VAULT FOUNDATION");
  console.log("===============================================");
  console.log("");

  for (const agent of AGENTS) {
    const result = await upsertAgent(agent);
    console.log(`[AGENT] ${result.name}`);
  }

  console.log("");

  for (const memory of MEMORIES) {
    const result = await upsertMemory(memory);
    console.log(
      `[MEMORY] ${memory.agentName} -> ${memory.type} -> ${memory.scope} -> ${result.id}`
    );
  }

  console.log("");
  console.log(`[OK] Seeded ${MEMORIES.length} memory foundation records.`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to seed memory vault foundation:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });