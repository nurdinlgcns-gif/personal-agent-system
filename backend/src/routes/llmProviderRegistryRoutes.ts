import { Router } from "express";
import {
  createDynamicLlmProvider,
  deleteDynamicLlmProvider,
  getDynamicLlmProvider,
  listDynamicLlmProviders,
  testDynamicLlmProvider,
  updateDynamicLlmProvider,
} from "../services/llm/providerRegistryService";

export const llmProviderRegistryRoutes = Router();

llmProviderRegistryRoutes.get("/", async (_request, response) => {
  const providers = await listDynamicLlmProviders();

  response.json({
    providers,
  });
});

llmProviderRegistryRoutes.get("/:id", async (request, response) => {
  const provider = await getDynamicLlmProvider(request.params.id);

  if (!provider) {
    response.status(404).json({
      message: "Provider not found.",
    });
    return;
  }

  response.json(provider);
});

llmProviderRegistryRoutes.post("/", async (request, response) => {
  try {
    const provider = await createDynamicLlmProvider(request.body);

    response.status(201).json(provider);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create provider.",
    });
  }
});

llmProviderRegistryRoutes.patch("/:id", async (request, response) => {
  try {
    const provider = await updateDynamicLlmProvider(
      request.params.id,
      request.body
    );

    response.json(provider);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update provider.",
    });
  }
});

llmProviderRegistryRoutes.delete("/:id", async (request, response) => {
  try {
    const result = await deleteDynamicLlmProvider(request.params.id);

    response.json(result);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete provider.",
    });
  }
});

llmProviderRegistryRoutes.post("/:id/test", async (request, response) => {
  try {
    const result = await testDynamicLlmProvider(request.params.id);

    response.json(result);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to test provider.",
    });
  }
});