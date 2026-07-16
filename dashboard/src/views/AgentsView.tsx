import { useEffect, useMemo, useState } from "react";
import {
  checkAgentCapability,
  fetchAgentCapabilityContracts,
  updateAgentCapabilityContract,
  type AgentCapabilityCheckResult,
  type AgentCapabilityContract,
  type AgentUnknownIntentPolicy,
  type AgentRefusalStyle,
} from "../services/agentGovernanceApi";

function getBoundaryLabel(contract: AgentCapabilityContract) {
  if (!contract.strictBoundary) {
    return "Flexible";
  }

  if (contract.unknownIntentPolicy === "clarify_or_refuse") {
    return "Strict";
  }

  return "Managed";
}

function getConfidenceLabel(value?: string) {
  if (!value) {
    return "-";
  }

  return value;
}

function uniqueCleanList(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/\s+/g, " "))
    )
  );
}

function parseKeywordText(value: string) {
  return uniqueCleanList(
    value
      .split("\n")
      .flatMap((line) => line.split(","))
      .map((item) => item.trim())
  );
}

function stringifyKeywordList(items: string[]) {
  return items.join("\n");
}

function areStringListsEqual(left: string[], right: string[]) {
  const leftClean = uniqueCleanList(left);
  const rightClean = uniqueCleanList(right);

  if (leftClean.length !== rightClean.length) {
    return false;
  }

  return leftClean.every((item, index) => item === rightClean[index]);
}

