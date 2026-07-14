import { Router } from "express";
import {
  getAnthropicApiKey,
  getDefaultLlmModel,
  getDefaultLlmProvider,
  getGoogleAiApiKey,
  getLlmProviderStatuses,
  maskSecret,
} from "../config/llmProviders";
import { runLlmCompletion } from "../services/llm/llmClient";
import { resolveRuntimeProvider } from "../services/llm/dynamicProviderRuntime";
import type { LlmModelMode, LlmProvider } from "../services/llm/llmTypes";

export const llmRoutes = Router();

function normalizeProvider(value: unknown): LlmProvider | string {
  if (typeof value !== "string") {
    return "auto";
  }

  return value;
}

function normalizeMode(value: unknown): LlmModelMode {
  if (
    value === "auto" ||
    value === "fast" ||
    value === "deep" ||
    value === "creative"
  ) {
    return value;
  }

  return "auto";
}

llmRoutes.get("/providers", (_request, response) => {
  response.json({
    defaultProvider: getDefaultLlmProvider(),
    defaultModel: getDefaultLlmModel(),
    providers: getLlmProviderStatuses(),
    secrets: {
      anthropicConfigured: getAnthropicApiKey().length > 0,
      googleConfigured: getGoogleAiApiKey().length > 0,
      anthropicKeyPreview: maskSecret(getAnthropicApiKey()),
      googleKeyPreview: maskSecret(getGoogleAiApiKey()),
    },
  });
});

llmRoutes.post("/preview", async (request, response) => {
  const inputText =
    typeof request.body?.inputText === "string"
      ? request.body.inputText
      : "Hello from LLM provider foundation.";

  const agentName =
    typeof request.body?.agentName === "string"
      ? request.body.agentName
      : "design-agent";

  const systemPrompt =
    typeof request.body?.systemPrompt === "string"
      ? request.body.systemPrompt
      : "You are a helpful agent.";

  const result = await runLlmCompletion({
    agentName,
    systemPrompt,
    inputText,
    preference: {
      provider: normalizeProvider(request.body?.provider),
      providerId:
        typeof request.body?.providerId === "string"
          ? request.body.providerId
          : undefined,
      model:
        typeof request.body?.model === "string" ? request.body.model : "auto",
      mode: normalizeMode(request.body?.mode),
    },
  });

  response.json(result);
});

llmRoutes.post("/resolve", async (request, response) => {
  const inputText =
    typeof request.body?.inputText === "string"
      ? request.body.inputText
      : "Resolver test input.";

  const agentName =
    typeof request.body?.agentName === "string"
      ? request.body.agentName
      : "design-agent";

  const systemPrompt =
    typeof request.body?.systemPrompt === "string"
      ? request.body.systemPrompt
      : "You are a helpful agent.";

  const resolved = await resolveRuntimeProvider({
    agentName,
    systemPrompt,
    inputText,
    preference: {
      provider: normalizeProvider(request.body?.provider),
      providerId:
        typeof request.body?.providerId === "string"
          ? request.body.providerId
          : undefined,
      model:
        typeof request.body?.model === "string" ? request.body.model : "auto",
      mode: normalizeMode(request.body?.mode),
    },
  });

  response.json({
    provider: resolved.provider,
    model: resolved.model,
    mode: resolved.mode,
  });
});