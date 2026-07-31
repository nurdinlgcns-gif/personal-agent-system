import { Router } from "express";

import { logger } from "../utils/logger";
import { convertDocumentToMarkdown } from "../services/documentIngestion/documentIngestionService";
import { importConvertedMarkdownToKnowledgeSource } from "../services/documentIngestion/convertedMarkdownKnowledgeSourceImportService";

export const documentIngestionRoutes = Router();

documentIngestionRoutes.get("/health", (_req, res) => {
  return res.json({
    ok: true,
    service: "document-ingestion",
    status: "ready",
    endpoints: [
      "GET /api/document-ingestion/health",
      "POST /api/document-ingestion/convert",
      "POST /api/document-ingestion/import",
      "POST /api/document-ingestion/convert-and-import",
    ],
    storage: {
      mode: "job-based",
      sourceRef: "document-ingestion://{jobId}/{sourceFile}",
    },
    timestamp: new Date().toISOString(),
  });
});

documentIngestionRoutes.post("/convert", async (req, res) => {
  try {
    const inputPath = req.body?.inputPath;

    const result = await convertDocumentToMarkdown({
      inputPath,
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    logger.error("Document ingestion conversion failed", error);

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi error saat convert dokumen.",
    });
  }
});

documentIngestionRoutes.post("/import", async (req, res) => {
  try {
    const result = await importConvertedMarkdownToKnowledgeSource({
      markdownPath: req.body?.markdownPath,
      originalInputPath: req.body?.originalInputPath,
      sourceRef: req.body?.sourceRef,
      agentName: req.body?.agentName,
      title: req.body?.title,
      scope: req.body?.scope,
      allowedAgents: req.body?.allowedAgents,
      linkedSkillNames: req.body?.linkedSkillNames,
      sensitivityLevel: req.body?.sensitivityLevel,
      memoryType: req.body?.memoryType,
      sourceMode: req.body?.sourceMode,
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    logger.error("Converted markdown import failed", error);

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi error saat import Markdown hasil convert.",
    });
  }
});

documentIngestionRoutes.post("/convert-and-import", async (req, res) => {
  try {
    const convertResult = await convertDocumentToMarkdown({
      inputPath: req.body?.inputPath,
    });

    if (!convertResult.ok || !convertResult.markdownPath) {
      return res.status(400).json({
        ok: false,
        convert: convertResult,
        import: null,
      });
    }

    const importResult = await importConvertedMarkdownToKnowledgeSource({
      markdownPath: convertResult.markdownPath,
      originalInputPath: convertResult.copiedInputPath || convertResult.inputPath,
      sourceRef: convertResult.sourceRef,
      agentName: req.body?.agentName,
      title: req.body?.title,
      scope: req.body?.scope,
      allowedAgents: req.body?.allowedAgents,
      linkedSkillNames: req.body?.linkedSkillNames,
      sensitivityLevel: req.body?.sensitivityLevel,
      memoryType: req.body?.memoryType,
      sourceMode: req.body?.sourceMode,
    });

    if (!importResult.ok) {
      return res.status(400).json({
        ok: false,
        convert: convertResult,
        import: importResult,
      });
    }

    return res.json({
      ok: true,
      convert: convertResult,
      import: importResult,
    });
  } catch (error) {
    logger.error("Document convert-and-import failed", error);

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi error saat convert dan import dokumen.",
    });
  }
});