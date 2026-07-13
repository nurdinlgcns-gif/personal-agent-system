import { useEffect, useMemo, useState } from "react";
import {
  fetchLlmProviders,
  previewLlmProvider,
  type LlmPreviewResponse,
  type LlmProviderStatus,
  type LlmProvidersResponse,
} from "../services/llmApi";

function getProviderKeyPreview(
  providersData: LlmProvidersResponse | null,
  provider: LlmProviderStatus
) {
  if (!providersData) {
    return "-";
  }

  if (provider.provider === "anthropic") {
    return providersData.secrets.anthropicKeyPreview || "-";
  }

  if (provider.provider === "google") {
    return providersData.secrets.googleKeyPreview || "-";
  }

  return "-";
}

function getProviderDescription(provider: LlmProviderStatus) {
  if (provider.provider === "anthropic") {
    return "Claude provider for reasoning, coding, planning, and high-quality writing workflows.";
  }

  if (provider.provider === "google") {
    return "Google AI Studio / Gemini provider for fast, multimodal, and experimental AI workflows.";
  }

  return "LLM provider.";
}

function getProviderAccent(provider: LlmProviderStatus) {
  if (provider.provider === "anthropic") {
    return "claude";
  }

  if (provider.provider === "google") {
    return "gemini";
  }

  return "default";
}

export function SettingsView() {
  const [providersData, setProvidersData] =
    useState<LlmProvidersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewResult, setPreviewResult] =
    useState<LlmPreviewResponse | null>(null);
  const [previewLoadingProvider, setPreviewLoadingProvider] =
    useState<string | null>(null);

  const configuredCount = useMemo(() => {
    return providersData?.providers.filter((provider) => provider.configured)
      .length || 0;
  }, [providersData]);

  async function loadProviders(isSilent = false) {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const data = await fetchLlmProviders();
      setProvidersData(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load LLM provider status";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handlePreview(provider: LlmProviderStatus) {
    const defaultModel =
      provider.availableModels.find((model) => model.id === provider.defaultModel)
        ?.id ||
      provider.availableModels[0]?.id ||
      provider.defaultModel;

    try {
      setPreviewLoadingProvider(provider.provider);
      setPreviewResult(null);
      setErrorMessage(null);

      const result = await previewLlmProvider({
        inputText: "Hello from dashboard Settings provider preview.",
        agentName: "design-agent",
        provider: provider.provider,
        model: defaultModel,
        mode: "auto",
      });

      setPreviewResult(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to preview LLM provider";

      setErrorMessage(message);
    } finally {
      setPreviewLoadingProvider(null);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  return (
    <section className="settings-view">
      <div className="settings-hero-card">
        <div>
          <span className="settings-eyebrow">System Settings</span>
          <h1>LLM Provider Status</h1>
          <p>
            Monitor Claude and Google AI Studio / Gemini configuration from the
            dashboard without exposing full API keys.
          </p>
        </div>

        <button
          type="button"
          className="settings-refresh-button"
          onClick={() => loadProviders(true)}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <div className="settings-error-banner">
          <strong>Settings error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading && (
        <div className="settings-loading-card">
          <span className="loading-spinner" />
          Loading LLM provider configuration...
        </div>
      )}

      {!isLoading && providersData && (
        <>
          <div className="settings-summary-grid">
            <div className="settings-summary-card">
              <span>Default Provider</span>
              <strong>{providersData.defaultProvider}</strong>
            </div>

            <div className="settings-summary-card">
              <span>Default Model</span>
              <strong>{providersData.defaultModel}</strong>
            </div>

            <div className="settings-summary-card">
              <span>Configured Providers</span>
              <strong>
                {configuredCount}/{providersData.providers.length}
              </strong>
            </div>
          </div>

          <div className="llm-provider-grid">
            {providersData.providers.map((provider) => (
              <article
                key={provider.provider}
                className={`llm-provider-card ${getProviderAccent(provider)} ${
                  provider.configured ? "configured" : "not-configured"
                }`}
              >
                <div className="llm-provider-card-header">
                  <div>
                    <span className="llm-provider-type">
                      {provider.provider}
                    </span>
                    <h2>{provider.displayName}</h2>
                  </div>

                  <span
                    className={`llm-status-pill ${
                      provider.configured ? "ready" : "missing"
                    }`}
                  >
                    {provider.configured ? "Configured" : "Missing Key"}
                  </span>
                </div>

                <p className="llm-provider-description">
                  {getProviderDescription(provider)}
                </p>

                <div className="llm-provider-meta-grid">
                  <div>
                    <span>Default Model</span>
                    <strong>{provider.defaultModel}</strong>
                  </div>

                  <div>
                    <span>API Key Preview</span>
                    <strong>{getProviderKeyPreview(providersData, provider)}</strong>
                  </div>

                  <div>
                    <span>Available Aliases</span>
                    <strong>{provider.availableModels.length}</strong>
                  </div>
                </div>

                <div className="llm-model-list">
                  {provider.availableModels.map((model) => (
                    <div key={model.id} className="llm-model-row">
                      <div>
                        <strong>{model.label}</strong>
                        <small>{model.id}</small>
                      </div>

                      <span>{model.mode}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="llm-preview-button"
                  onClick={() => handlePreview(provider)}
                  disabled={previewLoadingProvider === provider.provider}
                >
                  {previewLoadingProvider === provider.provider
                    ? "Testing..."
                    : "Test Preview"}
                </button>
              </article>
            ))}
          </div>

          {previewResult && (
            <div className="llm-preview-result">
              <div>
                <span>Preview Result</span>
                <strong>
                  {previewResult.provider} / {previewResult.model}
                </strong>
              </div>

              <p>{previewResult.outputText}</p>

              <small>
                Mode: {previewResult.mode} ·{" "}
                {previewResult.isMock ? "Mock response" : "Live response"}
              </small>
            </div>
          )}
        </>
      )}
    </section>
  );
}