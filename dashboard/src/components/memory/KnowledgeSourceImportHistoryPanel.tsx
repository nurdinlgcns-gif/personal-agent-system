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

const HISTORY_PAGE_SIZE = 10;

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

function truncateText(value: string, maxLength = 100) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
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

function DiffModal({
  diff,
  onClose,
}: {
  diff: KnowledgeSourceDiffResult;
  onClose: () => void;
}) {
  return (
    <div className="knowledge-history-modal-backdrop">
      <section className="knowledge-history-modal">
        <header>
          <div>
            <span>Diff preview</span>
            <h2>{diff.title}</h2>
            <p>{diff.sourceRef}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close diff">
            ×
          </button>
        </header>

        <div className="knowledge-diff-summary-grid">
          <div>
            <span>Added</span>
            <strong>{diff.addedLineCount}</strong>
          </div>

          <div>
            <span>Removed</span>
            <strong>{diff.removedLineCount}</strong>
          </div>

          <div>
            <span>Unchanged</span>
            <strong>{diff.unchangedLineCount}</strong>
          </div>

          <div>
            <span>Chars</span>
            <strong>
              {diff.previousContentChars} → {diff.nextContentChars}
            </strong>
          </div>
        </div>

        <div className="knowledge-diff-list modal-list">
          {diff.lines.slice(0, 180).map((line, index) => (
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

        {diff.lines.length > 180 && (
          <div className="knowledge-diff-truncated">
            Showing first 180 lines from {diff.lines.length} diff entries.
          </div>
        )}
      </section>
    </div>
  );
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
  const [currentPage, setCurrentPage] = useState(1);
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
        limit: 120,
      });

      setHistories(nextHistories);
      setCurrentPage(1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeMode, selectedMemoryId, selectedSourceRef]);

  const filteredHistories = useMemo(() => {
    return histories.filter((history) => matchesSearch(history, searchQuery));
  }, [histories, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistories.length / HISTORY_PAGE_SIZE)
  );

  const normalizedPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (normalizedPage - 1) * HISTORY_PAGE_SIZE;
  const pageEndIndex = Math.min(pageStartIndex + HISTORY_PAGE_SIZE, filteredHistories.length);
  const paginatedHistories = filteredHistories.slice(pageStartIndex, pageEndIndex);

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
    <section className="knowledge-history-card knowledge-history-polish-card">
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
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
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

      {filteredHistories.length === 0 ? (
        <div className="knowledge-history-empty">
          <strong>No import history found.</strong>
          <span>
            Import or update a knowledge source to create the first history
            event.
          </span>
        </div>
      ) : (
        <>
          <div className="knowledge-history-table">
            <div className="knowledge-history-row header">
              <span>Created</span>
              <span>Title</span>
              <span>Action</span>
              <span>Agent</span>
              <span>Scope</span>
              <span>Mode</span>
              <span>Delta</span>
              <span>Hash</span>
              <span>Actions</span>
            </div>

            {paginatedHistories.map((history) => (
              <article key={history.id} className="knowledge-history-row">
                <span>{formatDateTime(history.createdAt)}</span>

                <span className="history-title">
                  <strong>{history.title}</strong>
                  <small title={history.sourceRef}>{truncateText(history.sourceRef, 84)}</small>
                </span>

                <span>
                  <strong className={`knowledge-history-action ${history.action}`}>
                    {getActionLabel(history.action)}
                  </strong>
                </span>

                <span>@{history.agentName}</span>
                <span>{history.scope}</span>
                <span>{history.sourceMode}</span>
                <span>{getDeltaLabel(history)}</span>

                <span className="history-hash">
                  {shortHash(history.previousContentHash)} →{" "}
                  {shortHash(history.nextContentHash)}
                </span>

                <span className="history-actions">
                  <button
                    type="button"
                    onClick={() => handleViewDiff(history.id)}
                    disabled={isDiffLoading}
                  >
                    {isDiffLoading ? "Loading..." : "Diff"}
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
                    {isRollingBack ? "Rolling..." : "Rollback"}
                  </button>
                </span>
              </article>
            ))}
          </div>

          <div className="knowledge-history-pagination">
            <div>
              Showing{" "}
              <strong>
                {filteredHistories.length === 0 ? 0 : pageStartIndex + 1}
              </strong>{" "}
              to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{filteredHistories.length}</strong> events
            </div>

            <div className="knowledge-history-pagination-actions">
              <button
                type="button"
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                disabled={normalizedPage <= 1}
              >
                Previous
              </button>

              <span>
                Page {normalizedPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={normalizedPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedDiff && (
        <DiffModal diff={selectedDiff} onClose={() => setSelectedDiff(null)} />
      )}
    </section>
  );
}