function KeywordGroup({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: string[];
  variant?: "default" | "allowed" | "denied" | "soft" | "smalltalk";
}) {
  return (
    <div className="agent-keyword-group">
      <div className="agent-keyword-group-header">
        <strong>{title}</strong>
        <span>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="agent-empty-mini">No keyword configured.</p>
      ) : (
        <div className={`agent-keyword-cloud ${variant}`}>
          {items.map((item) => (
            <span key={`${title}-${item}`}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractSummaryCard({
  contract,
  isActive,
  hasUnsavedChanges,
  onClick,
}: {
  contract: AgentCapabilityContract;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`agent-contract-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <div>
        <span className="agent-contract-eyebrow">{contract.agentName}</span>
        <strong>{contract.displayName}</strong>
        <p>{contract.role}</p>
      </div>

      <div className="agent-contract-meta-row">
        <span>{getBoundaryLabel(contract)}</span>
        <span>{contract.fallbackAgents.length} fallback</span>
        {isActive && hasUnsavedChanges && <span>Unsaved</span>}
      </div>
    </button>
  );
}

function EditableKeywordsPanel({
  selectedContract,
  onSaved,
  onDirtyChange,
}: {
  selectedContract: AgentCapabilityContract;
  onSaved: (contract: AgentCapabilityContract) => void;
  onDirtyChange: (value: boolean) => void;
}) {
  const [allowedKeywordsText, setAllowedKeywordsText] = useState(
    stringifyKeywordList(selectedContract.allowedKeywords)
  );
  const [deniedKeywordsText, setDeniedKeywordsText] = useState(
    stringifyKeywordList(selectedContract.deniedKeywords)
  );
  const [fallbackAgentsText, setFallbackAgentsText] = useState(
    stringifyKeywordList(selectedContract.fallbackAgents)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const parsedAllowedKeywords = parseKeywordText(allowedKeywordsText);
  const parsedDeniedKeywords = parseKeywordText(deniedKeywordsText);
  const parsedFallbackAgents = parseKeywordText(fallbackAgentsText);

  const hasChanges =
    !areStringListsEqual(parsedAllowedKeywords, selectedContract.allowedKeywords) ||
    !areStringListsEqual(parsedDeniedKeywords, selectedContract.deniedKeywords) ||
    !areStringListsEqual(parsedFallbackAgents, selectedContract.fallbackAgents);

  useEffect(() => {
    setAllowedKeywordsText(stringifyKeywordList(selectedContract.allowedKeywords));
    setDeniedKeywordsText(stringifyKeywordList(selectedContract.deniedKeywords));
    setFallbackAgentsText(stringifyKeywordList(selectedContract.fallbackAgents));
    setSaveMessage(null);
    setSaveError(null);
    onDirtyChange(false);
  }, [selectedContract, onDirtyChange]);

  useEffect(() => {
    onDirtyChange(hasChanges);
  }, [hasChanges, onDirtyChange]);

  async function handleSave() {
    if (!hasChanges) {
      setSaveMessage("No keyword changes to save.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const updatedContract = await updateAgentCapabilityContract(
        selectedContract.agentName,
        {
          allowedKeywords: parsedAllowedKeywords,
          deniedKeywords: parsedDeniedKeywords,
          fallbackAgents: parsedFallbackAgents,
        }
      );

      onSaved(updatedContract);
      setSaveMessage("Capability keywords saved.");
      onDirtyChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save capability keywords.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setAllowedKeywordsText(stringifyKeywordList(selectedContract.allowedKeywords));
    setDeniedKeywordsText(stringifyKeywordList(selectedContract.deniedKeywords));
    setFallbackAgentsText(stringifyKeywordList(selectedContract.fallbackAgents));
    setSaveMessage(null);
    setSaveError(null);
    onDirtyChange(false);
  }

  function addVisualDeniedPreset() {
    const nextDenied = uniqueCleanList([
      ...parsedDeniedKeywords,
      "gambar",
      "image",
      "generate gambar",
      "visual",
      "isometric",
      "vehicle",
      "render",
      "3d",
      "illustration",
      "ilustrasi",
      "prompt gambar",
    ]);

    const nextFallbackAgents = uniqueCleanList([
      "image-agent",
      ...parsedFallbackAgents,
    ]);

    setDeniedKeywordsText(stringifyKeywordList(nextDenied));
    setFallbackAgentsText(stringifyKeywordList(nextFallbackAgents));
    setSaveMessage(null);
    setSaveError(null);
  }

  return (
    <section
      className={`agent-governance-editor-card ${
        hasChanges ? "has-unsaved-changes" : ""
      }`}
    >
      <div className="agent-section-title">
        <div>
          <span>Editable rules</span>
          <h3>Capability Keywords Editor</h3>
        </div>

        <div className="agent-editor-actions">
          <button type="button" onClick={addVisualDeniedPreset}>
            Add Visual Denied Preset
          </button>

          <button type="button" onClick={handleReset} disabled={isSaving || !hasChanges}>
            Reset
          </button>

          <button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving..." : hasChanges ? "Save Rules" : "Saved"}
          </button>
        </div>
      </div>

      <div className="agent-enforcement-badge-row">
        <span className="agent-enforcement-badge">Enforced in Widget</span>
        <span className="agent-enforcement-badge">Enforced in WhatsApp</span>
        <span className="agent-enforcement-badge">Enforced in API</span>
        {hasChanges && <span className="agent-unsaved-badge">Unsaved changes</span>}
      </div>

      <p className="agent-editor-note">
        One keyword per line, or comma-separated. Saved rules are enforced by the
        backend for Floating Assistant, WhatsApp, and direct API requests.
      </p>

      <div className="agent-editor-grid">
        <label className="agent-editor-field allowed">
          <span>Allowed Keywords</span>
          <textarea
            value={allowedKeywordsText}
            onChange={(event) => setAllowedKeywordsText(event.target.value)}
            rows={12}
          />
        </label>

        <label className="agent-editor-field denied">
          <span>Denied Keywords</span>
          <textarea
            value={deniedKeywordsText}
            onChange={(event) => setDeniedKeywordsText(event.target.value)}
            rows={12}
          />
        </label>

        <label className="agent-editor-field fallback">
          <span>Fallback Agents</span>
          <textarea
            value={fallbackAgentsText}
            onChange={(event) => setFallbackAgentsText(event.target.value)}
            rows={6}
          />
        </label>
      </div>

      {saveMessage && <div className="agent-editor-success">{saveMessage}</div>}

      {saveError && <div className="agent-governance-error">{saveError}</div>}
    </section>
  );
}

function BoundaryMessagesEditorPanel({
  selectedContract,
  onSaved,
  onDirtyChange,
}: {
  selectedContract: AgentCapabilityContract;
  onSaved: (contract: AgentCapabilityContract) => void;
  onDirtyChange: (value: boolean) => void;
}) {
  const [strictBoundary, setStrictBoundary] = useState(
    selectedContract.strictBoundary
  );
  const [unknownIntentPolicy, setUnknownIntentPolicy] =
    useState<AgentUnknownIntentPolicy>(selectedContract.unknownIntentPolicy);
  const [refusalStyle, setRefusalStyle] = useState<AgentRefusalStyle>(
    selectedContract.refusalStyle
  );
  const [refusalMessage, setRefusalMessage] = useState(
    selectedContract.refusalMessage
  );
  const [unknownIntentMessage, setUnknownIntentMessage] = useState(
    selectedContract.unknownIntentMessage
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasChanges =
    strictBoundary !== selectedContract.strictBoundary ||
    unknownIntentPolicy !== selectedContract.unknownIntentPolicy ||
    refusalStyle !== selectedContract.refusalStyle ||
    refusalMessage !== selectedContract.refusalMessage ||
    unknownIntentMessage !== selectedContract.unknownIntentMessage;

  useEffect(() => {
    setStrictBoundary(selectedContract.strictBoundary);
    setUnknownIntentPolicy(selectedContract.unknownIntentPolicy);
    setRefusalStyle(selectedContract.refusalStyle);
    setRefusalMessage(selectedContract.refusalMessage);
    setUnknownIntentMessage(selectedContract.unknownIntentMessage);
    setSaveMessage(null);
    setSaveError(null);
    onDirtyChange(false);
  }, [selectedContract, onDirtyChange]);

  useEffect(() => {
    onDirtyChange(hasChanges);
  }, [hasChanges, onDirtyChange]);

  async function handleSave() {
    if (!hasChanges) {
      setSaveMessage("No boundary message changes to save.");
      return;
    }

    if (selectedContract.strictBoundary && !strictBoundary) {
      const shouldContinue = window.confirm(
        "Disabling Strict Boundary can allow out-of-scope requests to pass through this agent. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);
      setSaveError(null);

      const updatedContract = await updateAgentCapabilityContract(
        selectedContract.agentName,
        {
          strictBoundary,
          unknownIntentPolicy,
          refusalStyle,
          refusalMessage,
          unknownIntentMessage,
        }
      );

      onSaved(updatedContract);
      setSaveMessage("Boundary messages saved.");
      onDirtyChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save boundary messages.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setStrictBoundary(selectedContract.strictBoundary);
    setUnknownIntentPolicy(selectedContract.unknownIntentPolicy);
    setRefusalStyle(selectedContract.refusalStyle);
    setRefusalMessage(selectedContract.refusalMessage);
    setUnknownIntentMessage(selectedContract.unknownIntentMessage);
    setSaveMessage(null);
    setSaveError(null);
    onDirtyChange(false);
  }

  return (
    <section
      className={`agent-governance-boundary-editor-card ${
        hasChanges ? "has-unsaved-changes" : ""
      }`}
    >
      <div className="agent-section-title">
        <div>
          <span>Boundary behavior</span>
          <h3>Boundary Messages Editor</h3>
        </div>

        <div className="agent-editor-actions">
          <button type="button" onClick={handleReset} disabled={isSaving || !hasChanges}>
            Reset
          </button>

          <button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving..." : hasChanges ? "Save Messages" : "Saved"}
          </button>
        </div>
      </div>

      <div className="agent-enforcement-badge-row">
        <span className="agent-enforcement-badge">Runtime enforced</span>
        <span className="agent-enforcement-badge">Widget + WhatsApp</span>
        {hasChanges && <span className="agent-unsaved-badge">Unsaved changes</span>}
      </div>

      <p className="agent-editor-note">
        These messages are used when the backend blocks an out-of-scope request.
        The same behavior applies to Floating Assistant, WhatsApp, and direct API
        requests.
      </p>

      <div className="agent-boundary-safety-note">
        <strong>Safety note:</strong>
        <span>
          Keep Strict Boundary enabled for role-specific agents. Disable only if
          this agent is intentionally allowed to handle broad or exploratory
          requests.
        </span>
      </div>

      <div className="agent-boundary-controls-grid">
        <label className="agent-boundary-toggle">
          <span>Strict Boundary</span>
          <select
            value={strictBoundary ? "true" : "false"}
            onChange={(event) => setStrictBoundary(event.target.value === "true")}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label className="agent-boundary-toggle">
          <span>Unknown Intent Policy</span>
          <select
            value={unknownIntentPolicy}
            onChange={(event) =>
              setUnknownIntentPolicy(event.target.value as AgentUnknownIntentPolicy)
            }
          >
            <option value="clarify_or_refuse">Clarify or refuse</option>
            <option value="allow">Allow</option>
          </select>
        </label>

        <label className="agent-boundary-toggle">
          <span>Refusal Style</span>
          <select
            value={refusalStyle}
            onChange={(event) =>
              setRefusalStyle(event.target.value as AgentRefusalStyle)
            }
          >
            <option value="polite_redirect">Polite redirect</option>
            <option value="polite_decline">Polite decline</option>
          </select>
        </label>
      </div>

      <div className="agent-boundary-message-grid">
        <label className="agent-editor-field boundary-message">
          <span>Denied intent message</span>
          <textarea
            value={refusalMessage}
            onChange={(event) => setRefusalMessage(event.target.value)}
            rows={6}
          />
        </label>

        <label className="agent-editor-field boundary-message">
          <span>Unknown intent message</span>
          <textarea
            value={unknownIntentMessage}
            onChange={(event) => setUnknownIntentMessage(event.target.value)}
            rows={6}
          />
        </label>
      </div>

      {saveMessage && <div className="agent-editor-success">{saveMessage}</div>}

      {saveError && <div className="agent-governance-error">{saveError}</div>}
    </section>
  );
}

function GovernanceCheckPanel({
  selectedContract,
}: {
  selectedContract: AgentCapabilityContract;
}) {
  const [inputText, setInputText] = useState(
    `@${selectedContract.agentName} buatkan satu kalimat promosi singkat untuk kopi susu`
  );
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] =
    useState<AgentCapabilityCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setInputText(
      `@${selectedContract.agentName} buatkan satu kalimat promosi singkat untuk kopi susu`
    );
    setCheckResult(null);
    setErrorMessage(null);
  }, [selectedContract.agentName]);

  async function handleCheck() {
    const trimmedInput = inputText.trim();

    if (!trimmedInput) {
      setErrorMessage("Input wajib diisi.");
      return;
    }

    try {
      setIsChecking(true);
      setErrorMessage(null);

      const result = await checkAgentCapability({
        agentName: selectedContract.agentName,
        inputText: trimmedInput,
      });

      setCheckResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run check.";

      setErrorMessage(message);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="agent-governance-check-card">
      <div className="agent-section-title">
        <div>
          <span>Capability tester</span>
          <h3>Test Governance Boundary</h3>
        </div>

        <button type="button" onClick={handleCheck} disabled={isChecking}>
          {isChecking ? "Checking..." : "Run Check"}
        </button>
      </div>

      <textarea
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        rows={4}
        placeholder={`@${selectedContract.agentName} ...`}
      />

      <div className="agent-test-shortcuts">
        <button
          type="button"
          onClick={() =>
            setInputText(
              `@${selectedContract.agentName} buatkan satu kalimat promosi singkat untuk kopi susu`
            )
          }
        >
          Allowed sample
        </button>

        <button
          type="button"
          onClick={() =>
            setInputText(
              `@${selectedContract.agentName} debug error prisma migration di backend`
            )
          }
        >
          Technical denied
        </button>

        <button
          type="button"
          onClick={() =>
            setInputText(
              `@${selectedContract.agentName} generate gambar isometricon sebuah vehicle`
            )
          }
        >
          Visual denied
        </button>
      </div>

      {errorMessage && (
        <div className="agent-governance-error">{errorMessage}</div>
      )}

      {checkResult && (
        <div
          className={`agent-check-result ${
            checkResult.allowed ? "allowed" : "denied"
          }`}
        >
          <div className="agent-check-result-header">
            <div>
              <span>Result</span>
              <strong>{checkResult.allowed ? "Allowed" : "Denied"}</strong>
            </div>

            <span className="agent-check-confidence">
              {getConfidenceLabel(checkResult.confidence)}
            </span>
          </div>

          <p>{checkResult.reason}</p>

          {checkResult.refusalMessage && (
            <div className="agent-refusal-preview">
              <span>Refusal message</span>
              <p>{checkResult.refusalMessage}</p>
            </div>
          )}

          <div className="agent-check-matches">
            <KeywordGroup
              title="Matched allowed"
              items={checkResult.matchedAllowedKeywords}
              variant="allowed"
            />

            <KeywordGroup
              title="Matched denied"
              items={checkResult.matchedDeniedKeywords}
              variant="denied"
            />

            <KeywordGroup
              title="Matched soft"
              items={checkResult.matchedSoftAllowedKeywords}
              variant="soft"
            />

            <KeywordGroup
              title="Suggested agents"
              items={checkResult.suggestedAgents}
              variant="default"
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function AgentsView() {
  const [contracts, setContracts] = useState<AgentCapabilityContract[]>([]);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keywordEditorDirty, setKeywordEditorDirty] = useState(false);
  const [boundaryEditorDirty, setBoundaryEditorDirty] = useState(false);

  const hasUnsavedChanges = keywordEditorDirty || boundaryEditorDirty;

  const selectedContract = useMemo(() => {
    if (contracts.length === 0) {
      return null;
    }

    return (
      contracts.find((contract) => contract.agentName === selectedAgentName) ||
      contracts[0]
    );
  }, [contracts, selectedAgentName]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  async function loadContracts(isSilent = false) {
    if (hasUnsavedChanges) {
      const shouldContinue = window.confirm(
        "There are unsaved governance changes. Refreshing will discard them. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const data = await fetchAgentCapabilityContracts();

      setContracts(data);

      setSelectedAgentName((currentSelectedAgentName) => {
        if (currentSelectedAgentName) {
          return currentSelectedAgentName;
        }

        return data[0]?.agentName || null;
      });

      setKeywordEditorDirty(false);
      setBoundaryEditorDirty(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load agent governance data.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function handleContractSaved(updatedContract: AgentCapabilityContract) {
    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.agentName === updatedContract.agentName
          ? updatedContract
          : contract
      )
    );

    setSelectedAgentName(updatedContract.agentName);
  }

  function handleSelectContract(agentName: string) {
    if (agentName === selectedAgentName) {
      return;
    }

    if (hasUnsavedChanges) {
      const shouldContinue = window.confirm(
        "There are unsaved governance changes. Switching agents will discard them. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setKeywordEditorDirty(false);
    setBoundaryEditorDirty(false);
    setSelectedAgentName(agentName);
  }

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="agents-governance-view">
      <div className="agents-governance-hero">
        <div>
          <span className="agents-governance-eyebrow">Agent Governance</span>
          <h1>Agents Capability Control Center</h1>
          <p>
            Monitor and tune agent capability rules. Saved rules are enforced by
            the backend for Floating Assistant, WhatsApp, and direct API
            requests.
          </p>

          <div className="agent-enforcement-badge-row hero-badges">
            <span className="agent-enforcement-badge">Backend enforced</span>
            <span className="agent-enforcement-badge">Widget protected</span>
            <span className="agent-enforcement-badge">WhatsApp protected</span>
            {hasUnsavedChanges && (
              <span className="agent-unsaved-badge">Unsaved changes</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadContracts(true)}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <div className="agent-governance-error">
          <strong>Agents governance error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="agent-governance-loading">
          Loading agent capability contracts...
        </div>
      ) : contracts.length === 0 ? (
        <div className="agent-governance-empty">
          <strong>No agent capability contract found.</strong>
          <p>Run the backend seed script for agent capability contracts.</p>
        </div>
      ) : (
        <div className="agents-governance-layout">
          <aside className="agent-contract-list">
            {contracts.map((contract) => (
              <ContractSummaryCard
                key={contract.agentName}
                contract={contract}
                isActive={selectedContract?.agentName === contract.agentName}
                hasUnsavedChanges={
                  selectedContract?.agentName === contract.agentName &&
                  hasUnsavedChanges
                }
                onClick={() => handleSelectContract(contract.agentName)}
              />
            ))}
          </aside>

          {selectedContract && (
            <main className="agent-contract-detail">
              <section className="agent-contract-main-card">
                <div className="agent-contract-detail-header">
                  <div>
                    <span>{selectedContract.agentName}</span>
                    <h2>{selectedContract.displayName}</h2>
                    <p>{selectedContract.description}</p>
                  </div>

                  <div className="agent-boundary-badge">
                    {getBoundaryLabel(selectedContract)}
                  </div>
                </div>

                <div className="agent-contract-info-grid">
                  <div>
                    <span>Role</span>
                    <strong>{selectedContract.role}</strong>
                  </div>

                  <div>
                    <span>Unknown Intent</span>
                    <strong>{selectedContract.unknownIntentPolicy}</strong>
                  </div>

                  <div>
                    <span>Refusal Style</span>
                    <strong>{selectedContract.refusalStyle}</strong>
                  </div>

                  <div>
                    <span>Primary Skills</span>
                    <strong>
                      {selectedContract.primarySkills.length > 0
                        ? selectedContract.primarySkills.join(", ")
                        : "-"}
                    </strong>
                  </div>
                </div>

                <div className="agent-message-preview-grid">
                  <div>
                    <span>Refusal message</span>
                    <p>{selectedContract.refusalMessage}</p>
                  </div>

                  <div>
                    <span>Unknown intent message</span>
                    <p>{selectedContract.unknownIntentMessage}</p>
                  </div>
                </div>
              </section>

              <EditableKeywordsPanel
                selectedContract={selectedContract}
                onSaved={handleContractSaved}
                onDirtyChange={setKeywordEditorDirty}
              />

              <BoundaryMessagesEditorPanel
                selectedContract={selectedContract}
                onSaved={handleContractSaved}
                onDirtyChange={setBoundaryEditorDirty}
              />

              <section className="agent-keyword-section">
                <KeywordGroup
                  title="Allowed Domains"
                  items={selectedContract.allowedDomains}
                  variant="allowed"
                />

                <KeywordGroup
                  title="Denied Domains"
                  items={selectedContract.deniedDomains}
                  variant="denied"
                />

                <KeywordGroup
                  title="Allowed Keywords"
                  items={selectedContract.allowedKeywords}
                  variant="allowed"
                />

                <KeywordGroup
                  title="Denied Keywords"
                  items={selectedContract.deniedKeywords}
                  variant="denied"
                />

                <KeywordGroup
                  title="Soft Allowed Keywords"
                  items={selectedContract.softAllowedKeywords}
                  variant="soft"
                />

                <KeywordGroup
                  title="Small Talk Keywords"
                  items={selectedContract.safeSmallTalkKeywords}
                  variant="smalltalk"
                />

                <KeywordGroup
                  title="Fallback Agents"
                  items={selectedContract.fallbackAgents}
                  variant="default"
                />
              </section>

              <GovernanceCheckPanel selectedContract={selectedContract} />
            </main>
          )}
        </div>
      )}
    </section>
  );
}