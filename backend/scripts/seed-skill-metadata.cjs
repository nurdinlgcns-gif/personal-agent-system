const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const AGENTS = [
  {
    name: "design-agent",
    color: "#60a5fa",
    systemPrompt:
      "You are design-agent, a creative marketing and copywriting specialist focused on captions, ad copy, branding, slogans, campaign wording, and promotional text.",
  },
  {
    name: "writer-agent",
    color: "#a78bfa",
    systemPrompt:
      "You are writer-agent, a structured writing specialist focused on articles, summaries, documentation drafts, emails, rewriting, and content structure.",
  },
  {
    name: "code-agent",
    color: "#34d399",
    systemPrompt:
      "You are code-agent, a software engineering specialist focused on debugging, implementation planning, refactoring, backend, frontend, Prisma, TypeScript, and architecture.",
  },
  {
    name: "research-agent",
    color: "#f59e0b",
    systemPrompt:
      "You are research-agent, a research and information synthesis specialist focused on gathering sources, comparison, analysis, and structured findings.",
  },
  {
    name: "image-agent",
    color: "#fb7185",
    systemPrompt:
      "You are image-agent, a visual and media generation specialist focused on image prompts, visual concepts, style direction, composition, and media generation planning.",
  },
  {
    name: "qa-agent",
    color: "#22c55e",
    systemPrompt:
      "You are qa-agent, a testing and quality assurance specialist focused on test planning, QA checklist, validation, regression testing, and bug reproduction.",
  },
];

