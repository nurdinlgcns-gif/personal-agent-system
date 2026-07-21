import { Router } from "express";
import { prisma } from "../db/prisma";

export const tasksRoutes = Router();

type TaskGovernanceMetadata = {
  governanceAllowed?: boolean | null;
  governanceReason?: string | null;
  governanceConfidence?: string | null;
  governanceMatchedAllowedJson?: string | null;
  governanceMatchedDeniedJson?: string | null;
  governanceMatchedSoftJson?: string | null;
  governanceMatchedSmallTalkJson?: string | null;
  governanceSuggestedAgentsJson?: string | null;
};

type TaskRuntimeMemoryMetadata = {
  runtimeMemoryInjected?: boolean | null;
  runtimeMemoryItemCount?: number | null;
  runtimeMemoryTotalChars?: number | null;
  runtimeMemoryIdsJson?: string | null;
  runtimeMemoryTypesJson?: string | null;
  runtimeMemoryScopesJson?: string | null;
  runtimeMemorySourcesJson?: string | null;
};

type TaskRuntimeRagMetadata = {
  runtimeRagPreviewOnly?: boolean | null;
  runtimeRagRetrieved?: boolean | null;
  runtimeRagQuery?: string | null;
  runtimeRagItemCount?: number | null;
  runtimeRagTotalChars?: number | null;
  runtimeRagChunkIdsJson?: string | null;
  runtimeRagMemoryIdsJson?: string | null;
  runtimeRagTypesJson?: string | null;
  runtimeRagScopesJson?: string | null;
  runtimeRagSourcesJson?: string | null;
  runtimeRagScoresJson?: string | null;
  runtimeRagTopResultsJson?: string | null;
};

