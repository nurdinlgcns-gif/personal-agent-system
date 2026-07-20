import { useEffect, useMemo, useState } from "react";
import {
  fetchKnowledgeSourceImportHistory,
  fetchKnowledgeSourceImportHistoryDiff,
  rollbackKnowledgeSourceImportHistory,
  runMemoryVaultMaintenance,
  type KnowledgeSourceDiffResult,
  type KnowledgeSourceImportHistoryItem,
  type KnowledgeSourceRollbackResult,
} from "../../services/memoryVaultApi";

type KnowledgeSourceImportHistoryPanelProps = {
  selectedMemoryId?: string | null;
  selectedSourceRef?: string | null;
  onCompleted?: () => Promise<void>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getActionLabel(action: string) {
  if (action === "created") {
    return "Created";
  }

  if (action === "updated") {
    return "Updated";
  }

  if (action === "rollback") {
    return "Rollback";
  }

  return action;
}

function getDeltaLabel(history: KnowledgeSourceImportHistoryItem) {
  const delta = history.nextContentChars - history.previousContentChars;

  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
}

function shortHash(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10);
}

function matchesSearch(history: KnowledgeSourceImportHistoryItem, query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return true;
  }

  return [
    history.title,
    history.sourceRef,
    history.agentName,
    history.scope,
    history.action,
    history.sourceMode,
    history.fileRelativePath || "",
    history.linkedSkillNames.join(" "),
    history.allowedAgents.join(" "),
    history.sensitivityLevel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function KnowledgeSourceImportHistoryPanel({
  selectedMemoryId,
  selectedSourceRef,
  onCompleted,
}: KnowledgeSourceImportHistoryPanelProps) {
  const [histories, setHistories] = useState<KnowledgeSourceImportHistoryItem[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<KnowledgeSourceDiffResult | null>(
    null
  );
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [rollbackResult, setRollbackResult] =
    useState<KnowledgeSourceRollbackResult | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const nextHistories = await fetchKnowledgeSourceImportHistory({
        memoryId:
          scopeMode === "selected" ? selectedMemoryId || undefined : undefined,
        sourceRef:
          scopeMode === "selected" && !selectedMemoryId
            ? selectedSourceRef || undefined
            : undefined,
        limit: 80,
      });

      setHistories(nextHistories);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load knowledge source import history.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleViewDiff(historyId: string) {
    try {
      setIsDiffLoading(true);
      setErrorMessage(null);
      setRollbackResult(null);

      const diff = await fetchKnowledgeSourceImportHistoryDiff(historyId);
      setSelectedDiff(diff);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load knowledge source diff.";

      setErrorMessage(message);
    } finally {
      setIsDiffLoading(false);
    }
  }

  async function handleRollback(historyId: string) {
    const shouldRollback = window.confirm(
      "Rollback knowledge source to the previous snapshot? This updates the Memory record. After rollback, chunks and embeddings will be refreshed."
    );

    if (!shouldRollback) {
      return;
    }

    try {
      setIsRollingBack(true);
      setErrorMessage(null);
      setRollbackResult(null);

      const result = await rollbackKnowledgeSourceImportHistory({
        historyId,
        target: "previous",
      });

      setRollbackResult(result);

      if (result.rolledBack) {
        await runMemoryVaultMaintenance({
          memoryId: result.memoryId,
          syncSkills: false,
          rebuild: true,
          embed: true,
          embedOnlyPending: false,
          limit: 500,
          maxChunkChars: 900,
          overlapChars: 120,
          minChunkChars: 40,
        });

        await loadHistory();

        if (onCompleted) {
          await onCompleted();
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to rollback knowledge source.";

      setErrorMessage(message);
    } finally {
      setIsRollingBack(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [scopeMode, selectedMemoryId, selectedSourceRef]);

  const filteredHistories = useMemo(() => {
    return histories.filter((history) => matchesSearch(history, searchQuery));
  }, [histories, searchQuery]);

  const createdCount = histories.filter(
    (history) => history.action === "created"
  ).length;

  const updatedCount = histories.filter(
    (history) => history.action === "updated"
  ).length;

  const rollbackCount = histories.filter(
    (history) => history.action === "rollback"
  ).length;

  return (
    <section className="knowledge-history-card">
      <div className="memory-section-title">
        <div>
          <span>Diff + rollback foundation</span>
          <h3>Knowledge Source Import History</h3>
        </div>

        <div className="memory-page-badge">
          {isLoading ? "Loading" : `${histories.length} events`}
        </div>
      </div>

      <p>
        Track knowledge source versions, inspect line-level diffs, and rollback a
        source to a previous snapshot. Rollback automatically refreshes chunks and
        embeddings for the affected source.
      </p>

      <div className="knowledge-history-summary-grid">
        <div>
          <span>Total events</span>
          <strong>{histories.length}</strong>
        </div>

        <div>
          <span>Created</span>
          <strong>{createdCount}</strong>
        </div>

        <div>
          <span>Updated</span>
          <strong>{updatedCount}</strong>
        </div>

        <div>
          <span>Rollback</span>
          <strong>{rollbackCount}</strong>
        </div>

        <div>
          <span>Filtered</span>
          <strong>{filteredHistories.length}</strong>
        </div>
      </div>

      <div className="knowledge-history-toolbar">
        <label className="memory-filter-field search-field">
          <span>Search history</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, sourceRef, scope, skill..."
          />
        </label>

        <label className="memory-filter-field">
          <span>History scope</span>
          <select
            value={scopeMode}
            onChange={(event) =>
              setScopeMode(event.target.value === "selected" ? "selected" : "all")
            }
          >
            <option value="all">All knowledge sources</option>
            <option value="selected">Selected source only</option>
          </select>
        </label>

        <button type="button" onClick={loadHistory} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <div className="knowledge-history-error">
          <strong>History failed</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {rollbackResult && (
        <div
          className={
            rollbackResult.rolledBack
              ? "knowledge-history-success"
              : "knowledge-history-error"
          }
        >
          <strong>
            {rollbackResult.rolledBack ? "Rollback completed" : "Rollback skipped"}
          </strong>
          <span>
            {rollbackResult.rolledBack
              ? `${rollbackResult.title} restored to ${rollbackResult.target} snapshot.`
              : rollbackResult.reason || "Rollback was not completed."}
          </span>
        </div>
      )}

      {selectedDiff && (
        <div className="knowledge-diff-panel">
          <div className="knowledge-diff-header">
            <div>
              <span>Diff preview</span>
              <strong>{selectedDiff.title}</strong>
              <small>{selectedDiff.sourceRef}</small>
            </div>

            <button type="button" onClick={() => setSelectedDiff(null)}>
              Close diff
            </button>
          </div>

          <div className="knowledge-diff-summary-grid">
            <div>
              <span>Added</span>
              <strong>{selectedDiff.addedLineCount}</strong>
            </div>

            <div>
              <span>Removed</span>
              <strong>{selectedDiff.removedLineCount}</strong>
            </div>

            <div>
              <span>Unchanged</span>
              <strong>{selectedDiff.unchangedLineCount}</strong>
            </div>

            <div>
              <span>Chars</span>
              <strong>
                {selectedDiff.previousContentChars} →{" "}
                {selectedDiff.nextContentChars}
              </strong>
            </div>
          </div>

          <div className="knowledge-diff-list">
            {selectedDiff.lines.slice(0, 160).map((line, index) => (
              <div
                key={`${line.type}-${index}-${line.text}`}
                className={`knowledge-diff-line ${line.type}`}
              >
                <span>
                  {line.type === "added"
                    ? "+"
                    : line.type === "removed"
                      ? "-"
                      : " "}
                </span>
                <small>
                  {line.lineNumberBefore || "-"} / {line.lineNumberAfter || "-"}
                </small>
                <code>{line.text || " "}</code>
              </div>
            ))}
          </div>

          {selectedDiff.lines.length > 160 && (
            <div className="knowledge-diff-truncated">
              Showing first 160 lines from {selectedDiff.lines.length} diff
              entries.
            </div>
          )}
        </div>
      )}

      {filteredHistories.length === 0 ? (
        <div className="knowledge-history-empty">
          <strong>No import history found.</strong>
          <span>
            Import or update a knowledge source to create the first history
            event.
          </span>
        </div>
      ) : (
        <div className="knowledge-history-list">
          {filteredHistories.map((history) => (
            <article key={history.id} className="knowledge-history-item">
              <div className="knowledge-history-item-header">
                <div>
                  <span>@{history.agentName}</span>
                  <strong>{history.title}</strong>
                </div>

                <div className={`knowledge-history-action ${history.action}`}>
                  {getActionLabel(history.action)}
                </div>
              </div>

              <div className="knowledge-history-meta-grid">
                <div>
                  <span>Source Ref</span>
                  <strong title={history.sourceRef}>{history.sourceRef}</strong>
                </div>

                <div>
                  <span>Scope</span>
                  <strong>{history.scope}</strong>
                </div>

                <div>
                  <span>Mode</span>
                  <strong>{history.sourceMode}</strong>
                </div>

                <div>
                  <span>Delta chars</span>
                  <strong>{getDeltaLabel(history)}</strong>
                </div>
              </div>

              <div className="knowledge-history-hash-row">
                <div>
                  <span>Previous hash</span>
                  <strong title={history.previousContentHash || ""}>
                    {shortHash(history.previousContentHash)}
                  </strong>
                </div>

                <div>
                  <span>Next hash</span>
                  <strong title={history.nextContentHash}>
                    {shortHash(history.nextContentHash)}
                  </strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(history.createdAt)}</strong>
                </div>
              </div>

              <div className="knowledge-history-pill-row">
                {history.linkedSkillNames.slice(0, 5).map((skillName) => (
                  <span key={`${history.id}-${skillName}`}>{skillName}</span>
                ))}

                {history.allowedAgents.slice(0, 5).map((agentName) => (
                  <span key={`${history.id}-${agentName}`}>@{agentName}</span>
                ))}

                <span>{history.sensitivityLevel}</span>
              </div>

              <div className="knowledge-history-actions">
                <button
                  type="button"
                  onClick={() => handleViewDiff(history.id)}
                  disabled={isDiffLoading}
                >
                  {isDiffLoading ? "Loading diff..." : "View Diff"}
                </button>

                <button
                  type="button"
                  onClick={() => handleRollback(history.id)}
                  disabled={
                    isRollingBack ||
                    !history.previousContentHash ||
                    history.action === "created"
                  }
                >
                  {isRollingBack ? "Rolling back..." : "Rollback Previous"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}