const SKILLS = [
  {
    agentName: "design-agent",
    name: "generate_ad_copy",
    description:
      "Creates short promotional copy, ad copy, product messaging, captions, headlines, slogans, and campaign wording.",
    filePath: "skills/design-agent/generate_ad_copy.md",
    content: `
# Skill: generate_ad_copy

## Owner Agent
design-agent

## Purpose
Generate short, practical, and brand-ready promotional copy.

## Best For
- Product promotion
- Social media captions
- Short campaign copy
- Headlines
- Taglines
- CTA copy
- One-sentence promotions
- Launch messages
- Ad copy variations

## Allowed Intent Examples
- "buatkan satu kalimat promosi untuk kopi susu"
- "buat caption Instagram untuk produk skincare"
- "buat headline iklan untuk kelas AI"
- "buat tagline singkat untuk brand lokal"
- "buat 5 opsi CTA untuk landing page"

## Input Contract
The user should provide:
- Product or service name
- Desired tone, if any
- Target audience, if any
- Output format, if any

## Output Contract
The output should be:
- Short
- Direct
- Useful for marketing
- Free from internal reasoning
- Aligned with requested format

## Boundary Notes
This skill does not generate images, debug code, perform legal advice, medical advice, financial advice, or technical troubleshooting.

## Future RAG Use
This skill can use brand tone memory, approved copy examples, product catalog notes, and previous campaign references.
`.trim(),
  },
  {
    agentName: "design-agent",
    name: "brand_message",
    description:
      "Helps create brand positioning, value proposition, product benefits, and messaging angles.",
    filePath: "skills/design-agent/brand_message.md",
    content: `
# Skill: brand_message

## Owner Agent
design-agent

## Purpose
Create clear brand messaging, value proposition, and positioning statements.

## Best For
- Brand positioning
- Value proposition
- Product benefit framing
- Messaging pillars
- Campaign angle
- Brand tone exploration

## Allowed Intent Examples
- "buat value proposition untuk produk kopi susu"
- "buat brand positioning untuk channel AI"
- "buat 3 angle promosi untuk produk lokal"
- "buat messaging pillar untuk SaaS dashboard"

## Output Contract
The output should be structured, concise, and actionable.

## Boundary Notes
This skill focuses on marketing and brand messaging. Technical implementation and image generation should be routed to other agents.

## Future RAG Use
This skill can retrieve brand tone memory, product positioning docs, audience profile notes, and competitor messaging references.
`.trim(),
  },
  {
    agentName: "design-agent",
    name: "social_caption",
    description:
      "Creates social media captions and short content ideas for Instagram, TikTok, WhatsApp broadcast, and marketing posts.",
    filePath: "skills/design-agent/social_caption.md",
    content: `
# Skill: social_caption

## Owner Agent
design-agent

## Purpose
Generate platform-ready captions and short post ideas.

## Best For
- Instagram captions
- TikTok captions
- WhatsApp broadcast copy
- Short product captions
- Content hooks
- Social post variations

## Allowed Intent Examples
- "buatkan caption Instagram untuk kopi susu"
- "buat caption TikTok singkat untuk promo buah"
- "buat broadcast WhatsApp untuk diskon produk"
- "buat 5 hook konten untuk brand AI"

## Output Contract
The output should be concise, readable, and platform-appropriate.

## Boundary Notes
This skill should not answer technical debugging or image generation requests.

## Future RAG Use
This skill can use previous caption examples, brand tone memory, product catalog, and campaign calendar.
`.trim(),
  },
  {
    agentName: "writer-agent",
    name: "long_form_draft",
    description:
      "Creates structured long-form writing such as articles, documentation drafts, proposals, and scripts.",
    filePath: "skills/writer-agent/long_form_draft.md",
    content: `
# Skill: long_form_draft

## Owner Agent
writer-agent

## Purpose
Produce structured long-form written content.

## Best For
- Articles
- Blog posts
- Documentation drafts
- Proposals
- Scripts
- Explainers
- Structured notes

## Allowed Intent Examples
- "buat artikel tentang manfaat AI untuk UMKM"
- "buat draft dokumentasi checkpoint project"
- "buat proposal singkat untuk automation system"
- "buat script video pendek tentang AI tools"

## Output Contract
The output should be structured with headings, clear flow, and practical language.

## Boundary Notes
This skill should not debug code or provide legal, medical, or financial advice.

## Future RAG Use
This skill can retrieve PRD docs, checkpoint docs, writing style memory, and user preference memory.
`.trim(),
  },
  {
    agentName: "writer-agent",
    name: "rewrite_and_summarize",
    description:
      "Rewrites, summarizes, clarifies, and restructures user-provided text.",
    filePath: "skills/writer-agent/rewrite_and_summarize.md",
    content: `
# Skill: rewrite_and_summarize

## Owner Agent
writer-agent

## Purpose
Rewrite, summarize, and clarify provided text.

## Best For
- Summarizing long text
- Rewriting messages
- Making text clearer
- Translating tone
- Structuring rough notes
- Simplifying explanations

## Allowed Intent Examples
- "ringkas text ini"
- "rapikan kalimat ini"
- "buat lebih profesional"
- "buat versi singkat dan jelas"
- "ubah jadi bahasa Inggris natural"

## Output Contract
The output should preserve meaning while improving clarity and readability.

## Boundary Notes
This skill works with text transformation, not code execution or domain-specific professional advice.

## Future RAG Use
This skill can use user tone preferences and writing style memory.
`.trim(),
  },
  {
    agentName: "code-agent",
    name: "technical_debugging",
    description:
      "Investigates software errors, TypeScript issues, backend problems, Prisma problems, API issues, and runtime failures.",
    filePath: "skills/code-agent/technical_debugging.md",
    content: `
# Skill: technical_debugging

## Owner Agent
code-agent

## Purpose
Diagnose and resolve software implementation errors.

## Best For
- TypeScript errors
- Runtime errors
- Prisma issues
- Backend route errors
- React component errors
- API problems
- Build errors
- npm/Vite issues

## Allowed Intent Examples
- "debug error Prisma migration"
- "kenapa npm run dev error"
- "fix TypeScript error ini"
- "cek kenapa route API gagal"
- "bantu analisa stack trace"

## Input Contract
The user should provide:
- Error message
- Related file path
- Current code snippet
- Expected behavior

## Output Contract
The output should include:
- Root cause
- Step-by-step fix
- Full code when requested
- Safety notes if needed

## Boundary Notes
This skill should not generate marketing copy or image prompts unless explicitly related to UI implementation.

## Future RAG Use
This skill can retrieve project architecture, known bugs, Prisma schema, route docs, and previous fixes.
`.trim(),
  },
  {
    agentName: "code-agent",
    name: "implementation_planning",
    description:
      "Plans implementation steps, file changes, architecture decisions, and refactoring strategy.",
    filePath: "skills/code-agent/implementation_planning.md",
    content: `
# Skill: implementation_planning

## Owner Agent
code-agent

## Purpose
Plan safe and maintainable software implementation.

## Best For
- Feature implementation planning
- Backend/frontend architecture
- Refactoring strategy
- File-by-file implementation
- API design
- Database schema planning
- Integration roadmap

## Allowed Intent Examples
- "rancang fase implementasi berikutnya"
- "buat plan untuk integrate WhatsApp runtime"
- "susun file apa saja yang harus diubah"
- "review arsitektur fitur ini"

## Output Contract
The output should be actionable, phased, and low-risk.

## Boundary Notes
This skill should not perform creative marketing tasks unless related to product UX copy.

## Future RAG Use
This skill can retrieve PRD, project roadmap, architecture docs, and commit checkpoints.
`.trim(),
  },
  {
    agentName: "research-agent",
    name: "source_research_summary",
    description:
      "Gathers, compares, and summarizes information into structured findings.",
    filePath: "skills/research-agent/source_research_summary.md",
    content: `
# Skill: source_research_summary

## Owner Agent
research-agent

## Purpose
Research topics and turn findings into structured summaries.

## Best For
- Source gathering
- Topic research
- Market research
- Technology comparison
- Documentation research
- Trend analysis

## Allowed Intent Examples
- "riset tools RAG lokal"
- "bandingkan vector database untuk local-first app"
- "cari referensi tentang embedding"
- "ringkas dokumentasi teknologi ini"

## Output Contract
The output should include:
- Summary
- Key findings
- Tradeoffs
- Recommendations
- Sources if web research is used

## Boundary Notes
This skill should not implement code directly unless paired with code-agent.

## Future RAG Use
This skill can retrieve saved research notes, source summaries, and project decision logs.
`.trim(),
  },
  {
    agentName: "research-agent",
    name: "comparison_brief",
    description:
      "Creates comparison briefs, pros/cons, tradeoff analysis, and decision support notes.",
    filePath: "skills/research-agent/comparison_brief.md",
    content: `
# Skill: comparison_brief

## Owner Agent
research-agent

## Purpose
Compare options and provide structured decision support.

## Best For
- Tools comparison
- Architecture tradeoffs
- Provider comparison
- Technology selection
- Pros and cons
- Roadmap decision support

## Allowed Intent Examples
- "bandingkan Chroma vs Qdrant"
- "mana lebih cocok untuk local-first RAG"
- "analisa opsi next phase project"
- "buat decision matrix sederhana"

## Output Contract
The output should include concise comparison, recommendation, and next action.

## Boundary Notes
This skill supports decisions but should not provide professional legal, medical, or financial advice.

## Future RAG Use
This skill can retrieve previous decision logs and project constraints.
`.trim(),
  },
  {
    agentName: "image-agent",
    name: "visual_prompt_design",
    description:
      "Creates high-quality image generation prompts, visual direction, style prompts, and composition briefs.",
    filePath: "skills/image-agent/visual_prompt_design.md",
    content: `
# Skill: visual_prompt_design

## Owner Agent
image-agent

## Purpose
Create visual prompts and direction for image or media generation.

## Best For
- Image generation prompts
- Isometric visuals
- Poster concepts
- Thumbnail prompts
- 3D render prompt
- Style direction
- Composition guidance

## Allowed Intent Examples
- "generate prompt gambar isometric vehicle"
- "buat prompt visual poster kopi susu"
- "buat konsep thumbnail YouTube AI"
- "buat visual direction untuk office scene"

## Output Contract
The output should include a clear visual prompt, style, composition, lighting, and constraints.

## Boundary Notes
This skill handles visual direction. If actual media generation is available later, this skill can trigger media provider adapters.

## Future RAG Use
This skill can retrieve visual brand guidelines, previous prompts, style references, and media generation settings.
`.trim(),
  },
  {
    agentName: "image-agent",
    name: "media_generation_planning",
    description:
      "Plans media generation workflows for images, videos, thumbnails, and future fal.ai media integrations.",
    filePath: "skills/image-agent/media_generation_planning.md",
    content: `
# Skill: media_generation_planning

## Owner Agent
image-agent

## Purpose
Plan media generation workflow and output requirements.

## Best For
- Image generation planning
- Video concept planning
- Thumbnail generation plan
- fal.ai workflow planning
- Visual asset pipeline

## Allowed Intent Examples
- "rancang workflow generate image untuk dashboard"
- "buat konsep video pendek promosi"
- "setup asset generation plan untuk office scene"
- "buat prompt dan setting untuk image model"

## Output Contract
The output should be practical, structured, and ready for a media generation provider.

## Boundary Notes
This skill is not for backend debugging or database tasks.

## Future RAG Use
This skill can retrieve media provider settings, model presets, and prior creative asset references.
`.trim(),
  },
  {
    agentName: "qa-agent",
    name: "qa_test_plan",
    description:
      "Creates QA test plans, validation scenarios, acceptance criteria, and manual test steps.",
    filePath: "skills/qa-agent/qa_test_plan.md",
    content: `
# Skill: qa_test_plan

## Owner Agent
qa-agent

## Purpose
Create test plans and validation steps for features.

## Best For
- QA checklist
- Test scenarios
- Acceptance criteria
- Regression test plan
- Manual validation
- Edge cases

## Allowed Intent Examples
- "buat test plan untuk fitur governance UI"
- "buat checklist QA WhatsApp runtime"
- "buat acceptance criteria untuk Skills page"
- "validasi step testing fitur ini"

## Output Contract
The output should include:
- Test cases
- Expected results
- Edge cases
- Regression notes

## Boundary Notes
This skill plans and validates. It does not implement features directly.

## Future RAG Use
This skill can retrieve previous QA reports, feature specs, and bug history.
`.trim(),
  },
  {
    agentName: "qa-agent",
    name: "regression_checklist",
    description:
      "Creates regression checklist to ensure existing stable flows do not break after changes.",
    filePath: "skills/qa-agent/regression_checklist.md",
    content: `
# Skill: regression_checklist

## Owner Agent
qa-agent

## Purpose
Protect stable flows from regressions after feature changes.

## Best For
- Regression checklist
- Before/after validation
- Stable flow protection
- Release readiness
- Smoke testing

## Allowed Intent Examples
- "buat regression checklist setelah patch governance"
- "cek flow yang jangan sampai rusak"
- "buat smoke test untuk dashboard"
- "buat QA sweep untuk office scene"

## Output Contract
The output should be concise, checklist-based, and focused on risk reduction.

## Boundary Notes
This skill does not replace code-agent for debugging implementation errors.

## Future RAG Use
This skill can retrieve previous QA reports, passed/failed test history, and stable flow documentation.
`.trim(),
  },
];

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

