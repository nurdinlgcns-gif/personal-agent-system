import { PrismaClient } from "@prisma/client";
import {
  getAnthropicApiKey,
  getGoogleAiApiKey,
} from "../../../config/llmProviders";
import { decryptProviderSecret } from "../providerCrypto";
import type { RuntimeResolvedProvider } from "../llmTypes";

const prisma = new PrismaClient();

function safeDecryptProviderSecret(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return decryptProviderSecret(value);
  } catch {
    return "";
  }
}

export async function resolveRuntimeProviderSecret(
  provider: RuntimeResolvedProvider
) {
  if (provider.source === "registry" && provider.id) {
    const registryProvider = await prisma.llmProvider.findUnique({
      where: {
        id: provider.id,
      },
      select: {
        apiKeyEncrypted: true,
      },
    });

    return safeDecryptProviderSecret(registryProvider?.apiKeyEncrypted);
  }

  if (provider.type === "anthropic") {
    return getAnthropicApiKey();
  }

  if (provider.type === "google") {
    return getGoogleAiApiKey();
  }

  return "";
}