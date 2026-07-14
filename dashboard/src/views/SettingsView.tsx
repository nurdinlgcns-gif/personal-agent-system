import { useEffect, useMemo, useState } from "react";
import {
  createDynamicLlmProvider,
  deleteDynamicLlmProvider,
  fetchDynamicLlmProviders,
  fetchLlmProviders,
  previewLlmProvider,
  testDynamicLlmProvider,
  updateDynamicLlmProvider,
  type CreateDynamicProviderPayload,
  type DynamicLlmProvider,
  type DynamicProviderModelAlias,
  type DynamicProviderType,
  type LlmModelMode,
  type LlmPreviewResponse,
  type LlmProviderStatus,
  type LlmProvidersResponse,
} from "../services/llmApi";

type ProviderFormState = {
  id?: string;
  name: string;
  type: DynamicProviderType;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
  capabilitiesText: string;
  modelAliasesText: string;
};

const providerTypes: DynamicProviderType[] = [
  "anthropic",
  "google",
  "openai-compatible",
  "local",
  "custom-http",
  "fal",
];

const emptyProviderForm: ProviderFormState = {
  name: "",
  type: "openai-compatible",
  baseUrl: "",
  apiKey: "",
  defaultModel: "auto",
  enabled: true,
  capabilitiesText: "chat",
  modelAliasesText: "",
};

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
    return "Environment-based Claude bootstrap provider. Useful for local development, fallback, and future registry seeding.";
  }

  if (provider.provider === "google") {
    return "Environment-based Gemini bootstrap provider. Useful for local development, fallback, and future registry seeding.";
  }

  return "Environment provider.";
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

function getRegistryProviderAccent(provider: DynamicLlmProvider) {
  if (provider.type === "anthropic") {
    return "claude";
  }

  if (provider.type === "google") {
    return "gemini";
  }

  if (provider.type === "fal") {
    return "fal";
  }

  if (provider.type === "local" || provider.type === "openai-compatible") {
    return "local";
  }

  return "default";
}

function parseCapabilities(inputText: string) {
  return inputText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyCapabilities(capabilities: string[]) {
  return capabilities.join(", ");
}

function normalizeModelMode(mode?: string): LlmModelMode {
  if (
    mode === "auto" ||
    mode === "fast" ||
    mode === "deep" ||
    mode === "creative"
  ) {
    return mode;
  }

  return "auto";
}

function parseModelAliases(inputText: string): DynamicProviderModelAlias[] {
  return inputText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawId, rawLabel, rawMode] = line
        .split("|")
        .map((item) => item.trim());

      return {
        id: rawId,
        label: rawLabel || rawId,
        mode: normalizeModelMode(rawMode),
      };
    })
    .filter((item) => item.id);
}

function stringifyModelAliases(modelAliases: DynamicProviderModelAlias[]) {
  return modelAliases
    .map((alias) => `${alias.id}|${alias.label}|${alias.mode || "auto"}`)
    .join("\n");
}

function providerToForm(provider: DynamicLlmProvider): ProviderFormState {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl || "",
    apiKey: "",
    defaultModel: provider.defaultModel || "auto",
    enabled: provider.enabled,
    capabilitiesText: stringifyCapabilities(provider.capabilities || []),
    modelAliasesText: stringifyModelAliases(provider.modelAliases || []),
  };
}

function formToPayload(form: ProviderFormState): CreateDynamicProviderPayload {
  const payload: CreateDynamicProviderPayload = {
    name: form.name.trim(),
    type: form.type,
    baseUrl: form.baseUrl.trim() || undefined,
    defaultModel: form.defaultModel.trim() || "auto",
    enabled: form.enabled,
    capabilities: parseCapabilities(form.capabilitiesText),
    modelAliases: parseModelAliases(form.modelAliasesText),
  };

  if (form.apiKey.trim()) {
    payload.apiKey = form.apiKey.trim();
  }

  return payload;
}

