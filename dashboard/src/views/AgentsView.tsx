import { useEffect, useMemo, useState } from "react";
import {
  checkAgentCapability,
  fetchAgentCapabilityContracts,
  type AgentCapabilityCheckResult,
  type AgentCapabilityContract,
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
  onClick,
}: {
  contract: AgentCapabilityContract;
  isActive: boolean;
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
      </div>
    </button>
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

  const selectedContract = useMemo(() => {
    if (contracts.length === 0) {
      return null;
    }

    return (
      contracts.find((contract) => contract.agentName === selectedAgentName) ||
      contracts[0]
    );
  }, [contracts, selectedAgentName]);

  async function loadContracts(isSilent = false) {
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

  useEffect(() => {
    loadContracts();
  }, []);

  return (
    <section className="agents-governance-view">
      <div className="agents-governance-hero">
        <div>
          <span className="agents-governance-eyebrow">
            Agent Governance
          </span>
          <h1>Agents Capability Control Center</h1>
          <p>
            Monitor agent capability contracts, boundary rules, fallback agents,
            and runtime governance checks. This page is read-only for now. Rule
            editing will be enabled in the next phase.
          </p>
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
                onClick={() => setSelectedAgentName(contract.agentName)}
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