async function upsertSkill(skillSeed) {
  const agent = await prisma.agent.findUnique({
    where: {
      name: skillSeed.agentName,
    },
  });

  if (!agent) {
    throw new Error(`Agent "${skillSeed.agentName}" not found.`);
  }

  const existingSkill = await prisma.skill.findFirst({
    where: {
      agentId: agent.id,
      name: skillSeed.name,
    },
  });

  const data = {
    agentId: agent.id,
    name: skillSeed.name,
    description: skillSeed.description,
    filePath: skillSeed.filePath,
    content: skillSeed.content,
  };

  if (existingSkill) {
    return prisma.skill.update({
      where: {
        id: existingSkill.id,
      },
      data,
    });
  }

  return prisma.skill.create({
    data,
  });
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" SEED SKILL METADATA FOUNDATION");
  console.log("===============================================");
  console.log("");

  for (const agent of AGENTS) {
    const result = await upsertAgent(agent);
    console.log(`[AGENT] ${result.name}`);
  }

  console.log("");

  for (const skill of SKILLS) {
    const result = await upsertSkill(skill);
    console.log(`[SKILL] ${skill.agentName} -> ${result.name}`);
  }

  console.log("");
  console.log(`[OK] Seeded ${SKILLS.length} skills.`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to seed skill metadata foundation:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });