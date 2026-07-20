import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../../db/prisma";

export type KnowledgeSourceImportInput = {
  title: string;
  content?: string;
  fileRelativePath?: string;
  agentName: string;
  scope?: string;
  ownerAgentName?: string | null;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  sensitivityLevel?: string;
  sourceRef?: string;
};

export type KnowledgeSourceImportAction = "created" | "updated" | "skipped";

export type KnowledgeSourceImportResult = {
  imported: boolean;
  memoryId?: string;
  title: string;
  sourceRef: string;
  agentName: string;
  scope: string;
  contentChars: number;
  action: KnowledgeSourceImportAction;
  historyId?: string;
  reason?: string;
};

export type KnowledgeSourceFileItem = {
  relativePath: string;
  fileName: string;
  extension: string;
  size: number;
};

export type KnowledgeSourceFolderImportResult = {
  processedFileCount: number;
  importedCount: number;
  skippedCount: number;
  results: KnowledgeSourceImportResult[];
};

export type KnowledgeSourceImportHistoryItem = {
  id: string;
  memoryId?: string | null;
  title: string;
  sourceRef: string;
  agentName: string;
  scope: string;
  action: string;
  previousContentHash?: string | null;
  nextContentHash: string;
  previousContentChars: number;
  nextContentChars: number;
  allowedAgents: string[];
  linkedSkillNames: string[];
  sensitivityLevel: string;
  sourceMode: string;
  fileRelativePath?: string | null;
  createdAt: Date;
};

export type KnowledgeSourceImportHistoryDetail =
  KnowledgeSourceImportHistoryItem & {
    previousContent?: string | null;
    nextContent: string;
  };

export type KnowledgeSourceDiffLine = {
  type: "added" | "removed" | "unchanged";
  lineNumberBefore?: number;
  lineNumberAfter?: number;
  text: string;
};

export type KnowledgeSourceDiffResult = {
  historyId: string;
  title: string;
  sourceRef: string;
  action: string;
  previousContentHash?: string | null;
  nextContentHash: string;
  previousContentChars: number;
  nextContentChars: number;
  addedLineCount: number;
  removedLineCount: number;
  unchangedLineCount: number;
  lines: KnowledgeSourceDiffLine[];
};

export type KnowledgeSourceRollbackResult = {
  rolledBack: boolean;
  memoryId?: string;
  historyId: string;
  rollbackHistoryId?: string;
  sourceRef: string;
  title: string;
  target: "previous" | "next";
  previousContentChars: number;
  nextContentChars: number;
  reason?: string;
};

const KNOWLEDGE_SOURCE_DIR = path.join(process.cwd(), "knowledge-sources");
const SUPPORTED_EXTENSIONS = new Set([".md", ".txt"]);

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeLineContent(value: string) {
  return value.replace(/\r/g, "").split("\n");
}

