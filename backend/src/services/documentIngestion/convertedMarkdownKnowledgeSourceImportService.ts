import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

import {
  ConvertedMarkdownImportRequest,
  ConvertedMarkdownImportResult,
} from "./documentIngestionTypes";

const globalForDocumentIngestionPrisma = globalThis as unknown as {
  documentIngestionPrisma?: PrismaClient;
};

const prisma =
  globalForDocumentIngestionPrisma.documentIngestionPrisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDocumentIngestionPrisma.documentIngestionPrisma = prisma;
}

function normalizeWhitespace(value: string) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function safePreview(content: string, maxChars = 4000) {
  if (content.length <= maxChars) {
    return content;
  }

  return `${content.slice(0, maxChars).trim()}\n\n...`;
}

function hashContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function parseFrontmatter(markdown: string) {
  const result: Record<string, string> = {};
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);

  if (!match?.[1]) {
    return result;
  }

  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function parseStatusFromMarkdown(markdown: string) {
  const frontmatter = parseFrontmatter(markdown);

  return frontmatter.status || "needs_review";
}

function parseSourceFromMarkdown(markdown: string) {
  const frontmatter = parseFrontmatter(markdown);

  return frontmatter.source || "";
}

function parseConversionNotes(markdown: string) {
  const notesHeaderIndex = markdown.indexOf("## Conversion Notes");

  if (notesHeaderIndex < 0) {
    return [];
  }

  const notesSection = markdown.slice(notesHeaderIndex);
  const lines = notesSection.split(/\r?\n/);
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      warnings.push(trimmed.replace(/^- /, "").trim());
    }
  }

  return warnings;
}

function extractTitleFromMarkdown(markdown: string, fallbackTitle: string) {
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      return normalizeWhitespace(trimmed.replace(/^#\s+/, ""));
    }
  }

  return fallbackTitle;
}

function toJsonArray(value: unknown) {
  if (!Array.isArray(value)) {
    return "[]";
  }

  return JSON.stringify(
    value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
}

function getRelativePathSafe(filePath: string) {
  try {
    return path.relative(process.cwd(), filePath);
  } catch {
    return filePath;
  }
}

function validateMarkdownPath(markdownPath: string) {
  if (!markdownPath || typeof markdownPath !== "string") {
    throw new Error("markdownPath wajib diisi dan harus berupa string.");
  }

  const resolvedMarkdownPath = path.resolve(markdownPath);

  if (!fs.existsSync(resolvedMarkdownPath)) {
    throw new Error(`Markdown file tidak ditemukan: ${resolvedMarkdownPath}`);
  }

  const stat = fs.statSync(resolvedMarkdownPath);

  if (!stat.isFile()) {
    throw new Error(`markdownPath harus mengarah ke file: ${resolvedMarkdownPath}`);
  }

  if (path.extname(resolvedMarkdownPath).toLowerCase() !== ".md") {
    throw new Error(`markdownPath harus file .md: ${resolvedMarkdownPath}`);
  }

  return resolvedMarkdownPath;
}

function buildSourceRef(input: {
  requestSourceRef?: string;
  markdownPath: string;
  originalInputPath?: string;
  markdownSource?: string;
}) {
  if (input.requestSourceRef) {
    return input.requestSourceRef;
  }

  if (input.originalInputPath) {
    return path.resolve(input.originalInputPath);
  }

  if (input.markdownSource) {
    return input.markdownSource;
  }

  return input.markdownPath;
}

export async function importConvertedMarkdownToKnowledgeSource(
  request: ConvertedMarkdownImportRequest
): Promise<ConvertedMarkdownImportResult> {
  const markdownPath = validateMarkdownPath(request.markdownPath);
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const markdownChars = markdown.length;
  const markdownHash = hashContent(markdown);
  const markdownSource = parseSourceFromMarkdown(markdown);
  const status = parseStatusFromMarkdown(markdown);
  const warnings = parseConversionNotes(markdown);

  const agentName = normalizeWhitespace(request.agentName || "design-agent");
  const scope = normalizeWhitespace(request.scope || "agent");
  const memoryType = normalizeWhitespace(request.memoryType || "knowledge_source");
  const sensitivityLevel = normalizeWhitespace(
    request.sensitivityLevel || "normal"
  );
  const sourceMode = normalizeWhitespace(
    request.sourceMode || "converted_document"
  );

  const sourceRef = buildSourceRef({
    requestSourceRef: request.sourceRef,
    markdownPath,
    originalInputPath: request.originalInputPath,
    markdownSource,
  });

  const fallbackTitle = path.basename(markdownPath, path.extname(markdownPath));
  const title = normalizeWhitespace(
    request.title || extractTitleFromMarkdown(markdown, fallbackTitle)
  );

  try {
    const agent = await prisma.agent.findUnique({
      where: {
        name: agentName,
      },
    });

    if (!agent) {
      throw new Error(`Agent tidak ditemukan: ${agentName}`);
    }

    const previousMemory = await prisma.memory.findFirst({
      where: {
        agentId: agent.id,
        sourceRef,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const previousContent = previousMemory?.content || null;
    const previousContentHash = previousContent
      ? hashContent(previousContent)
      : null;

    const action = previousMemory
      ? "reimport_converted_document"
      : "import_converted_document";

    const allowedAgentsJson = toJsonArray(request.allowedAgents);
    const linkedSkillNamesJson = toJsonArray(request.linkedSkillNames);

    const memory = await prisma.memory.create({
      data: {
        agentId: agent.id,
        content: markdown,
        type: memoryType,
        scope,
        ownerAgentName: agentName,
        allowedAgentsJson,
        linkedSkillNamesJson,
        runtimeInjectable: false,
        ragEnabled: false,
        sensitivityLevel,
        sourceType: sourceMode,
        sourceRef,
      },
    });

    const importHistory = await prisma.knowledgeSourceImportHistory.create({
      data: {
        memoryId: memory.id,
        title,
        sourceRef,
        agentName,
        scope,
        action,

        previousContent,
        nextContent: markdown,
        previousContentHash,
        nextContentHash: markdownHash,
        previousContentChars: previousContent?.length || 0,
        nextContentChars: markdownChars,

        allowedAgentsJson,
        linkedSkillNamesJson,
        sensitivityLevel,
        sourceMode,
        fileRelativePath: getRelativePathSafe(markdownPath),
      },
    });

    return {
      ok: true,
      memoryId: memory.id,
      importHistoryId: importHistory.id,
      title,
      agentName,
      scope,
      sourceRef,
      markdownPath,
      markdownChars,
      markdownPreview: safePreview(markdown),
      status,
      action,
      ragEnabled: false,
      runtimeInjectable: false,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      memoryId: null,
      importHistoryId: null,
      title,
      agentName,
      scope,
      sourceRef,
      markdownPath,
      markdownChars,
      markdownPreview: safePreview(markdown),
      status,
      action: "failed_import_converted_document",
      ragEnabled: false,
      runtimeInjectable: false,
      warnings,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}