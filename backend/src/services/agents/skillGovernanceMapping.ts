import { findSkillsByAgentName } from "../../repositories/skillRepository";

export type SkillGovernanceMatch = {
  skillId: string;
  skillName: string;
  matchedSignals: string[];
};

type SkillLike = {
  id: string;
  name: string;
  description?: string | null;
  content?: string | null;
};

const curatedSkillSignals: Record<string, string[]> = {
  generate_ad_copy: [
    "promosi",
    "kalimat promosi",
    "caption",
    "iklan",
    "ad copy",
    "copywriting",
    "headline",
    "tagline",
    "slogan",
    "cta",
    "call to action",
    "campaign",
    "kampanye",
    "produk",
    "jualan",
    "marketing",
    "naskah iklan",
  ],

  brand_message: [
    "brand",
    "branding",
    "brand message",
    "value proposition",
    "positioning",
    "brand positioning",
    "messaging",
    "benefit",
    "angle promosi",
    "messaging pillar",
  ],

  social_caption: [
    "caption",
    "instagram",
    "tiktok",
    "social media",
    "konten",
    "broadcast",
    "whatsapp broadcast",
    "hook",
    "post",
    "caption instagram",
  ],

  long_form_draft: [
    "artikel",
    "article",
    "blog",
    "proposal",
    "script",
    "documentation",
    "dokumentasi",
    "draft",
    "narasi",
    "long form",
  ],

  rewrite_and_summarize: [
    "ringkas",
    "summary",
    "summarize",
    "rewrite",
    "paraphrase",
    "rapikan",
    "perbaiki kalimat",
    "buat lebih jelas",
    "buat lebih profesional",
  ],

  technical_debugging: [
    "debug",
    "error",
    "bug",
    "typescript",
    "npm",
    "vite",
    "node",
    "express",
    "prisma",
    "migration",
    "database",
    "api",
    "route",
    "stack trace",
    "compile",
    "runtime error",
  ],

  implementation_planning: [
    "implementasi",
    "implementation",
    "planning",
    "rancang",
    "arsitektur",
    "architecture",
    "refactor",
    "file apa saja",
    "phase",
    "roadmap",
    "integrasi",
    "api design",
  ],

  source_research_summary: [
    "research",
    "riset",
    "cari info",
    "cari data",
    "referensi",
    "sumber",
    "latest",
    "terbaru",
    "summary",
    "analisis",
    "trend",
    "market research",
  ],

  comparison_brief: [
    "bandingkan",
    "compare",
    "comparison",
    "pros cons",
    "pro kontra",
    "tradeoff",
    "decision matrix",
    "mana lebih cocok",
    "rekomendasi opsi",
  ],

  visual_prompt_design: [
    "gambar",
    "image",
    "generate gambar",
    "prompt gambar",
    "visual",
    "ilustrasi",
    "illustration",
    "render",
    "3d",
    "isometric",
    "vehicle",
    "poster",
    "thumbnail",
    "style visual",
    "komposisi",
  ],

  media_generation_planning: [
    "media generation",
    "generate image",
    "generate video",
    "fal.ai",
    "video",
    "thumbnail",
    "asset generation",
    "visual asset",
    "image model",
    "workflow generate",
  ],

  qa_test_plan: [
    "test plan",
    "qa",
    "testing",
    "checklist",
    "acceptance criteria",
    "validasi",
    "test case",
    "skenario test",
    "edge case",
  ],

  regression_checklist: [
    "regression",
    "regression checklist",
    "smoke test",
    "qa sweep",
    "jangan rusak",
    "validasi ulang",
    "stable flow",
    "release readiness",
  ],
};

const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dari",
  "ini",
  "itu",
  "pada",
  "ke",
  "di",
  "a",
  "an",
  "to",
  "of",
  "in",
  "is",
  "are",
]);

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

function normalizeText(inputText: string) {
  return removeLeadingAgentMention(inputText)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isShortSignal(signal: string) {
  return signal.trim().length <= 3;
}

function signalMatches(inputText: string, signal: string) {
  const normalizedInput = normalizeText(inputText);
  const normalizedSignal = signal.toLowerCase().trim();

  if (!normalizedSignal) {
    return false;
  }

  if (isShortSignal(normalizedSignal)) {
    const signalPattern = new RegExp(
      `(^|\\s)${escapeRegExp(normalizedSignal)}($|\\s)`,
      "i"
    );

    return signalPattern.test(normalizedInput);
  }

  return normalizedInput.includes(normalizedSignal);
}

function extractSectionLines(content: string, sectionTitle: string) {
  const lines = content.split("\n");
  const result: string[] = [];

  let isCollecting = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.toLowerCase().startsWith("## ")) {
      if (isCollecting) {
        break;
      }

      isCollecting = trimmedLine
        .toLowerCase()
        .includes(sectionTitle.toLowerCase());

      continue;
    }

    if (isCollecting && trimmedLine) {
      result.push(trimmedLine);
    }
  }

  return result;
}

function cleanSignalLine(line: string) {
  return line
    .replace(/^[-*•]\s*/, "")
    .replace(/^["“”]+/, "")
    .replace(/["“”]+$/, "")
    .replace(/^`+/, "")
    .replace(/`+$/, "")
    .trim();
}

function extractSignalsFromText(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map(cleanSignalLine)
    .filter((item) => item.length >= 4)
    .filter((item) => !stopwords.has(item.toLowerCase()));
}

function extractTokenSignals(value?: string | null) {
  if (!value) {
    return [];
  }

  return normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 5)
    .filter((item) => !stopwords.has(item));
}

function getSignalsForSkill(skill: SkillLike) {
  const content = skill.content || "";

  const allowedIntentLines = extractSectionLines(
    content,
    "Allowed Intent Examples"
  );

  const bestForLines = extractSectionLines(content, "Best For");

  const curatedSignals = curatedSkillSignals[skill.name] || [];

  const generatedSignals = [
    ...curatedSignals,
    skill.name.replace(/[_-]/g, " "),
    ...extractSignalsFromText(skill.description),
    ...extractSignalsFromText(allowedIntentLines.join("\n")),
    ...extractSignalsFromText(bestForLines.join("\n")),
    ...extractTokenSignals(skill.name.replace(/[_-]/g, " ")),
  ];

  return Array.from(
    new Set(
      generatedSignals
        .map((signal) => signal.toLowerCase().trim())
        .filter(Boolean)
        .filter((signal) => signal.length >= 3)
    )
  );
}

export async function findSkillGovernanceMatches(input: {
  agentName: string;
  inputText: string;
}): Promise<SkillGovernanceMatch[]> {
  const skills = await findSkillsByAgentName(input.agentName);

  return skills
    .map((skill) => {
      const signals = getSignalsForSkill(skill);
      const matchedSignals = signals.filter((signal) =>
        signalMatches(input.inputText, signal)
      );

      return {
        skillId: skill.id,
        skillName: skill.name,
        matchedSignals,
      };
    })
    .filter((match) => match.matchedSignals.length > 0);
}

export function flattenSkillMatchNames(matches: SkillGovernanceMatch[]) {
  return Array.from(new Set(matches.map((match) => match.skillName)));
}

export function flattenSkillMatchSignals(matches: SkillGovernanceMatch[]) {
  return Array.from(
    new Set(matches.flatMap((match) => match.matchedSignals))
  );
}