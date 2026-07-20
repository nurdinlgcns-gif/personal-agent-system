import { Router } from "express";
import {
  buildKnowledgeSourceHistoryDiff,
  findKnowledgeSourceImportHistory,
  findKnowledgeSourceImportHistoryDetail,
  rollbackKnowledgeSourceFromHistory,
} from "../services/memory/knowledgeSourceImportService";

export const knowledgeSourceHistoryRoutes = Router();

knowledgeSourceHistoryRoutes.get("/history", async (request, response) => {
  const sourceRef =
    typeof request.query.sourceRef === "string"
      ? request.query.sourceRef
      : undefined;

  const memoryId =
    typeof request.query.memoryId === "string"
      ? request.query.memoryId
      : undefined;

  const rawLimit = Number(request.query.limit || 50);
  const limit = Number.isNaN(rawLimit)
    ? 50
    : Math.min(Math.max(rawLimit, 1), 200);

  const histories = await findKnowledgeSourceImportHistory({
    sourceRef,
    memoryId,
    limit,
  });

  response.json({
    histories,
  });
});

knowledgeSourceHistoryRoutes.get(
  "/history/:historyId",
  async (request, response) => {
    const detail = await findKnowledgeSourceImportHistoryDetail(
      request.params.historyId
    );

    if (!detail) {
      response.status(404).json({
        message: "Knowledge source import history not found.",
      });
      return;
    }

    response.json({
      detail,
    });
  }
);

knowledgeSourceHistoryRoutes.get(
  "/history/:historyId/diff",
  async (request, response) => {
    const diff = await buildKnowledgeSourceHistoryDiff(request.params.historyId);

    if (!diff) {
      response.status(404).json({
        message: "Knowledge source import history not found.",
      });
      return;
    }

    response.json({
      diff,
    });
  }
);

knowledgeSourceHistoryRoutes.post(
  "/history/:historyId/rollback",
  async (request, response) => {
    const target =
      request.body?.target === "next" || request.body?.target === "previous"
        ? request.body.target
        : "previous";

    const result = await rollbackKnowledgeSourceFromHistory({
      historyId: request.params.historyId,
      target,
    });

    response.json(result);
  }
);