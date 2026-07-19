import { prisma } from "../../db/prisma";
import type { AgentCapabilityCheckResult } from "../agents/agentCapabilityGuard";
import type { RuntimeMemoryContextSummary } from "../memory/runtimeMemoryContextFormatter";
import type { RuntimeRagContextSummary } from "../memory/runtimeRagContextFormatter";
import type { LlmResponse } from "./llmTypes";

export type StoreTaskRuntimeResultInput = {
  inputText: string;
  agentName: string;
  source: string;
  outputText: string;
  runtimeResult: LlmResponse;
  capabilityCheck?: AgentCapabilityCheckResult;
  runtimeMemoryContext?: RuntimeMemoryContextSummary | null;
  runtimeRagContext?: RuntimeRagContextSummary | null;
};

export type StoreGovernanceBlockedTaskInput = {
  inputText: string;
  agentName: string;
  source: string;
  outputText: string;
  capabilityCheck: AgentCapabilityCheckResult;
};

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? []);
}

function asRecord(value: Record<string, unknown>) {
  return value;
}

function buildGovernanceUpdateData(capabilityCheck?: AgentCapabilityCheckResult) {
  if (!capabilityCheck) {
    return {};
  }

  const softAndSkillSignals = [
    ...capabilityCheck.matchedSoftAllowedKeywords,
    ...capabilityCheck.matchedSkillSignals.map((signal) => `skill:${signal}`),
  ];

  return {
    governanceAllowed: capabilityCheck.allowed,
    governanceReason: capabilityCheck.reason,
    governanceConfidence: capabilityCheck.confidence,
    governanceMatchedAllowedJson: stringifyJson(
      capabilityCheck.matchedAllowedKeywords
    ),
    governanceMatchedDeniedJson: stringifyJson(
      capabilityCheck.matchedDeniedKeywords
    ),
    governanceMatchedSoftJson: stringifyJson(softAndSkillSignals),
    governanceMatchedSmallTalkJson: stringifyJson(
      capabilityCheck.matchedSmallTalkKeywords
    ),
    governanceSuggestedAgentsJson: stringifyJson([
      ...capabilityCheck.suggestedAgents,
      ...capabilityCheck.matchedSkillNames.map((skillName) => `skill:${skillName}`),
    ]),
  };
}

function buildRuntimeMemoryUpdateData(
  runtimeMemoryContext?: RuntimeMemoryContextSummary | null
) {
  if (!runtimeMemoryContext) {
    return {};
  }

  return {
    runtimeMemoryInjected: runtimeMemoryContext.injected,
    runtimeMemoryItemCount: runtimeMemoryContext.itemCount,
    runtimeMemoryTotalChars: runtimeMemoryContext.totalChars,
    runtimeMemoryIdsJson: stringifyJson(runtimeMemoryContext.usedMemoryIds),
    runtimeMemoryTypesJson: stringifyJson(runtimeMemoryContext.usedMemoryTypes),
    runtimeMemoryScopesJson: stringifyJson(runtimeMemoryContext.usedMemoryScopes),
    runtimeMemorySourcesJson: stringifyJson(
      runtimeMemoryContext.usedMemorySources
    ),
  };
}

function buildRuntimeRagUpdateData(
  runtimeRagContext?: RuntimeRagContextSummary | null
) {
  if (!runtimeRagContext) {
    return {};
  }

  return {
    runtimeRagPreviewOnly: runtimeRagContext.previewOnly,
    runtimeRagRetrieved: runtimeRagContext.retrieved,
    runtimeRagQuery: runtimeRagContext.query || null,
    runtimeRagItemCount: runtimeRagContext.itemCount,
    runtimeRagTotalChars: runtimeRagContext.totalChars,
    runtimeRagChunkIdsJson: stringifyJson(runtimeRagContext.usedChunkIds),
    runtimeRagMemoryIdsJson: stringifyJson(runtimeRagContext.usedMemoryIds),
    runtimeRagTypesJson: stringifyJson(runtimeRagContext.usedMemoryTypes),
    runtimeRagScopesJson: stringifyJson(runtimeRagContext.usedMemoryScopes),
    runtimeRagSourcesJson: stringifyJson(runtimeRagContext.usedMemorySources),
    runtimeRagScoresJson: stringifyJson(runtimeRagContext.scores),
    runtimeRagTopResultsJson: stringifyJson(runtimeRagContext.topResults),
  };
}

export async function storeLatestTaskRuntimeResult(
  input: StoreTaskRuntimeResultInput
) {
  const cleanedInputText = removeLeadingAgentMention(input.inputText);

  const latestMatchingTask = await prisma.task.findFirst({
    where: {
      source: input.source,
      agent: {
        name: input.agentName,
      },
      OR: [
        {
          inputText: input.inputText,
        },
        {
          inputText: cleanedInputText,
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestMatchingTask) {
    return null;
  }

  const updateData = asRecord({
    outputText: input.outputText,
    runtimeProviderId: input.runtimeResult.providerId || null,
    runtimeProviderName: input.runtimeResult.providerName || null,
    runtimeProviderType:
      input.runtimeResult.providerType || input.runtimeResult.provider,
    runtimeModel: input.runtimeResult.model,
    runtimeMode: input.runtimeResult.mode,
    runtimeResolvedFrom: input.runtimeResult.resolvedFrom || null,
    ...buildGovernanceUpdateData(input.capabilityCheck),
    ...buildRuntimeMemoryUpdateData(input.runtimeMemoryContext),
    ...buildRuntimeRagUpdateData(input.runtimeRagContext),
  });

  return prisma.task.update({
    where: {
      id: latestMatchingTask.id,
    },
    data: updateData as never,
  });
}

export async function storeGovernanceBlockedTask(
  input: StoreGovernanceBlockedTaskInput
) {
  const agent = await prisma.agent.findUnique({
    where: {
      name: input.agentName,
    },
  });

  if (!agent) {
    return null;
  }

  const cleanedInputText = removeLeadingAgentMention(input.inputText);

  const createData = asRecord({
    agentId: agent.id,
    inputText: cleanedInputText,
    outputText: input.outputText,
    status: "done",
    source: input.source,
    ...buildGovernanceUpdateData(input.capabilityCheck),

    runtimeMemoryInjected: false,
    runtimeMemoryItemCount: 0,
    runtimeMemoryTotalChars: 0,
    runtimeMemoryIdsJson: stringifyJson([]),
    runtimeMemoryTypesJson: stringifyJson([]),
    runtimeMemoryScopesJson: stringifyJson([]),
    runtimeMemorySourcesJson: stringifyJson([]),

    runtimeRagPreviewOnly: true,
    runtimeRagRetrieved: false,
    runtimeRagQuery: null,
    runtimeRagItemCount: 0,
    runtimeRagTotalChars: 0,
    runtimeRagChunkIdsJson: stringifyJson([]),
    runtimeRagMemoryIdsJson: stringifyJson([]),
    runtimeRagTypesJson: stringifyJson([]),
    runtimeRagScopesJson: stringifyJson([]),
    runtimeRagSourcesJson: stringifyJson([]),
    runtimeRagScoresJson: stringifyJson([]),
    runtimeRagTopResultsJson: stringifyJson([]),
  });

  return prisma.task.create({
    data: createData as never,
  });
}