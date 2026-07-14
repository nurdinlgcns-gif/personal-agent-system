import type { LlmProvider } from "../llmTypes";
import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import { anthropicAdapter } from "./anthropicAdapter";
import { customHttpAdapter } from "./customHttpAdapter";
import { falAdapter } from "./falAdapter";
import { googleAdapter } from "./googleAdapter";
import { localAdapter } from "./localAdapter";
import { openAiCompatibleAdapter } from "./openaiCompatibleAdapter";

const adapters: ProviderRuntimeAdapter[] = [
  anthropicAdapter,
  googleAdapter,
  openAiCompatibleAdapter,
  localAdapter,
  customHttpAdapter,
  falAdapter,
];

export function getProviderRuntimeAdapter(type: LlmProvider) {
  return adapters.find((adapter) => adapter.type === type) || customHttpAdapter;
}