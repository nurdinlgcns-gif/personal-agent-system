import { useEffect, useMemo, useState } from "react";
import type { TaskSnapshot } from "../types/api";
import {
  fetchTasksCenter,
  type TasksCenterFilters,
  type TasksCenterResponse,
} from "../services/tasksCenterApi";
import { RuntimeMemoryTaskMetadata } from "../components/runtime/RuntimeMemoryTaskMetadata";
import { RuntimeRagTaskMetadata } from "../components/runtime/RuntimeRagTaskMetadata";
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

const TASKS_CENTER_PAGE_SIZE = 10;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function truncateText(value?: string | null, maxLength = 120) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function parseJsonArray(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function boolLabel(value?: boolean | null) {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "Yes" : "No";
}

function statusTone(status: string) {
  if (status === "done") {
    return "done";
  }

  if (status === "error") {
    return "error";
  }

  if (status === "in_progress") {
    return "in_progress";
  }

  return "default";
}

function governanceLabel(task: TaskSnapshot) {
  if (typeof task.governanceAllowed !== "boolean") {
    return "Unknown";
  }

  return task.governanceAllowed ? "Allowed" : "Denied";
}

function runtimeLabel(task: TaskSnapshot) {
  if (!task.runtimeProviderName && !task.runtimeModel) {
    return "No runtime";
  }

  return `${task.runtimeProviderName || task.runtimeProviderType || "Runtime"} / ${
    task.runtimeModel || "auto"
  }`;
}

function contextLabel(task: TaskSnapshot) {
  const memory = task.runtimeMemoryInjected
    ? `Memory ${task.runtimeMemoryItemCount ?? 0}`
    : "Memory none";

  const rag = task.runtimeRagRetrieved
    ? `RAG ${task.runtimeRagItemCount ?? 0}`
    : "RAG none";

  return `${memory} · ${rag}`;
}

function DetailsMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="tasks-detail-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PillList({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="tasks-detail-pill-block">
      <small>{label}</small>

      <div className="tasks-detail-pills">
        {values.length === 0 ? (
          <span>none</span>
        ) : (
          values.slice(0, 8).map((value) => <span key={value}>{value}</span>)
        )}

        {values.length > 8 && <span>+{values.length - 8}</span>}
      </div>
    </div>
  );
}

function TaskDetailsModal({
  task,
  onClose,
}: {
  task: TaskSnapshot;
  onClose: () => void;
}) {
  const matchedAllowed = parseJsonArray(task.governanceMatchedAllowedJson);
  const matchedDenied = parseJsonArray(task.governanceMatchedDeniedJson);
  const matchedSoft = parseJsonArray(task.governanceMatchedSoftJson);
  const suggested = parseJsonArray(task.governanceSuggestedAgentsJson);

  return (
    <div className="tasks-center-modal-backdrop">
      <section className="tasks-center-modal">
        <header>
          <div>
            <span>Task Detail</span>
            <h2>@{task.agentName}</h2>
            <p>{truncateText(task.inputText, 260)}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close task detail">
            ×
          </button>
        </header>

        <div className="tasks-detail-section">
          <span>Output preview</span>
          <p>{task.outputText || "No output yet."}</p>
        </div>

        <div className="tasks-detail-grid">
          <DetailsMetric label="Status" value={task.status} />
          <DetailsMetric label="Source" value={task.source} />
          <DetailsMetric label="Created" value={formatDateTime(task.createdAt)} />
          <DetailsMetric label="Updated" value={formatDateTime(task.updatedAt)} />
        </div>

        <div className="tasks-detail-section">
          <span>Runtime Provider</span>

          <div className="tasks-detail-grid">
            <DetailsMetric label="Provider" value={task.runtimeProviderName || "-"} />
            <DetailsMetric label="Type" value={task.runtimeProviderType || "-"} />
            <DetailsMetric label="Model" value={task.runtimeModel || "-"} />
            <DetailsMetric label="Mode" value={task.runtimeMode || "-"} />
            <DetailsMetric label="Resolved" value={task.runtimeResolvedFrom || "-"} />
          </div>
        </div>

        <div className="tasks-detail-section">
          <span>Governance Boundary</span>

          <div className="tasks-detail-grid">
            <DetailsMetric
              label="Allowed"
              value={boolLabel(task.governanceAllowed)}
            />
            <DetailsMetric
              label="Confidence"
              value={task.governanceConfidence || "-"}
            />
            <DetailsMetric label="Reason" value={task.governanceReason || "-"} />
          </div>

          <PillList label="Allowed signals" values={matchedAllowed} />
          <PillList label="Denied signals" values={matchedDenied} />
          <PillList label="Soft / skill signals" values={matchedSoft} />
          <PillList label="Suggested agents / skills" values={suggested} />
        </div>

        <div className="tasks-detail-section">
          <span>Runtime Memory</span>
          <RuntimeMemoryTaskMetadata task={task} />
        </div>

        <div className="tasks-detail-section">
          <span>Runtime RAG</span>
          <RuntimeRagTaskMetadata task={task} />
        </div>
      </section>
    </div>
  );
}

