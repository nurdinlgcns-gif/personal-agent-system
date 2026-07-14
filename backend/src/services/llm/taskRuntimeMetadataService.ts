import { PrismaClient } from "@prisma/client";
import type { LlmResponse } from "./llmTypes";

const prisma = new PrismaClient();

export type StoreTaskRuntimeResultInput = {
  inputText: string;
  agentName: string;
  source: string;
  outputText: string;
  runtimeResult: LlmResponse;
};

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
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

  return prisma.task.update({
    where: {
      id: latestMatchingTask.id,
    },
    data: {
      outputText: input.outputText,
      runtimeProviderId: input.runtimeResult.providerId || null,
      runtimeProviderName: input.runtimeResult.providerName || null,
      runtimeProviderType:
        input.runtimeResult.providerType || input.runtimeResult.provider,
      runtimeModel: input.runtimeResult.model,
      runtimeMode: input.runtimeResult.mode,
      runtimeResolvedFrom: input.runtimeResult.resolvedFrom || null,
    },
  });
}