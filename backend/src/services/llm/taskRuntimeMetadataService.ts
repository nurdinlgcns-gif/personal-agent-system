import { PrismaClient } from "@prisma/client";
import type { RuntimeResolvedProvider } from "./llmTypes";

const prisma = new PrismaClient();

export type StoreTaskRuntimeMetadataInput = {
  inputText: string;
  agentName: string;
  source: string;
  runtimeProvider: {
    provider: RuntimeResolvedProvider;
    model: string;
    mode: string;
  };
};

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

export async function storeLatestTaskRuntimeMetadata(
  input: StoreTaskRuntimeMetadataInput
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
      runtimeProviderId: input.runtimeProvider.provider.id,
      runtimeProviderName: input.runtimeProvider.provider.name,
      runtimeProviderType: input.runtimeProvider.provider.type,
      runtimeModel: input.runtimeProvider.model,
      runtimeMode: input.runtimeProvider.mode,
      runtimeResolvedFrom: input.runtimeProvider.provider.source,
    },
  });
}