export function TasksCenterView() {
  const [data, setData] = useState<TasksCenterResponse | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState("");
  const [agentName, setAgentName] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [governanceAllowed, setGovernanceAllowed] =
    useState<"all" | "true" | "false">("all");
  const [runtimeMemoryInjected, setRuntimeMemoryInjected] =
    useState<"all" | "true" | "false">("all");
  const [runtimeRagRetrieved, setRuntimeRagRetrieved] =
    useState<"all" | "true" | "false">("all");
  const [limit, setLimit] = useState(80);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tasks = data?.tasks || [];

  const totalPages = Math.max(
    1,
    Math.ceil(tasks.length / TASKS_CENTER_PAGE_SIZE)
  );

  const normalizedCurrentPage = Math.min(currentPage, totalPages);

  const pageStartIndex =
    (normalizedCurrentPage - 1) * TASKS_CENTER_PAGE_SIZE;

  const pageEndIndex = Math.min(
    pageStartIndex + TASKS_CENTER_PAGE_SIZE,
    tasks.length
  );

  const paginatedTasks = tasks.slice(pageStartIndex, pageEndIndex);

  const agentOptions = useMemo(
    () => uniqueSorted(tasks.map((task) => task.agentName)),
    [tasks]
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const sourceCounts = data?.summary.bySource || {};
  const statusCounts = data?.summary.byStatus || {};

  const doneCount = statusCounts.done ?? 0;
  const errorCount = statusCounts.error ?? 0;
  const manualCount = sourceCounts.manual ?? 0;
  const whatsappCount = sourceCounts.whatsapp ?? 0;
  const deniedCount = tasks.filter(
    (task) => task.governanceAllowed === false
  ).length;
  const ragRetrievedCount = tasks.filter(
    (task) => task.runtimeRagRetrieved === true
  ).length;

  async function loadTasks(isSilent = false) {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const filters: TasksCenterFilters = {
        search,
        agentName,
        source,
        status,
        governanceAllowed,
        runtimeMemoryInjected,
        runtimeRagRetrieved,
        limit,
      };

      const nextData = await fetchTasksCenter(filters);
      setData(nextData);

      setSelectedTaskId((currentSelectedTaskId) => {
        if (
          currentSelectedTaskId &&
          nextData.tasks.some((task) => task.id === currentSelectedTaskId)
        ) {
          return currentSelectedTaskId;
        }

        return null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load tasks.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setAgentName("all");
    setSource("all");
    setStatus("all");
    setGovernanceAllowed("all");
    setRuntimeMemoryInjected("all");
    setRuntimeRagRetrieved("all");
    setLimit(80);
    setCurrentPage(1);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <PageShell full className="tasks-center-page">
      <PageHero
        eyebrow="Task Operations Center"
        title="Tasks Center"
        description="Inspect manual and WhatsApp tasks with runtime provider, governance, memory, and RAG audit metadata in one organized workspace."
        badges={
          <>
            <InfoPill>Manual</InfoPill>
            <InfoPill tone="green">WhatsApp</InfoPill>
            <InfoPill tone="purple">Governance</InfoPill>
            <InfoPill tone="yellow">Runtime Memory</InfoPill>
            <InfoPill tone="blue">Runtime RAG</InfoPill>
          </>
        }
        actions={
          <ActionButton
            onClick={() => loadTasks(true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ActionButton>
        }
      />

      {errorMessage && (
        <ErrorState title="Tasks Center error" message={errorMessage} />
      )}

      <PanelCard accent="blue" compact className="tasks-center-compact-summary">
        <div className="tasks-center-summary-table">
          <div>
            <span>Total</span>
            <strong>{data?.totalCount ?? 0}</strong>
          </div>

          <div>
            <span>Done</span>
            <strong>{doneCount}</strong>
          </div>

          <div>
            <span>Error</span>
            <strong>{errorCount}</strong>
          </div>

          <div>
            <span>Manual</span>
            <strong>{manualCount}</strong>
          </div>

          <div>
            <span>WhatsApp</span>
            <strong>{whatsappCount}</strong>
          </div>

          <div>
            <span>Denied</span>
            <strong>{deniedCount}</strong>
          </div>

          <div>
            <span>RAG</span>
            <strong>{ragRetrievedCount}</strong>
          </div>
        </div>
      </PanelCard>

      <PanelCard accent="blue" compact className="tasks-center-standard-panel">
        <FilterGrid>
          <FormField label="Search" wide>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search input, output, or RAG query..."
            />
          </FormField>

          <FormField label="Agent">
            <select
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
            >
              <option value="all">All agents</option>
              {agentOptions.map((agent) => (
                <option key={agent} value={agent}>
                  @{agent}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Source">
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="all">All sources</option>
              <option value="manual">manual</option>
              <option value="whatsapp">whatsapp</option>
            </select>
          </FormField>

          <FormField label="Status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All status</option>
              <option value="pending">pending</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="error">error</option>
            </select>
          </FormField>

          <FormField label="Governance">
            <select
              value={governanceAllowed}
              onChange={(event) =>
                setGovernanceAllowed(
                  event.target.value as "all" | "true" | "false"
                )
              }
            >
              <option value="all">All</option>
              <option value="true">Allowed</option>
              <option value="false">Denied</option>
            </select>
          </FormField>

          <FormField label="Memory">
            <select
              value={runtimeMemoryInjected}
              onChange={(event) =>
                setRuntimeMemoryInjected(
                  event.target.value as "all" | "true" | "false"
                )
              }
            >
              <option value="all">All</option>
              <option value="true">Injected</option>
              <option value="false">Not injected</option>
            </select>
          </FormField>

          <FormField label="RAG">
            <select
              value={runtimeRagRetrieved}
              onChange={(event) =>
                setRuntimeRagRetrieved(
                  event.target.value as "all" | "true" | "false"
                )
              }
            >
              <option value="all">All</option>
              <option value="true">Retrieved</option>
              <option value="false">None</option>
            </select>
          </FormField>

          <FormField label="Limit">
            <input
              type="number"
              min={10}
              max={200}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            />
          </FormField>
        </FilterGrid>

        <div className="tasks-center-filter-actions">
          <ActionButton
            onClick={() => {
              setCurrentPage(1);
              loadTasks(true);
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
        <div className="tasks-center-loading">Loading Tasks Center...</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks matched your filters."
          description="Try clearing filters or sending a task from Manual Widget or WhatsApp."
        />
      ) : (
        <PanelCard accent="blue" compact className="tasks-table-panel">
          <div className="tasks-table">
            <div className="tasks-table-row header">
              <span>Time</span>
              <span>Agent</span>
              <span>Source</span>
              <span>Request</span>
              <span>Output Preview</span>
              <span>Status</span>
              <span>Governance</span>
              <span>Runtime</span>
              <span>Context</span>
              <span>Action</span>
            </div>

            {paginatedTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className="tasks-table-row"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <span>{formatDateTime(task.updatedAt)}</span>

                <span className="agent">@{task.agentName}</span>

                <span className="source">{task.source}</span>

                <span className="request">{truncateText(task.inputText, 100)}</span>

                <span className="reply">{truncateText(task.outputText, 130)}</span>

                <span>
                  <strong className={`tasks-table-status ${statusTone(task.status)}`}>
                    {task.status}
                  </strong>
                </span>

                <span>{governanceLabel(task)}</span>

                <span>{runtimeLabel(task)}</span>

                <span>{contextLabel(task)}</span>

                <span>
                  <strong className="tasks-table-details">Details</strong>
                </span>
              </button>
            ))}
          </div>

          <div className="tasks-table-pagination">
            <div>
              Showing{" "}
              <strong>{tasks.length === 0 ? 0 : pageStartIndex + 1}</strong> to{" "}
              <strong>{pageEndIndex}</strong> of <strong>{tasks.length}</strong>{" "}
              tasks
            </div>

            <div className="tasks-table-pagination-actions">
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

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </PageShell>
  );
}