function parseBooleanQuery(value: unknown) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function parseLimit(value: unknown) {
  const parsed = Number(value || 50);

  if (Number.isNaN(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

function mapTask(task: any) {
  const taskWithMetadata = task as typeof task &
    TaskGovernanceMetadata &
    TaskRuntimeMemoryMetadata &
    TaskRuntimeRagMetadata;

  return {
    id: task.id,
    agentName: task.agent.name,
    inputText: task.inputText,
    outputText: task.outputText,
    status: task.status,
    source: task.source,

    runtimeProviderId: task.runtimeProviderId,
    runtimeProviderName: task.runtimeProviderName,
    runtimeProviderType: task.runtimeProviderType,
    runtimeModel: task.runtimeModel,
    runtimeMode: task.runtimeMode,
    runtimeResolvedFrom: task.runtimeResolvedFrom,

    governanceAllowed: taskWithMetadata.governanceAllowed ?? null,
    governanceReason: taskWithMetadata.governanceReason ?? null,
    governanceConfidence: taskWithMetadata.governanceConfidence ?? null,
    governanceMatchedAllowedJson:
      taskWithMetadata.governanceMatchedAllowedJson ?? null,
    governanceMatchedDeniedJson:
      taskWithMetadata.governanceMatchedDeniedJson ?? null,
    governanceMatchedSoftJson:
      taskWithMetadata.governanceMatchedSoftJson ?? null,
    governanceMatchedSmallTalkJson:
      taskWithMetadata.governanceMatchedSmallTalkJson ?? null,
    governanceSuggestedAgentsJson:
      taskWithMetadata.governanceSuggestedAgentsJson ?? null,

    runtimeMemoryInjected:
      taskWithMetadata.runtimeMemoryInjected ?? null,
    runtimeMemoryItemCount:
      taskWithMetadata.runtimeMemoryItemCount ?? null,
    runtimeMemoryTotalChars:
      taskWithMetadata.runtimeMemoryTotalChars ?? null,
    runtimeMemoryIdsJson:
      taskWithMetadata.runtimeMemoryIdsJson ?? null,
    runtimeMemoryTypesJson:
      taskWithMetadata.runtimeMemoryTypesJson ?? null,
    runtimeMemoryScopesJson:
      taskWithMetadata.runtimeMemoryScopesJson ?? null,
    runtimeMemorySourcesJson:
      taskWithMetadata.runtimeMemorySourcesJson ?? null,

    runtimeRagPreviewOnly:
      taskWithMetadata.runtimeRagPreviewOnly ?? null,
    runtimeRagRetrieved:
      taskWithMetadata.runtimeRagRetrieved ?? null,
    runtimeRagQuery:
      taskWithMetadata.runtimeRagQuery ?? null,
    runtimeRagItemCount:
      taskWithMetadata.runtimeRagItemCount ?? null,
    runtimeRagTotalChars:
      taskWithMetadata.runtimeRagTotalChars ?? null,
    runtimeRagChunkIdsJson:
      taskWithMetadata.runtimeRagChunkIdsJson ?? null,
    runtimeRagMemoryIdsJson:
      taskWithMetadata.runtimeRagMemoryIdsJson ?? null,
    runtimeRagTypesJson:
      taskWithMetadata.runtimeRagTypesJson ?? null,
    runtimeRagScopesJson:
      taskWithMetadata.runtimeRagScopesJson ?? null,
    runtimeRagSourcesJson:
      taskWithMetadata.runtimeRagSourcesJson ?? null,
    runtimeRagScoresJson:
      taskWithMetadata.runtimeRagScoresJson ?? null,
    runtimeRagTopResultsJson:
      taskWithMetadata.runtimeRagTopResultsJson ?? null,

    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

tasksRoutes.get("/", async (request, response) => {
  const limit = parseLimit(request.query.limit);
  const agentName =
    typeof request.query.agentName === "string" &&
    request.query.agentName !== "all"
      ? request.query.agentName
      : undefined;

  const source =
    typeof request.query.source === "string" && request.query.source !== "all"
      ? request.query.source
      : undefined;

  const status =
    typeof request.query.status === "string" && request.query.status !== "all"
      ? request.query.status
      : undefined;

  const search =
    typeof request.query.search === "string" && request.query.search.trim()
      ? request.query.search.trim()
      : undefined;

  const governanceAllowed = parseBooleanQuery(request.query.governanceAllowed);
  const runtimeMemoryInjected = parseBooleanQuery(
    request.query.runtimeMemoryInjected
  );
  const runtimeRagRetrieved = parseBooleanQuery(request.query.runtimeRagRetrieved);

  const where: any = {
    agent: agentName
      ? {
          name: agentName,
        }
      : undefined,
    source,
    status,
    governanceAllowed,
    runtimeMemoryInjected,
    runtimeRagRetrieved,
    OR: search
      ? [
          {
            inputText: {
              contains: search,
            },
          },
          {
            outputText: {
              contains: search,
            },
          },
          {
            runtimeRagQuery: {
              contains: search,
            },
          },
        ]
      : undefined,
  };

  Object.keys(where).forEach((key) => {
    if (where[key] === undefined) {
      delete where[key];
    }
  });

  const [tasks, totalCount, sourceGroups, statusGroups] = await Promise.all([
    prisma.task.findMany({
      where,
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        agent: true,
      },
    }),
    prisma.task.count({
      where,
    }),
    prisma.task.groupBy({
      by: ["source"],
      _count: {
        source: true,
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),
  ]);

  response.json({
    tasks: tasks.map(mapTask),
    totalCount,
    limit,
    filters: {
      agentName: agentName || "all",
      source: source || "all",
      status: status || "all",
      search: search || "",
      governanceAllowed:
        typeof governanceAllowed === "boolean" ? governanceAllowed : null,
      runtimeMemoryInjected:
        typeof runtimeMemoryInjected === "boolean"
          ? runtimeMemoryInjected
          : null,
      runtimeRagRetrieved:
        typeof runtimeRagRetrieved === "boolean" ? runtimeRagRetrieved : null,
    },
    summary: {
      bySource: sourceGroups.reduce<Record<string, number>>((acc, item) => {
        acc[item.source] = item._count.source;
        return acc;
      }, {}),
      byStatus: statusGroups.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
    },
  });
});