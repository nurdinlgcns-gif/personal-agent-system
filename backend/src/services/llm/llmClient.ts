import {
    getDefaultLlmModel,
    getDefaultLlmProvider,
    isAnthropicConfigured,
    isGoogleConfigured,
    resolveModelMode,
    resolveProviderByModel,
  } from "../../config/llmProviders";
  import { runAnthropicCompletion } from "./anthropicClient";
  import { runGoogleCompletion } from "./googleClient";
  import type { LlmProvider, LlmRequest, LlmResponse } from "./llmTypes";
  
  function resolveRuntimeProvider(request: LlmRequest): LlmProvider {
    const requestedProvider = request.preference?.provider;
  
    if (requestedProvider && requestedProvider !== "auto") {
      return requestedProvider;
    }
  
    const providerByModel = resolveProviderByModel(request.preference?.model);
  
    if (providerByModel !== "auto") {
      return providerByModel;
    }
  
    const defaultProvider = getDefaultLlmProvider();
  
    if (defaultProvider !== "auto") {
      return defaultProvider;
    }
  
    if (isAnthropicConfigured()) {
      return "anthropic";
    }
  
    if (isGoogleConfigured()) {
      return "google";
    }
  
    return "anthropic";
  }
  
  function resolveRuntimeModel(request: LlmRequest, provider: LlmProvider) {
    const requestedModel = request.preference?.model;
  
    if (requestedModel && requestedModel !== "auto") {
      return requestedModel;
    }
  
    const defaultModel = getDefaultLlmModel();
  
    if (defaultModel && defaultModel !== "auto") {
      return defaultModel;
    }
  
    if (provider === "google") {
      return "gemini-default";
    }
  
    return "claude-default";
  }
  
  export async function runLlmCompletion(
    request: LlmRequest
  ): Promise<LlmResponse> {
    const provider = resolveRuntimeProvider(request);
    const model = resolveRuntimeModel(request, provider);
    const mode = request.preference?.mode || resolveModelMode(model);
  
    const normalizedRequest: LlmRequest = {
      ...request,
      preference: {
        ...request.preference,
        provider,
        model,
        mode,
      },
    };
  
    if (provider === "google") {
      return runGoogleCompletion(normalizedRequest, model);
    }
  
    return runAnthropicCompletion(normalizedRequest, model);
  }