export function SettingsView() {
  const [providersData, setProvidersData] =
    useState<LlmProvidersResponse | null>(null);
  const [registryProviders, setRegistryProviders] = useState<
    DynamicLlmProvider[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistryLoading, setIsRegistryLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [previewResult, setPreviewResult] =
    useState<LlmPreviewResponse | null>(null);
  const [previewLoadingProvider, setPreviewLoadingProvider] =
    useState<string | null>(null);

  const [registryTestResult, setRegistryTestResult] = useState<string | null>(
    null
  );
  const [registryActionId, setRegistryActionId] = useState<string | null>(null);

  const [isProviderFormOpen, setIsProviderFormOpen] = useState(false);
  const [providerForm, setProviderForm] =
    useState<ProviderFormState>(emptyProviderForm);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const configuredCount = useMemo(() => {
    return (
      providersData?.providers.filter((provider) => provider.configured)
        .length || 0
    );
  }, [providersData]);

  const enabledRegistryCount = useMemo(() => {
    return registryProviders.filter((provider) => provider.enabled).length;
  }, [registryProviders]);

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

  async function loadRegistry(isSilent = false) {
    try {
      if (!isSilent) {
        setIsRegistryLoading(true);
      }

      setErrorMessage(null);

      const data = await fetchDynamicLlmProviders();
      setRegistryProviders(data.providers);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load dynamic provider registry";

      setErrorMessage(message);
    } finally {
      setIsRegistryLoading(false);
    }
  }

  async function refreshAll() {
    setIsRefreshing(true);

    await Promise.all([loadProviders(true), loadRegistry(true)]);

    setIsRefreshing(false);
  }

  async function handlePreview(provider: LlmProviderStatus) {
    const defaultModel =
      provider.availableModels.find(
        (model) => model.id === provider.defaultModel
      )?.id ||
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

  function openCreateProviderForm() {
    setProviderForm(emptyProviderForm);
    setIsProviderFormOpen(true);
  }

  function openEditProviderForm(provider: DynamicLlmProvider) {
    setProviderForm(providerToForm(provider));
    setIsProviderFormOpen(true);
  }

  function closeProviderForm() {
    if (isSavingProvider) {
      return;
    }

    setIsProviderFormOpen(false);
    setProviderForm(emptyProviderForm);
  }

  function updateProviderForm<K extends keyof ProviderFormState>(
    key: K,
    value: ProviderFormState[K]
  ) {
    setProviderForm((currentForm) => ({
      ...currentForm,
      [key]: value, // <-- Perubahannya di sini, bungkus 'key' pakai kurung siku
    }));
  }

  async function handleSaveProvider() {
    const payload = formToPayload(providerForm);

    if (!payload.name) {
      setErrorMessage("Provider name is required.");
      return;
    }

    try {
      setIsSavingProvider(true);
      setErrorMessage(null);

      if (providerForm.id) {
        await updateDynamicLlmProvider(providerForm.id, payload);
      } else {
        await createDynamicLlmProvider(payload);
      }

      setIsProviderFormOpen(false);
      setProviderForm(emptyProviderForm);

      await loadRegistry(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save provider";

      setErrorMessage(message);
    } finally {
      setIsSavingProvider(false);
    }
  }

  async function handleToggleProvider(provider: DynamicLlmProvider) {
    try {
      setRegistryActionId(provider.id);
      setRegistryTestResult(null);
      setErrorMessage(null);

      await updateDynamicLlmProvider(provider.id, {
        enabled: !provider.enabled,
      });

      await loadRegistry(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update provider";

      setErrorMessage(message);
    } finally {
      setRegistryActionId(null);
    }
  }

  async function handleDeleteProvider(provider: DynamicLlmProvider) {
    const confirmed = window.confirm(
      `Delete provider "${provider.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRegistryActionId(provider.id);
      setRegistryTestResult(null);
      setErrorMessage(null);

      await deleteDynamicLlmProvider(provider.id);
      await loadRegistry(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete provider";

      setErrorMessage(message);
    } finally {
      setRegistryActionId(null);
    }
  }

  async function handleTestRegistryProvider(provider: DynamicLlmProvider) {
    try {
      setRegistryActionId(provider.id);
      setRegistryTestResult(null);
      setErrorMessage(null);

      const result = await testDynamicLlmProvider(provider.id);

      setRegistryTestResult(
        `${result.provider.name}: ${result.message} ${
          result.isMock ? "(mock)" : ""
        }`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to test provider";

      setErrorMessage(message);
    } finally {
      setRegistryActionId(null);
    }
  }

  useEffect(() => {
    loadProviders();
    loadRegistry();
  }, []);

  return (
    <section className="settings-view">
      <div className="settings-hero-card">
        <div>
          <span className="settings-eyebrow">System Settings</span>
          <h1>Provider Registry Control Center</h1>
          <p>
            Manage AI provider configuration with a registry-first strategy.
            Environment providers are kept as bootstrap/fallback, while Dynamic
            Provider Registry is the future runtime source of truth.
          </p>
        </div>

        <button
          type="button"
          className="settings-refresh-button"
          onClick={refreshAll}
          disabled={isLoading || isRefreshing || isRegistryLoading}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="provider-strategy-note">
        <div>
          <span>Current strategy</span>
          <strong>Registry-first transition</strong>
          <p>
            Claude/Gemini from <code>.env</code> are bootstrap providers for
            local dev and fallback. New custom/local/media providers should be
            managed from Dynamic Provider Registry.
          </p>
        </div>

        <div>
          <span>Final direction</span>
          <strong>One provider registry</strong>
          <p>
            Future runtime resolver should read enabled providers from the
            registry, then select provider/model based on user preference,
            agent preference, or default fallback.
          </p>
        </div>
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
              <span>Provider Strategy</span>
              <strong>Registry-first</strong>
            </div>

            <div className="settings-summary-card">
              <span>Default Provider</span>
              <strong>{providersData.defaultProvider}</strong>
            </div>

            <div className="settings-summary-card">
              <span>Default Model</span>
              <strong>{providersData.defaultModel}</strong>
            </div>

            <div className="settings-summary-card">
              <span>Env Bootstrap</span>
              <strong>
                {configuredCount}/{providersData.providers.length}
              </strong>
            </div>

            <div className="settings-summary-card">
              <span>Registry Providers</span>
              <strong>{registryProviders.length}</strong>
            </div>

            <div className="settings-summary-card">
              <span>Registry Enabled</span>
              <strong>
                {enabledRegistryCount}/{registryProviders.length}
              </strong>
            </div>
          </div>

          <div className="llm-settings-section-header environment">
            <div>
              <span>Environment bootstrap providers</span>
              <h2>Claude and Gemini from backend `.env`</h2>
              <p>
                These providers are still useful as bootstrap/fallback
                configuration. Long-term runtime usage should gradually move to
                Dynamic Provider Registry.
              </p>
            </div>
          </div>

          <div className="llm-provider-grid env-provider-grid">
            {providersData.providers.map((provider) => (
              <article
                key={provider.provider}
                className={`llm-provider-card env-provider-card ${getProviderAccent(
                  provider
                )} ${provider.configured ? "configured" : "not-configured"}`}
              >
                <div className="llm-provider-card-header">
                  <div>
                    <span className="llm-provider-type">
                      ENV / {provider.provider}
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
                    <strong>
                      {getProviderKeyPreview(providersData, provider)}
                    </strong>
                  </div>

                  <div>
                    <span>Alias Count</span>
                    <strong>{provider.availableModels.length}</strong>
                  </div>
                </div>

                <div className="llm-model-list compact">
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
                    : "Test Bootstrap Preview"}
                </button>
              </article>
            ))}
          </div>

          {previewResult && (
            <div className="llm-preview-result">
              <div>
                <span>Bootstrap Preview Result</span>
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

      <div className="llm-settings-section-header registry primary-registry">
        <div>
          <span>Future source of truth</span>
          <h2>Dynamic Provider Registry</h2>
          <p>
            Add and manage providers for local LLM, OpenAI-compatible
            endpoints, custom HTTP providers, Claude/Gemini registry entries,
            and media providers like fal.ai.
          </p>
        </div>

        <button
          type="button"
          className="settings-refresh-button"
          onClick={openCreateProviderForm}
        >
          Add Provider
        </button>
      </div>

      {isRegistryLoading ? (
        <div className="settings-loading-card">
          <span className="loading-spinner" />
          Loading dynamic provider registry...
        </div>
      ) : registryProviders.length === 0 ? (
        <div className="llm-registry-empty-card">
          <strong>No dynamic provider registered yet.</strong>
          <p>
            Add a custom provider such as Local vLLM, OpenAI-compatible API,
            fal.ai, or your own HTTP endpoint.
          </p>

          <button
            type="button"
            className="settings-refresh-button"
            onClick={openCreateProviderForm}
          >
            Add First Provider
          </button>
        </div>
      ) : (
        <div className="llm-registry-grid">
          {registryProviders.map((provider) => (
            <article
              key={provider.id}
              className={`llm-registry-card ${getRegistryProviderAccent(
                provider
              )} ${provider.enabled ? "enabled" : "disabled"}`}
            >
              <div className="llm-provider-card-header">
                <div>
                  <span className="llm-provider-type">
                    Registry / {provider.type}
                  </span>
                  <h2>{provider.name}</h2>
                </div>

                <span
                  className={`llm-status-pill ${
                    provider.enabled ? "ready" : "missing"
                  }`}
                >
                  {provider.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="llm-provider-meta-grid">
                <div>
                  <span>Default Model</span>
                  <strong>{provider.defaultModel}</strong>
                </div>

                <div>
                  <span>API Key</span>
                  <strong>{provider.apiKeyPreview || "-"}</strong>
                </div>

                <div>
                  <span>Base URL</span>
                  <strong>{provider.baseUrl || "-"}</strong>
                </div>
              </div>

              <div className="llm-capability-list">
                {provider.capabilities.length === 0 ? (
                  <span>no capability</span>
                ) : (
                  provider.capabilities.map((capability) => (
                    <span key={capability}>{capability}</span>
                  ))
                )}
              </div>

              <div className="llm-model-list">
                {provider.modelAliases.length === 0 ? (
                  <div className="llm-model-row">
                    <div>
                      <strong>No model aliases</strong>
                      <small>Add aliases from Edit Provider.</small>
                    </div>
                    <span>auto</span>
                  </div>
                ) : (
                  provider.modelAliases.map((model) => (
                    <div key={model.id} className="llm-model-row">
                      <div>
                        <strong>{model.label}</strong>
                        <small>{model.id}</small>
                      </div>

                      <span>{model.mode || "auto"}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="llm-registry-actions">
                <button
                  type="button"
                  onClick={() => handleTestRegistryProvider(provider)}
                  disabled={registryActionId === provider.id}
                >
                  {registryActionId === provider.id ? "Working..." : "Test"}
                </button>

                <button
                  type="button"
                  onClick={() => openEditProviderForm(provider)}
                  disabled={registryActionId === provider.id}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleProvider(provider)}
                  disabled={registryActionId === provider.id}
                >
                  {provider.enabled ? "Disable" : "Enable"}
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDeleteProvider(provider)}
                  disabled={registryActionId === provider.id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {registryTestResult && (
        <div className="llm-preview-result">
          <div>
            <span>Registry Test</span>
            <strong>Dynamic Provider Test Result</strong>
          </div>

          <p>{registryTestResult}</p>
        </div>
      )}

      {isProviderFormOpen && (
        <div className="llm-provider-modal-backdrop">
          <section className="llm-provider-modal">
            <header>
              <div>
                <span>Provider Registry</span>
                <h2>{providerForm.id ? "Edit Provider" : "Add Provider"}</h2>
              </div>

              <button
                type="button"
                onClick={closeProviderForm}
                aria-label="Close provider form"
              >
                ×
              </button>
            </header>

            <div className="llm-provider-form-grid">
              <label>
                <span>Name</span>
                <input
                  value={providerForm.name}
                  onChange={(event) =>
                    updateProviderForm("name", event.target.value)
                  }
                  placeholder="Local vLLM"
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={providerForm.type}
                  onChange={(event) =>
                    updateProviderForm(
                      "type",
                      event.target.value as DynamicProviderType
                    )
                  }
                >
                  {providerTypes.map((providerType) => (
                    <option key={providerType} value={providerType}>
                      {providerType}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Base URL</span>
                <input
                  value={providerForm.baseUrl}
                  onChange={(event) =>
                    updateProviderForm("baseUrl", event.target.value)
                  }
                  placeholder="http://localhost:8000/v1"
                />
              </label>

              <label>
                <span>Default Model</span>
                <input
                  value={providerForm.defaultModel}
                  onChange={(event) =>
                    updateProviderForm("defaultModel", event.target.value)
                  }
                  placeholder="llama-3.1-local"
                />
              </label>

              <label>
                <span>
                  API Key{" "}
                  {providerForm.id ? "(leave empty to keep current key)" : ""}
                </span>
                <input
                  value={providerForm.apiKey}
                  onChange={(event) =>
                    updateProviderForm("apiKey", event.target.value)
                  }
                  placeholder="secret key"
                  type="password"
                />
              </label>

              <label>
                <span>Capabilities</span>
                <input
                  value={providerForm.capabilitiesText}
                  onChange={(event) =>
                    updateProviderForm("capabilitiesText", event.target.value)
                  }
                  placeholder="chat, coding, image"
                />
              </label>

              <label className="wide">
                <span>Model Aliases</span>
                <textarea
                  value={providerForm.modelAliasesText}
                  onChange={(event) =>
                    updateProviderForm("modelAliasesText", event.target.value)
                  }
                  placeholder={
                    "llama-3.1-local|Llama 3.1 Local|auto\nfast-model|Fast Model|fast"
                  }
                  rows={5}
                />
                <small>Format per line: model-id|label|mode</small>
              </label>

              <label className="llm-provider-checkbox">
                <input
                  type="checkbox"
                  checked={providerForm.enabled}
                  onChange={(event) =>
                    updateProviderForm("enabled", event.target.checked)
                  }
                />
                <span>Enable provider</span>
              </label>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={closeProviderForm}
                disabled={isSavingProvider}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary"
                onClick={handleSaveProvider}
                disabled={isSavingProvider}
              >
                {isSavingProvider ? "Saving..." : "Save Provider"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}