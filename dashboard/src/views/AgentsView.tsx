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
import {
  ActionButton,
  EmptyState,
  ErrorState,
  FilterGrid,
  FormField,
  InfoPill,
  PageHero,
  PageShell,
  PanelCard,
} from "../components/ui";

const AGENTS_PAGE_SIZE = 10;

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

function truncateText(value?: string | null, maxLength = 130) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
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

function getBoundaryTone(contract: AgentCapabilityContract) {
  const label = getBoundaryLabel(contract);

  if (label === "Strict") {
    return "strict";
  }

  if (label === "Flexible") {
    return "flexible";
  }

  return "managed";
}

function getPolicyLabel(policy: AgentUnknownIntentPolicy) {
  if (policy === "clarify_or_refuse") {
    return "Clarify/refuse";
  }

  return "Allow";
}

function keywordTotal(contract: AgentCapabilityContract) {
  return (
    contract.allowedKeywords.length +
    contract.deniedKeywords.length +
    contract.softAllowedKeywords.length +
    contract.safeSmallTalkKeywords.length
  );
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
              title="Matched skills"
              items={checkResult.matchedSkillNames}
              variant="allowed"
            />

            <KeywordGroup
              title="Skill signals"
              items={checkResult.matchedSkillSignals}
              variant="soft"
            />

            <KeywordGroup
              title="Suggested agents"
              items={checkResult.suggestedAgents}
              variant="default"
            />
          </div>

          {checkResult.memoryContext && (
            <div className="agent-memory-preview">
              <div className="agent-memory-preview-header">
                <div>
                  <span>Memory resolver preview</span>
                  <strong>
                    {checkResult.memoryContext.returnedCount} /{" "}
                    {checkResult.memoryContext.eligibleCount} eligible memories
                  </strong>
                </div>

                <span>{checkResult.memoryContext.source}</span>
              </div>

              {checkResult.memoryContext.memories.length === 0 ? (
                <p className="agent-memory-preview-empty">
                  No runtime-eligible memory found for this request.
                </p>
              ) : (
                <div className="agent-memory-preview-list">
                  {checkResult.memoryContext.memories.map((memory) => (
                    <div key={memory.id} className="agent-memory-preview-item">
                      <div className="agent-memory-preview-item-header">
                        <strong>
                          @{memory.agentName} · {memory.type}
                        </strong>
                        <span>score {memory.score}</span>
                      </div>

                      <p>{memory.content}</p>

                      <div className="agent-memory-preview-pills">
                        <span>{memory.scope}</span>
                        <span>{memory.sensitivityLevel}</span>
                        {memory.runtimeInjectable && <span>runtime</span>}
                        {memory.ragEnabled && <span>rag</span>}
                        {memory.matchReasons.map((reason) => (
                          <span key={`${memory.id}-${reason}`}>{reason}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AgentDetailsModal({
  contract,
  onClose,
  onSaved,
  onDirtyChange,
}: {
  contract: AgentCapabilityContract;
  onClose: () => void;
  onSaved: (contract: AgentCapabilityContract) => void;
  onDirtyChange: (type: "keyword" | "boundary", value: boolean) => void;
}) {
  return (
    <div className="agents-modal-backdrop">
      <section className="agents-modal">
        <header>
          <div>
            <span>Agent Detail</span>
            <h2>{contract.displayName}</h2>
            <p>{contract.description}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close agent details">
            ×
          </button>
        </header>

        <div className="agents-detail-grid">
          <div>
            <span>Agent</span>
            <strong>@{contract.agentName}</strong>
          </div>

          <div>
            <span>Role</span>
            <strong>{contract.role}</strong>
          </div>

          <div>
            <span>Boundary</span>
            <strong>{getBoundaryLabel(contract)}</strong>
          </div>

          <div>
            <span>Unknown Intent</span>
            <strong>{contract.unknownIntentPolicy}</strong>
          </div>

          <div>
            <span>Refusal Style</span>
            <strong>{contract.refusalStyle}</strong>
          </div>

          <div>
            <span>Primary Skills</span>
            <strong>
              {contract.primarySkills.length > 0
                ? contract.primarySkills.join(", ")
                : "-"}
            </strong>
          </div>
        </div>

        <div className="agents-message-preview-grid">
          <div>
            <span>Refusal message</span>
            <p>{contract.refusalMessage}</p>
          </div>

          <div>
            <span>Unknown intent message</span>
            <p>{contract.unknownIntentMessage}</p>
          </div>
        </div>

        <EditableKeywordsPanel
          selectedContract={contract}
          onSaved={onSaved}
          onDirtyChange={(value) => onDirtyChange("keyword", value)}
        />

        <BoundaryMessagesEditorPanel
          selectedContract={contract}
          onSaved={onSaved}
          onDirtyChange={(value) => onDirtyChange("boundary", value)}
        />

        <section className="agent-keyword-section">
          <KeywordGroup
            title="Allowed Domains"
            items={contract.allowedDomains}
            variant="allowed"
          />

          <KeywordGroup
            title="Denied Domains"
            items={contract.deniedDomains}
            variant="denied"
          />

          <KeywordGroup
            title="Allowed Keywords"
            items={contract.allowedKeywords}
            variant="allowed"
          />

          <KeywordGroup
            title="Denied Keywords"
            items={contract.deniedKeywords}
            variant="denied"
          />

          <KeywordGroup
            title="Soft Allowed Keywords"
            items={contract.softAllowedKeywords}
            variant="soft"
          />

          <KeywordGroup
            title="Small Talk Keywords"
            items={contract.safeSmallTalkKeywords}
            variant="smalltalk"
          />

          <KeywordGroup
            title="Fallback Agents"
            items={contract.fallbackAgents}
            variant="default"
          />
        </section>

        <GovernanceCheckPanel selectedContract={contract} />
      </section>
    </div>
  );
}

export function AgentsView() {
  const [contracts, setContracts] = useState<AgentCapabilityContract[]>([]);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [boundaryFilter, setBoundaryFilter] = useState("all");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keywordEditorDirty, setKeywordEditorDirty] = useState(false);
  const [boundaryEditorDirty, setBoundaryEditorDirty] = useState(false);

  const hasUnsavedChanges = keywordEditorDirty || boundaryEditorDirty;

  const selectedContract = useMemo(() => {
    if (!selectedAgentName) {
      return null;
    }

    return (
      contracts.find((contract) => contract.agentName === selectedAgentName) ||
      null
    );
  }, [contracts, selectedAgentName]);

  const filteredContracts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const boundary = getBoundaryLabel(contract);

      const matchesSearch =
        !normalizedSearch ||
        contract.agentName.toLowerCase().includes(normalizedSearch) ||
        contract.displayName.toLowerCase().includes(normalizedSearch) ||
        contract.role.toLowerCase().includes(normalizedSearch) ||
        contract.description.toLowerCase().includes(normalizedSearch) ||
        contract.primarySkills.join(" ").toLowerCase().includes(normalizedSearch);

      const matchesBoundary =
        boundaryFilter === "all" || boundary === boundaryFilter;

      const matchesPolicy =
        policyFilter === "all" || contract.unknownIntentPolicy === policyFilter;

      return matchesSearch && matchesBoundary && matchesPolicy;
    });
  }, [contracts, search, boundaryFilter, policyFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContracts.length / AGENTS_PAGE_SIZE)
  );

  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (normalizedCurrentPage - 1) * AGENTS_PAGE_SIZE;
  const pageEndIndex = Math.min(
    pageStartIndex + AGENTS_PAGE_SIZE,
    filteredContracts.length
  );
  const paginatedContracts = filteredContracts.slice(pageStartIndex, pageEndIndex);

  const boundaryOptions = useMemo(() => {
    return uniqueSorted(contracts.map((contract) => getBoundaryLabel(contract)));
  }, [contracts]);

  const strictCount = contracts.filter(
    (contract) => getBoundaryLabel(contract) === "Strict"
  ).length;

  const managedCount = contracts.filter(
    (contract) => getBoundaryLabel(contract) === "Managed"
  ).length;

  const flexibleCount = contracts.filter(
    (contract) => getBoundaryLabel(contract) === "Flexible"
  ).length;

  const clarifyPolicyCount = contracts.filter(
    (contract) => contract.unknownIntentPolicy === "clarify_or_refuse"
  ).length;

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
        if (
          currentSelectedAgentName &&
          data.some((contract) => contract.agentName === currentSelectedAgentName)
        ) {
          return currentSelectedAgentName;
        }

        return null;
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
    setSelectedAgentName(agentName);
  }

  function handleCloseModal() {
    if (hasUnsavedChanges) {
      const shouldContinue = window.confirm(
        "There are unsaved governance changes. Closing will discard unsaved local edits. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setKeywordEditorDirty(false);
    setBoundaryEditorDirty(false);
    setSelectedAgentName(null);
  }

  function handleModalDirtyChange(type: "keyword" | "boundary", value: boolean) {
    if (type === "keyword") {
      setKeywordEditorDirty(value);
      return;
    }

    setBoundaryEditorDirty(value);
  }

  function clearFilters() {
    setSearch("");
    setBoundaryFilter("all");
    setPolicyFilter("all");
    setCurrentPage(1);
  }

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <PageShell full className="agents-governance-view agents-polish-page">
      <PageHero
        eyebrow="Agent Governance"
        title="Agents Capability Control Center"
        description="Monitor and tune agent capability rules. Saved rules are enforced by the backend for Floating Assistant, WhatsApp, and direct API requests."
        badges={
          <>
            <InfoPill>Backend enforced</InfoPill>
            <InfoPill tone="green">Widget protected</InfoPill>
            <InfoPill tone="purple">WhatsApp protected</InfoPill>
            {hasUnsavedChanges && <InfoPill tone="yellow">Unsaved changes</InfoPill>}
          </>
        }
        actions={
          <ActionButton
            onClick={() => loadContracts(true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ActionButton>
        }
      />

      {errorMessage && (
        <ErrorState title="Agents governance error" message={errorMessage} />
      )}

      <PanelCard accent="blue" compact className="agents-summary-panel">
        <div className="agents-summary-table">
          <div>
            <span>Total</span>
            <strong>{contracts.length}</strong>
          </div>

          <div>
            <span>Filtered</span>
            <strong>{filteredContracts.length}</strong>
          </div>

          <div>
            <span>Strict</span>
            <strong>{strictCount}</strong>
          </div>

          <div>
            <span>Managed</span>
            <strong>{managedCount}</strong>
          </div>

          <div>
            <span>Flexible</span>
            <strong>{flexibleCount}</strong>
          </div>

          <div>
            <span>Clarify/refuse</span>
            <strong>{clarifyPolicyCount}</strong>
          </div>
        </div>
      </PanelCard>

      <PanelCard accent="blue" compact className="agents-filter-panel">
        <FilterGrid>
          <FormField label="Search" wide>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search agent, role, description, or skill..."
            />
          </FormField>

          <FormField label="Boundary">
            <select
              value={boundaryFilter}
              onChange={(event) => {
                setBoundaryFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All boundaries</option>
              {boundaryOptions.map((boundary) => (
                <option key={boundary} value={boundary}>
                  {boundary}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Policy">
            <select
              value={policyFilter}
              onChange={(event) => {
                setPolicyFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All policies</option>
              <option value="clarify_or_refuse">Clarify/refuse</option>
              <option value="allow">Allow</option>
            </select>
          </FormField>
        </FilterGrid>

        <div className="agents-filter-actions">
          <ActionButton
            onClick={() => {
              setCurrentPage(1);
              loadContracts(true);
            }}
          >
            Apply Filters
          </ActionButton>

          <ActionButton tone="ghost" onClick={clearFilters}>
            Clear Filters
          </ActionButton>
        </div>
      </PanelCard>

      {isLoading ? (
        <div className="agent-governance-loading">
          Loading agent capability contracts...
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          title="No agent capability contract found."
          description="Run the backend seed script for agent capability contracts."
        />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="No agents matched your filters."
          description="Try clearing filters or searching with different terms."
        />
      ) : (
        <PanelCard accent="blue" compact className="agents-table-panel">
          <div className="agents-table">
            <div className="agents-table-row header">
              <span>Agent</span>
              <span>Role</span>
              <span>Boundary</span>
              <span>Policy</span>
              <span>Skills</span>
              <span>Keywords</span>
              <span>Fallback</span>
              <span>Action</span>
            </div>

            {paginatedContracts.map((contract) => (
              <button
                type="button"
                key={contract.agentName}
                className="agents-table-row"
                onClick={() => handleSelectContract(contract.agentName)}
              >
                <span className="agent-name">
                  <strong>{contract.displayName}</strong>
                  <small>@{contract.agentName}</small>
                </span>

                <span className="role">{truncateText(contract.role, 90)}</span>

                <span>
                  <strong className={`agents-boundary-status ${getBoundaryTone(contract)}`}>
                    {getBoundaryLabel(contract)}
                  </strong>
                </span>

                <span>{getPolicyLabel(contract.unknownIntentPolicy)}</span>

                <span>
                  {contract.primarySkills.length > 0
                    ? truncateText(contract.primarySkills.join(", "), 110)
                    : "-"}
                </span>

                <span>{keywordTotal(contract)} keywords</span>

                <span>{contract.fallbackAgents.length} fallback</span>

                <span>
                  <strong className="agents-table-details">Details</strong>
                </span>
              </button>
            ))}
          </div>

          <div className="agents-table-pagination">
            <div>
              Showing{" "}
              <strong>
                {filteredContracts.length === 0 ? 0 : pageStartIndex + 1}
              </strong>{" "}
              to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{filteredContracts.length}</strong> agents
            </div>

            <div className="agents-table-pagination-actions">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((current) => Math.max(1, current - 1))
                }
                disabled={normalizedCurrentPage <= 1}
              >
                Previous
              </button>

              <span>
                Page {normalizedCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={normalizedCurrentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </PanelCard>
      )}

      {selectedContract && (
        <AgentDetailsModal
          contract={selectedContract}
          onClose={handleCloseModal}
          onSaved={handleContractSaved}
          onDirtyChange={handleModalDirtyChange}
        />
      )}
    </PageShell>
  );
}