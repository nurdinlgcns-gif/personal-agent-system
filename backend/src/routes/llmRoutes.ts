import { Router } from "express";
import {
  getDefaultLlmModel,
  getDefaultLlmProvider,
  getLlmProviderStatuses,
  getAnthropicApiKey,
  getGoogleAiApiKey,
  maskSecret,
} from "../config/llmProviders";
import { runLlmCompletion } from "../services/llm/llmClient";

export const llmRoutes = Router();

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
      provider: request.body?.provider || "auto",
      model: request.body?.model || "auto",
      mode: request.body?.mode || "auto",
    },
  });

  response.json(result);
});