function sanitizeTitle(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashContent(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeJsonParse<TValue>(value: string | null | undefined, fallback: TValue) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function ensureKnowledgeSourceDir() {
  if (!fs.existsSync(KNOWLEDGE_SOURCE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_SOURCE_DIR, {
      recursive: true,
    });
  }
}

function resolveSafeKnowledgePath(relativePath: string) {
  ensureKnowledgeSourceDir();

  const normalizedRelativePath = relativePath.replace(/\\/g, "/");
  const resolvedPath = path.resolve(KNOWLEDGE_SOURCE_DIR, normalizedRelativePath);

  if (!resolvedPath.startsWith(path.resolve(KNOWLEDGE_SOURCE_DIR))) {
    throw new Error("Invalid knowledge source path.");
  }

  return resolvedPath;
}

function readKnowledgeSourceFile(relativePath: string) {
  const filePath = resolveSafeKnowledgePath(relativePath);
  const extension = path.extname(filePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported knowledge source file type. Use .md or .txt.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Knowledge source file not found: ${relativePath}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error(`Knowledge source path is not a file: ${relativePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function walkKnowledgeSourceFiles(currentDir: string, baseDir: string) {
  const items: KnowledgeSourceFileItem[] = [];

  if (!fs.existsSync(currentDir)) {
    return items;
  }

  const entries = fs.readdirSync(currentDir, {
    withFileTypes: true,
  });

  entries.forEach((entry) => {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      items.push(...walkKnowledgeSourceFiles(absolutePath, baseDir));
      return;
    }

    if (!entry.isFile()) {
      return;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      return;
    }

    const stat = fs.statSync(absolutePath);
    const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, "/");

    items.push({
      relativePath,
      fileName: entry.name,
      extension,
      size: stat.size,
    });
  });

  return items.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
}

function buildSourceRef(input: {
  title: string;
  fileRelativePath?: string;
  sourceRef?: string;
}) {
  if (input.sourceRef?.trim()) {
    return input.sourceRef.trim();
  }

  if (input.fileRelativePath?.trim()) {
    return `knowledge-source/${input.fileRelativePath.trim().replace(/\\/g, "/")}`;
  }

  const slug = sanitizeTitle(input.title)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `knowledge-source/manual/${slug || "untitled"}`;
}

function buildKnowledgeMemoryContent(input: {
  title: string;
  content: string;
  sourceRef: string;
}) {
  return normalizeWhitespace(
    [
      `Knowledge source title: ${input.title}`,
      `Source reference: ${input.sourceRef}`,
      "",
      input.content,
    ].join("\n")
  );
}

function normalizeAllowedAgents(input: {
  scope: string;
  agentName: string;
  allowedAgents?: string[];
}) {
  if (input.allowedAgents && input.allowedAgents.length > 0) {
    return Array.from(
      new Set(input.allowedAgents.map((item) => item.trim()).filter(Boolean))
    );
  }

  if (input.scope === "project" || input.scope === "global") {
    return [];
  }

  return [input.agentName];
}

function mapHistory(history: {
  id: string;
  memoryId: string | null;
  title: string;
  sourceRef: string;
  agentName: string;
  scope: string;
  action: string;
  previousContentHash: string | null;
  nextContentHash: string;
  previousContentChars: number;
  nextContentChars: number;
  allowedAgentsJson: string;
  linkedSkillNamesJson: string;
  sensitivityLevel: string;
  sourceMode: string;
  fileRelativePath: string | null;
  createdAt: Date;
}): KnowledgeSourceImportHistoryItem {
  return {
    id: history.id,
    memoryId: history.memoryId,
    title: history.title,
    sourceRef: history.sourceRef,
    agentName: history.agentName,
    scope: history.scope,
    action: history.action,
    previousContentHash: history.previousContentHash,
    nextContentHash: history.nextContentHash,
    previousContentChars: history.previousContentChars,
    nextContentChars: history.nextContentChars,
    allowedAgents: safeJsonParse<string[]>(history.allowedAgentsJson, []),
    linkedSkillNames: safeJsonParse<string[]>(
      history.linkedSkillNamesJson,
      []
    ),
    sensitivityLevel: history.sensitivityLevel,
    sourceMode: history.sourceMode,
    fileRelativePath: history.fileRelativePath,
    createdAt: history.createdAt,
  };
}

async function createKnowledgeSourceHistory(input: {
  memoryId?: string | null;
  title: string;
  sourceRef: string;
  agentName: string;
  scope: string;
  action: "created" | "updated" | "rollback";
  previousContent?: string | null;
  nextContent: string;
  allowedAgents: string[];
  linkedSkillNames: string[];
  sensitivityLevel: string;
  sourceMode: string;
  fileRelativePath?: string | null;
}) {
  const previousContent = input.previousContent || null;
  const nextContent = input.nextContent;

  const history = await prisma.knowledgeSourceImportHistory.create({
    data: {
      memoryId: input.memoryId || null,
      title: input.title,
      sourceRef: input.sourceRef,
      agentName: input.agentName,
      scope: input.scope,
      action: input.action,

      previousContent,
      nextContent,
      previousContentHash: previousContent ? hashContent(previousContent) : null,
      nextContentHash: hashContent(nextContent),
      previousContentChars: previousContent ? previousContent.length : 0,
      nextContentChars: nextContent.length,

      allowedAgentsJson: JSON.stringify(input.allowedAgents),
      linkedSkillNamesJson: JSON.stringify(input.linkedSkillNames),
      sensitivityLevel: input.sensitivityLevel,
      sourceMode: input.sourceMode,
      fileRelativePath: input.fileRelativePath || null,
    } as never,
  });

  return history;
}

function buildLineDiff(
  previousContent: string,
  nextContent: string
): KnowledgeSourceDiffLine[] {
  const previousLines = normalizeLineContent(previousContent);
  const nextLines = normalizeLineContent(nextContent);

  const maxLength = Math.max(previousLines.length, nextLines.length);
  const lines: KnowledgeSourceDiffLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const previousLine = previousLines[index];
    const nextLine = nextLines[index];

    if (previousLine === nextLine && typeof previousLine === "string") {
      lines.push({
        type: "unchanged",
        lineNumberBefore: index + 1,
        lineNumberAfter: index + 1,
        text: previousLine,
      });
      continue;
    }

    if (typeof previousLine === "string") {
      lines.push({
        type: "removed",
        lineNumberBefore: index + 1,
        text: previousLine,
      });
    }

    if (typeof nextLine === "string") {
      lines.push({
        type: "added",
        lineNumberAfter: index + 1,
        text: nextLine,
      });
    }
  }

  return lines;
}

export async function listKnowledgeSourceFiles() {
  ensureKnowledgeSourceDir();

  return walkKnowledgeSourceFiles(KNOWLEDGE_SOURCE_DIR, KNOWLEDGE_SOURCE_DIR);
}

export async function importKnowledgeSourceToMemory(
  input: KnowledgeSourceImportInput
): Promise<KnowledgeSourceImportResult> {
  const title = sanitizeTitle(input.title);

  if (!title) {
    return {
      imported: false,
      title: input.title,
      sourceRef: input.sourceRef || "-",
      agentName: input.agentName,
      scope: input.scope || "project",
      contentChars: 0,
      action: "skipped",
      reason: "Title is required.",
    };
  }

  const agent = await prisma.agent.findUnique({
    where: {
      name: input.agentName,
    },
  });

  if (!agent) {
    return {
      imported: false,
      title,
      sourceRef: input.sourceRef || "-",
      agentName: input.agentName,
      scope: input.scope || "project",
      contentChars: 0,
      action: "skipped",
      reason: `Agent not found: ${input.agentName}`,
    };
  }

  const rawContent = input.fileRelativePath
    ? readKnowledgeSourceFile(input.fileRelativePath)
    : input.content || "";

  const content = normalizeWhitespace(rawContent);

  if (!content || content.length < 20) {
    return {
      imported: false,
      title,
      sourceRef: input.sourceRef || input.fileRelativePath || "-",
      agentName: input.agentName,
      scope: input.scope || "project",
      contentChars: content.length,
      action: "skipped",
      reason: "Knowledge source content is empty or too short.",
    };
  }

  const scope = input.scope || "project";
  const sourceRef = buildSourceRef({
    title,
    fileRelativePath: input.fileRelativePath,
    sourceRef: input.sourceRef,
  });

  const memoryContent = buildKnowledgeMemoryContent({
    title,
    content,
    sourceRef,
  });

  const allowedAgents = normalizeAllowedAgents({
    scope,
    agentName: input.agentName,
    allowedAgents: input.allowedAgents,
  });

  const linkedSkillNames = Array.from(
    new Set(
      (input.linkedSkillNames || [])
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  const memoryData = {
    agentId: agent.id,
    content: memoryContent,
    type: "knowledge_source",
    scope,
    ownerAgentName: input.ownerAgentName || input.agentName,
    allowedAgentsJson: JSON.stringify(allowedAgents),
    linkedSkillNamesJson: JSON.stringify(linkedSkillNames),
    runtimeInjectable: false,
    ragEnabled: true,
    sensitivityLevel: input.sensitivityLevel || "normal",
    sourceType: "knowledge_source",
    sourceRef,
  };

  const existingMemory = await prisma.memory.findFirst({
    where: {
      sourceType: "knowledge_source",
      sourceRef,
    },
    select: {
      id: true,
      content: true,
    },
  });

  if (existingMemory) {
    const updatedMemory = await prisma.memory.update({
      where: {
        id: existingMemory.id,
      },
      data: memoryData as never,
    });

    const history = await createKnowledgeSourceHistory({
      memoryId: updatedMemory.id,
      title,
      sourceRef,
      agentName: input.agentName,
      scope,
      action: "updated",
      previousContent: existingMemory.content,
      nextContent: memoryContent,
      allowedAgents,
      linkedSkillNames,
      sensitivityLevel: input.sensitivityLevel || "normal",
      sourceMode: input.fileRelativePath ? "file" : "manual",
      fileRelativePath: input.fileRelativePath || null,
    });

    return {
      imported: true,
      memoryId: updatedMemory.id,
      title,
      sourceRef,
      agentName: input.agentName,
      scope,
      contentChars: memoryContent.length,
      action: "updated",
      historyId: history.id,
    };
  }

  const createdMemory = await prisma.memory.create({
    data: memoryData as never,
  });

  const history = await createKnowledgeSourceHistory({
    memoryId: createdMemory.id,
    title,
    sourceRef,
    agentName: input.agentName,
    scope,
    action: "created",
    previousContent: null,
    nextContent: memoryContent,
    allowedAgents,
    linkedSkillNames,
    sensitivityLevel: input.sensitivityLevel || "normal",
    sourceMode: input.fileRelativePath ? "file" : "manual",
    fileRelativePath: input.fileRelativePath || null,
  });

  return {
    imported: true,
    memoryId: createdMemory.id,
    title,
    sourceRef,
    agentName: input.agentName,
    scope,
    contentChars: memoryContent.length,
    action: "created",
    historyId: history.id,
  };
}

export async function importKnowledgeSourceFolder(input: {
  agentName: string;
  scope?: string;
  ownerAgentName?: string | null;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  sensitivityLevel?: string;
}): Promise<KnowledgeSourceFolderImportResult> {
  const files = await listKnowledgeSourceFiles();

  const results: KnowledgeSourceImportResult[] = [];

  for (const file of files) {
    const title = file.relativePath.replace(/\.[^.]+$/, "");

    const result = await importKnowledgeSourceToMemory({
      title,
      fileRelativePath: file.relativePath,
      agentName: input.agentName,
      scope: input.scope || "project",
      ownerAgentName: input.ownerAgentName,
      allowedAgents: input.allowedAgents,
      linkedSkillNames: input.linkedSkillNames,
      sensitivityLevel: input.sensitivityLevel || "normal",
    });

    results.push(result);
  }

  return {
    processedFileCount: files.length,
    importedCount: results.filter((item) => item.imported).length,
    skippedCount: results.filter((item) => !item.imported).length,
    results,
  };
}

export async function findKnowledgeSourceImportHistory(input?: {
  sourceRef?: string;
  memoryId?: string;
  limit?: number;
}): Promise<KnowledgeSourceImportHistoryItem[]> {
  const histories = await prisma.knowledgeSourceImportHistory.findMany({
    where: {
      sourceRef: input?.sourceRef,
      memoryId: input?.memoryId,
    },
    take: input?.limit || 50,
    orderBy: {
      createdAt: "desc",
    },
  });

  return histories.map(mapHistory);
}

export async function findKnowledgeSourceImportHistoryDetail(
  historyId: string
): Promise<KnowledgeSourceImportHistoryDetail | null> {
  const history = await prisma.knowledgeSourceImportHistory.findUnique({
    where: {
      id: historyId,
    },
  });

  if (!history) {
    return null;
  }

  return {
    ...mapHistory(history),
    previousContent: history.previousContent,
    nextContent: history.nextContent,
  };
}

export async function buildKnowledgeSourceHistoryDiff(
  historyId: string
): Promise<KnowledgeSourceDiffResult | null> {
  const history = await prisma.knowledgeSourceImportHistory.findUnique({
    where: {
      id: historyId,
    },
  });

  if (!history) {
    return null;
  }

  const previousContent = history.previousContent || "";
  const nextContent = history.nextContent || "";

  const lines = buildLineDiff(previousContent, nextContent);

  return {
    historyId: history.id,
    title: history.title,
    sourceRef: history.sourceRef,
    action: history.action,
    previousContentHash: history.previousContentHash,
    nextContentHash: history.nextContentHash,
    previousContentChars: history.previousContentChars,
    nextContentChars: history.nextContentChars,
    addedLineCount: lines.filter((line) => line.type === "added").length,
    removedLineCount: lines.filter((line) => line.type === "removed").length,
    unchangedLineCount: lines.filter((line) => line.type === "unchanged").length,
    lines,
  };
}

export async function rollbackKnowledgeSourceFromHistory(input: {
  historyId: string;
  target?: "previous" | "next";
}): Promise<KnowledgeSourceRollbackResult> {
  const target = input.target || "previous";

  const history = await prisma.knowledgeSourceImportHistory.findUnique({
    where: {
      id: input.historyId,
    },
  });

  if (!history) {
    return {
      rolledBack: false,
      historyId: input.historyId,
      sourceRef: "-",
      title: "-",
      target,
      previousContentChars: 0,
      nextContentChars: 0,
      reason: "History not found.",
    };
  }

  const targetContent =
    target === "previous" ? history.previousContent : history.nextContent;

  if (!targetContent || targetContent.trim().length < 20) {
    return {
      rolledBack: false,
      historyId: history.id,
      memoryId: history.memoryId || undefined,
      sourceRef: history.sourceRef,
      title: history.title,
      target,
      previousContentChars: history.previousContentChars,
      nextContentChars: history.nextContentChars,
      reason: `Target content '${target}' is empty or too short.`,
    };
  }

  const memory =
    history.memoryId
      ? await prisma.memory.findUnique({
          where: {
            id: history.memoryId,
          },
        })
      : await prisma.memory.findFirst({
          where: {
            sourceType: "knowledge_source",
            sourceRef: history.sourceRef,
          },
        });

  if (!memory) {
    return {
      rolledBack: false,
      historyId: history.id,
      sourceRef: history.sourceRef,
      title: history.title,
      target,
      previousContentChars: history.previousContentChars,
      nextContentChars: history.nextContentChars,
      reason: "Target memory not found.",
    };
  }

  const agent = await prisma.agent.findUnique({
    where: {
      name: history.agentName,
    },
  });

  if (!agent) {
    return {
      rolledBack: false,
      historyId: history.id,
      memoryId: memory.id,
      sourceRef: history.sourceRef,
      title: history.title,
      target,
      previousContentChars: history.previousContentChars,
      nextContentChars: history.nextContentChars,
      reason: `Agent not found: ${history.agentName}`,
    };
  }

  const allowedAgents = safeJsonParse<string[]>(history.allowedAgentsJson, []);
  const linkedSkillNames = safeJsonParse<string[]>(
    history.linkedSkillNamesJson,
    []
  );

  const updatedMemory = await prisma.memory.update({
    where: {
      id: memory.id,
    },
    data: {
      agentId: agent.id,
      content: targetContent,
      type: "knowledge_source",
      scope: history.scope,
      ownerAgentName: history.agentName,
      allowedAgentsJson: JSON.stringify(allowedAgents),
      linkedSkillNamesJson: JSON.stringify(linkedSkillNames),
      runtimeInjectable: false,
      ragEnabled: true,
      sensitivityLevel: history.sensitivityLevel,
      sourceType: "knowledge_source",
      sourceRef: history.sourceRef,
    } as never,
  });

  const rollbackHistory = await createKnowledgeSourceHistory({
    memoryId: updatedMemory.id,
    title: history.title,
    sourceRef: history.sourceRef,
    agentName: history.agentName,
    scope: history.scope,
    action: "rollback",
    previousContent: memory.content,
    nextContent: targetContent,
    allowedAgents,
    linkedSkillNames,
    sensitivityLevel: history.sensitivityLevel,
    sourceMode: "rollback",
    fileRelativePath: history.fileRelativePath,
  });

  return {
    rolledBack: true,
    memoryId: updatedMemory.id,
    historyId: history.id,
    rollbackHistoryId: rollbackHistory.id,
    sourceRef: history.sourceRef,
    title: history.title,
    target,
    previousContentChars: memory.content.length,
    nextContentChars: targetContent.length,
  };
}