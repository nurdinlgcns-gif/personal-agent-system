import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { env } from "../../config/env";
import {
  DocumentIngestionConvertRequest,
  DocumentIngestionConvertResult,
  DocumentIngestionManifest,
} from "./documentIngestionTypes";
import {
  extractConverterStdoutMetadata,
  runDocToMarkdownConverter,
} from "./docToMarkdownConverterClient";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".xlsx", ".pptx", ".docx"]);

function safePreview(content: string, maxChars = 4000) {
  if (content.length <= maxChars) {
    return content;
  }

  return `${content.slice(0, maxChars).trim()}\n\n...`;
}

function safeStem(value: string) {
  return String(value || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
}

function getSourceStem(inputPath: string) {
  return safeStem(path.basename(inputPath, path.extname(inputPath)));
}

function createJobId() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return `ing_${stamp}_${randomUUID().slice(0, 8)}`;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {
      recursive: true,
    });
  }
}

function validateInputPath(inputPath: string) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("inputPath wajib diisi dan harus berupa string.");
  }

  const resolvedInputPath = path.resolve(inputPath);

  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Input file tidak ditemukan: ${resolvedInputPath}`);
  }

  const stat = fs.statSync(resolvedInputPath);

  if (!stat.isFile()) {
    throw new Error(`Untuk fase awal, inputPath harus file: ${resolvedInputPath}`);
  }

  const extension = path.extname(resolvedInputPath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported file type '${extension}'. Supported: ${Array.from(
        SUPPORTED_EXTENSIONS
      ).join(", ")}`
    );
  }

  return resolvedInputPath;
}

function parseFrontmatterStatus(markdown: string) {
  const match = markdown.match(/^---\s*[\s\S]*?\nstatus:\s*(.+)\n[\s\S]*?---/);

  if (match?.[1]) {
    return match[1].trim();
  }

  return "needs_review";
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

function resolveMarkdownPath(markdownPathFromStdout: string) {
  if (!markdownPathFromStdout) {
    return "";
  }

  return path.resolve(markdownPathFromStdout);
}

function buildJobLayout(inputPath: string) {
  const storageRoot = path.resolve(env.DOCUMENT_INGESTION_STORAGE_ROOT);
  const jobId = createJobId();
  const jobDir = path.join(storageRoot, "jobs", jobId);
  const inputDir = path.join(jobDir, "input");
  const convertedDir = path.join(jobDir, "converted");
  const sourceFile = path.basename(inputPath);
  const sourceStem = getSourceStem(inputPath);
  const copiedInputPath = path.join(inputDir, sourceFile);
  const manifestPath = path.join(jobDir, "manifest.json");
  const sourceRef = `document-ingestion://${jobId}/${sourceFile}`;

  return {
    storageRoot,
    jobId,
    jobDir,
    inputDir,
    convertedDir,
    sourceFile,
    sourceStem,
    copiedInputPath,
    manifestPath,
    sourceRef,
  };
}

function writeManifest(manifestPath: string, manifest: DocumentIngestionManifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

export async function convertDocumentToMarkdown(
  request: DocumentIngestionConvertRequest
): Promise<DocumentIngestionConvertResult> {
  const inputPath = validateInputPath(request.inputPath);
  const layout = buildJobLayout(inputPath);

  try {
    ensureDir(layout.inputDir);
    ensureDir(layout.convertedDir);

    fs.copyFileSync(inputPath, layout.copiedInputPath);

    const converterResult = await runDocToMarkdownConverter(
      layout.copiedInputPath,
      {
        outputRoot: layout.convertedDir,
      }
    );

    const stdoutMetadata = extractConverterStdoutMetadata(
      converterResult.stdout
    );

    const markdownPath = resolveMarkdownPath(stdoutMetadata.markdownPath);

    if (!markdownPath || !fs.existsSync(markdownPath)) {
      throw new Error(
        `Markdown output tidak ditemukan. Parsed path: ${
          markdownPath || "-"
        }`
      );
    }

    const markdown = fs.readFileSync(markdownPath, "utf8");
    const outputDir = path.dirname(markdownPath);
    const imagesDir = path.join(outputDir, "images");

    const notesFromMarkdown = parseConversionNotes(markdown);
    const warnings =
      notesFromMarkdown.length > 0
        ? notesFromMarkdown
        : stdoutMetadata.warnings;

    const status = parseFrontmatterStatus(markdown);

    const manifest: DocumentIngestionManifest = {
      jobId: layout.jobId,
      sourceRef: layout.sourceRef,
      sourceFile: layout.sourceFile,
      sourceStem: layout.sourceStem,
      originalInputPath: inputPath,
      copiedInputPath: layout.copiedInputPath,
      markdownPath,
      outputDir,
      imagesDir: fs.existsSync(imagesDir) ? imagesDir : null,
      status,
      imageCount: stdoutMetadata.imageCount,
      markdownChars: markdown.length,
      warnings,
      createdAt: new Date().toISOString(),
    };

    writeManifest(layout.manifestPath, manifest);

    return {
      ok: true,
      jobId: layout.jobId,
      sourceRef: layout.sourceRef,
      sourceFile: layout.sourceFile,
      sourceStem: layout.sourceStem,
      inputPath,
      copiedInputPath: layout.copiedInputPath,
      storageRoot: layout.storageRoot,
      jobDir: layout.jobDir,
      inputDir: layout.inputDir,
      convertedDir: layout.convertedDir,
      outputDir,
      markdownPath,
      imagesDir: fs.existsSync(imagesDir) ? imagesDir : null,
      manifestPath: layout.manifestPath,
      markdownPreview: safePreview(markdown),
      markdownChars: markdown.length,
      imageCount: stdoutMetadata.imageCount,
      warnings,
      status,
      stdout: converterResult.stdout,
      stderr: converterResult.stderr,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      jobId: layout.jobId,
      sourceRef: layout.sourceRef,
      sourceFile: layout.sourceFile,
      sourceStem: layout.sourceStem,
      inputPath,
      copiedInputPath: fs.existsSync(layout.copiedInputPath)
        ? layout.copiedInputPath
        : null,
      storageRoot: layout.storageRoot,
      jobDir: layout.jobDir,
      inputDir: layout.inputDir,
      convertedDir: layout.convertedDir,
      outputDir: null,
      markdownPath: null,
      imagesDir: null,
      manifestPath: null,
      markdownPreview: null,
      markdownChars: 0,
      imageCount: 0,
      warnings: [],
      status: "failed",
      stdout: "",
      stderr: "",
      error: message,
    };
  }
}