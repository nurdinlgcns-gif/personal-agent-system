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
import {
  ActionButton,
  EmptyState,
  ErrorState,
  InfoPill,
  MetricCard,
  MetricGrid,
  PageHero,
  PageShell,
  PanelCard,
} from "../components/ui";

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

function parseCapabilities(inputText: string) {
  return inputText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyCapabilities(capabilities: string[]) {
  return capabilities.join(", ");
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

function getRegistryProviderTone(provider: DynamicLlmProvider) {
  if (!provider.enabled) {
    return "red";
  }

  if (provider.type === "anthropic") {
    return "yellow";
  }

  if (provider.type === "google") {
    return "green";
  }

  if (provider.type === "fal") {
    return "purple";
  }

  return "blue";
}

function CompactCapabilityList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="settings-muted">none</span>;
  }

  return (
    <div className="settings-pill-row">
      {values.slice(0, 4).map((value) => (
        <span key={value}>{value}</span>
      ))}
      {values.length > 4 && <span>+{values.length - 4}</span>}
    </div>
  );
}

function ProviderDetailsModal({
  provider,
  onClose,
  onEdit,
  onTest,
  onToggle,
  onDelete,
  isActionRunning,
}: {
  provider: DynamicLlmProvider;
  onClose: () => void;
  onEdit: (provider: DynamicLlmProvider) => void;
  onTest: (provider: DynamicLlmProvider) => void;
  onToggle: (provider: DynamicLlmProvider) => void;
  onDelete: (provider: DynamicLlmProvider) => void;
  isActionRunning: boolean;
}) {
  return (
    <div className="llm-provider-modal-backdrop">
      <section className="llm-provider-modal provider-detail-modal">
        <header>
          <div>
            <span>Provider Details</span>
            <h2>{provider.name}</h2>
            <p>
              Registry / {provider.type} ·{" "}
              {provider.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close provider details"
          >
            ×
          </button>
        </header>

        <div className="settings-detail-grid">
          <div>
            <span>Provider ID</span>
            <strong>{provider.id}</strong>
          </div>

          <div>
            <span>Type</span>
            <strong>{provider.type}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{provider.enabled ? "Enabled" : "Disabled"}</strong>
          </div>

          <div>
            <span>Default Model</span>
            <strong>{provider.defaultModel || "auto"}</strong>
          </div>

          <div>
            <span>API Key</span>
            <strong>{provider.apiKeyPreview || "not configured"}</strong>
          </div>

          <div>
            <span>Base URL</span>
            <strong>{provider.baseUrl || "-"}</strong>
          </div>
        </div>

        <div className="settings-detail-section">
          <span>Capabilities</span>
          <CompactCapabilityList values={provider.capabilities || []} />
        </div>

        <div className="settings-detail-section">
          <span>Models</span>

          {provider.modelAliases.length === 0 ? (
            <EmptyState
              title="No model aliases"
              description="Add model aliases from Edit Provider."
            />
          ) : (
            <div className="settings-model-table">
              {provider.modelAliases.map((model) => (
                <div key={model.id} className="settings-model-row">
                  <div>
                    <strong>{model.label}</strong>
                    <small>{model.id}</small>
                  </div>
                  <span>{model.mode || "auto"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer>
          <button
            type="button"
            className="secondary"
            onClick={() => onTest(provider)}
            disabled={isActionRunning}
          >
            Test
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => onEdit(provider)}
            disabled={isActionRunning}
          >
            Edit
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => onToggle(provider)}
            disabled={isActionRunning}
          >
            {provider.enabled ? "Disable" : "Enable"}
          </button>

          <button
            type="button"
            className="danger"
            onClick={() => onDelete(provider)}
            disabled={isActionRunning}
          >
            Delete
          </button>
        </footer>
      </section>
    </div>
  );
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

  const [selectedProvider, setSelectedProvider] =
    useState<DynamicLlmProvider | null>(null);

  const configuredCount = useMemo(() => {
    return (
      providersData?.providers.filter((provider) => provider.configured)
        .length || 0
    );
  }, [providersData]);

  const enabledRegistryCount = useMemo(() => {
    return registryProviders.filter((provider) => provider.enabled).length;
  }, [registryProviders]);

  const providerTypeOptions = useMemo(() => {
    return Array.from(new Set(registryProviders.map((provider) => provider.type)));
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
    setSelectedProvider(null);
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
      [key]: value, // <-- Perubahan di sini, bungkus key dengan [ ]
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
      setSelectedProvider(null);
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
      setSelectedProvider(null);
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
    <PageShell full className="settings-view settings-provider-page">
      <PageHero
        eyebrow="System Settings"
        title="Provider Registry Control Center"
        description="Manage AI providers with a clean registry-first workflow. Bootstrap .env providers stay available for local development and fallback."
        badges={
          <>
            <InfoPill>Registry-first</InfoPill>
            <InfoPill tone="green">Providers</InfoPill>
            <InfoPill tone="purple">Models</InfoPill>
            <InfoPill tone="yellow">Fallback</InfoPill>
          </>
        }
        actions={
          <ActionButton
            onClick={refreshAll}
            disabled={isLoading || isRefreshing || isRegistryLoading}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ActionButton>
        }
      />

      {errorMessage && (
        <ErrorState title="Settings error" message={errorMessage} />
      )}

      {isLoading && (
        <div className="settings-loading-card">
          <span className="loading-spinner" />
          Loading LLM provider configuration...
        </div>
      )}

      {!isLoading && providersData && (
        <>
          <PanelCard accent="blue" compact className="settings-strategy-panel">
            <MetricGrid>
              <MetricCard label="Strategy" value="Registry-first" />
              <MetricCard label="Default Provider" value={providersData.defaultProvider} />
              <MetricCard label="Default Model" value={providersData.defaultModel} />
              <MetricCard
                label="Env Bootstrap"
                value={`${configuredCount}/${providersData.providers.length}`}
              />
              <MetricCard label="Registry Providers" value={registryProviders.length} />
              <MetricCard
                label="Registry Enabled"
                value={`${enabledRegistryCount}/${registryProviders.length}`}
              />
            </MetricGrid>

            <details className="settings-strategy-details">
              <summary>Show strategy details</summary>
              <div>
                <p>
                  Claude and Gemini from <code>.env</code> are bootstrap
                  providers for local development and fallback. New custom,
                  local, OpenAI-compatible, and media providers should be
                  managed from Dynamic Provider Registry.
                </p>
                <p>
                  Final direction: one provider registry. The runtime resolver
                  should read enabled providers from the registry, then select
                  provider/model based on user preference, agent preference, or
                  default fallback.
                </p>
              </div>
            </details>
          </PanelCard>

          <PanelCard accent="purple" compact className="settings-env-panel">
            <div className="settings-section-row">
              <div>
                <span>Environment bootstrap providers</span>
                <h2>Claude and Gemini from backend .env</h2>
                <p>
                  Compact bootstrap status. Use Test only when you need to
                  validate local fallback provider access.
                </p>
              </div>
            </div>

            <div className="settings-table env-provider-table">
              <div className="settings-table-row header">
                <span>Provider</span>
                <span>Status</span>
                <span>Default Model</span>
                <span>Aliases</span>
                <span>API Key</span>
                <span>Actions</span>
              </div>

              {providersData.providers.map((provider) => (
                <div key={provider.provider} className="settings-table-row">
                  <div>
                    <strong>{provider.displayName}</strong>
                    <small>ENV / {provider.provider}</small>
                  </div>

                  <div>
                    <span
                      className={`llm-status-pill ${
                        provider.configured ? "ready" : "missing"
                      }`}
                    >
                      {provider.configured ? "Configured" : "Missing Key"}
                    </span>
                  </div>

                  <div>{provider.defaultModel}</div>
                  <div>{provider.availableModels.length} aliases</div>
                  <div>{getProviderKeyPreview(providersData, provider)}</div>

                  <div className="settings-table-actions">
                    <button
                      type="button"
                      onClick={() => handlePreview(provider)}
                      disabled={previewLoadingProvider === provider.provider}
                    >
                      {previewLoadingProvider === provider.provider
                        ? "Testing..."
                        : "Test"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

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

      <PanelCard accent="blue" compact className="settings-registry-panel">
        <div className="settings-section-row">
          <div>
            <span>Future source of truth</span>
            <h2>Dynamic Provider Registry</h2>
            <p>
              Add and manage providers for local LLM, OpenAI-compatible
              endpoints, custom HTTP providers, Claude/Gemini registry entries,
              and media providers like fal.ai.
            </p>
          </div>

          <ActionButton onClick={openCreateProviderForm}>Add Provider</ActionButton>
        </div>

        {providerTypeOptions.length > 0 && (
          <div className="settings-provider-type-strip">
            {providerTypeOptions.map((providerType) => (
              <span key={providerType}>{providerType}</span>
            ))}
          </div>
        )}

        {isRegistryLoading ? (
          <div className="settings-loading-card">
            <span className="loading-spinner" />
            Loading dynamic provider registry...
          </div>
        ) : registryProviders.length === 0 ? (
          <EmptyState
            title="No dynamic provider registered yet."
            description="Add a custom provider such as Local vLLM, OpenAI-compatible API, fal.ai, or your own HTTP endpoint."
          />
        ) : (
          <div className="settings-registry-table">
            <div className="settings-registry-row header">
              <span>Provider</span>
              <span>Type</span>
              <span>Status</span>
              <span>Default Model</span>
              <span>Capabilities</span>
              <span>Models</span>
              <span>Actions</span>
            </div>

            {registryProviders.map((provider) => (
              <div key={provider.id} className="settings-registry-row">
                <div>
                  <strong>{provider.name}</strong>
                  <small>Registry / {provider.type}</small>
                </div>

                <div>{provider.type}</div>

                <div>
                  <InfoPill tone={getRegistryProviderTone(provider)}>
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </InfoPill>
                </div>

                <div>{provider.defaultModel || "auto"}</div>

                <CompactCapabilityList values={provider.capabilities || []} />

                <div>{provider.modelAliases.length} models</div>

                <div className="settings-table-actions">
                  <button type="button" onClick={() => setSelectedProvider(provider)}>
                    Details
                  </button>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      {registryTestResult && (
        <div className="llm-preview-result">
          <div>
            <span>Registry Test</span>
            <strong>Dynamic Provider Test Result</strong>
          </div>

          <p>{registryTestResult}</p>
        </div>
      )}

      {selectedProvider && (
        <ProviderDetailsModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onEdit={openEditProviderForm}
          onTest={handleTestRegistryProvider}
          onToggle={handleToggleProvider}
          onDelete={handleDeleteProvider}
          isActionRunning={registryActionId === selectedProvider.id}
        />
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
    </PageShell>
  );
}