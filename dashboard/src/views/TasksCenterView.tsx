import { useEffect, useMemo, useState } from "react";
import type { TaskSnapshot } from "../types/api";
import {
  fetchTasksCenter,
  type TasksCenterFilters,
  type TasksCenterResponse,
} from "../services/tasksCenterApi";
import { RuntimeMemoryTaskMetadata } from "../components/runtime/RuntimeMemoryTaskMetadata";
import { RuntimeRagTaskMetadata } from "../components/runtime/RuntimeRagTaskMetadata";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function truncateText(value?: string | null, maxLength = 180) {
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

function getRuntimeLabel(task: TaskSnapshot) {
  if (!task.runtimeProviderName && !task.runtimeModel) {
    return "No runtime metadata";
  }

  return `${task.runtimeProviderName || task.runtimeProviderType || "Runtime"} / ${
    task.runtimeModel || "auto"
  }`;
}

function boolLabel(value?: boolean | null) {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "Yes" : "No";
}

function TaskMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="tasks-center-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskPills({
  values,
  emptyLabel = "none",
}: {
  values: string[];
  emptyLabel?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="tasks-center-pills">
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="tasks-center-pills">
      {values.slice(0, 6).map((value) => (
        <span key={value}>{value}</span>
      ))}

      {values.length > 6 && <span>+{values.length - 6}</span>}
    </div>
  );
}

function TaskDetailPanel({
  task,
  onClose,
}: {
  task: TaskSnapshot | null;
  onClose: () => void;
}) {
  if (!task) {
    return (
      <aside className="tasks-detail-panel empty">
        <strong>No task selected</strong>
        <p>Select a task from the list to inspect runtime metadata.</p>
      </aside>
    );
  }

  const matchedAllowed = parseJsonArray(task.governanceMatchedAllowedJson);
  const matchedDenied = parseJsonArray(task.governanceMatchedDeniedJson);
  const matchedSoft = parseJsonArray(task.governanceMatchedSoftJson);
  const suggested = parseJsonArray(task.governanceSuggestedAgentsJson);

  return (
    <aside className="tasks-detail-panel">
      <div className="tasks-detail-header">
        <div>
          <span>Task Detail</span>
          <h3>@{task.agentName}</h3>
          <p>{truncateText(task.inputText, 220)}</p>
        </div>

        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="tasks-detail-section">
        <span>Output</span>
        <p>{task.outputText || "No output yet."}</p>
      </div>

      <div className="tasks-detail-grid">
        <TaskMetric label="Status" value={task.status} />
        <TaskMetric label="Source" value={task.source} />
        <TaskMetric label="Created" value={formatDateTime(task.createdAt)} />
        <TaskMetric label="Updated" value={formatDateTime(task.updatedAt)} />
      </div>

      <div className="tasks-detail-section">
        <span>Runtime Provider</span>
        <div className="tasks-detail-grid">
          <TaskMetric label="Provider" value={task.runtimeProviderName || "-"} />
          <TaskMetric label="Type" value={task.runtimeProviderType || "-"} />
          <TaskMetric label="Model" value={task.runtimeModel || "-"} />
          <TaskMetric label="Mode" value={task.runtimeMode || "-"} />
          <TaskMetric label="Resolved" value={task.runtimeResolvedFrom || "-"} />
        </div>
      </div>

      <div className="tasks-detail-section">
        <span>Governance Boundary</span>
        <div className="tasks-detail-grid">
          <TaskMetric
            label="Allowed"
            value={boolLabel(task.governanceAllowed)}
          />
          <TaskMetric
            label="Confidence"
            value={task.governanceConfidence || "-"}
          />
          <TaskMetric
            label="Reason"
            value={task.governanceReason || "-"}
          />
        </div>

        <div className="tasks-center-pill-block">
          <small>Allowed signals</small>
          <TaskPills values={matchedAllowed} />
        </div>

        <div className="tasks-center-pill-block">
          <small>Denied signals</small>
          <TaskPills values={matchedDenied} />
        </div>

        <div className="tasks-center-pill-block">
          <small>Soft / skill signals</small>
          <TaskPills values={matchedSoft} />
        </div>

        <div className="tasks-center-pill-block">
          <small>Suggested agents / skills</small>
          <TaskPills values={suggested} />
        </div>
      </div>

      <div className="tasks-detail-section">
        <span>Runtime Memory</span>
        <RuntimeMemoryTaskMetadata task={task} />
      </div>

      <div className="tasks-detail-section">
        <span>Runtime RAG</span>
        <RuntimeRagTaskMetadata task={task} />
      </div>
    </aside>
  );
}

export function TasksCenterView() {
  const [data, setData] = useState<TasksCenterResponse | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

  const agentOptions = useMemo(
    () => uniqueSorted(tasks.map((task) => task.agentName)),
    [tasks]
  );

  const selectedTask = useMemo(() => {
    if (tasks.length === 0) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) || tasks[0];
  }, [selectedTaskId, tasks]);

  const sourceCounts = data?.summary.bySource || {};
  const statusCounts = data?.summary.byStatus || {};

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

        return nextData.tasks[0]?.id || null;
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
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="tasks-center-view">
      <div className="tasks-center-hero">
        <div>
          <span>Task Operations Center</span>
          <h1>Tasks Center</h1>
          <p>
            Inspect manual and WhatsApp tasks with runtime provider,
            governance, memory, and RAG audit metadata in one place.
          </p>

          <div className="tasks-center-badges">
            <span>Manual</span>
            <span>WhatsApp</span>
            <span>Governance</span>
            <span>Runtime Memory</span>
            <span>Runtime RAG</span>
          </div>
        </div>

        <div className="tasks-center-actions">
          <button
            type="button"
            onClick={() => loadTasks(true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="tasks-center-error">
          <strong>Tasks Center error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      <section className="tasks-center-summary-card">
        <div className="tasks-center-summary-grid">
          <TaskMetric label="Loaded" value={tasks.length} />
          <TaskMetric label="Total matched" value={data?.totalCount ?? 0} />
          <TaskMetric label="Manual" value={sourceCounts.manual ?? 0} />
          <TaskMetric label="WhatsApp" value={sourceCounts.whatsapp ?? 0} />
          <TaskMetric label="Done" value={statusCounts.done ?? 0} />
          <TaskMetric label="Error" value={statusCounts.error ?? 0} />
        </div>
      </section>

      <section className="tasks-center-filter-card">
        <div className="tasks-center-filter-grid">
          <label className="tasks-filter-field search">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search input, output, or RAG query..."
            />
          </label>

          <label className="tasks-filter-field">
            <span>Agent</span>
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
          </label>

          <label className="tasks-filter-field">
            <span>Source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="all">All sources</option>
              <option value="manual">manual</option>
              <option value="whatsapp">whatsapp</option>
            </select>
          </label>

          <label className="tasks-filter-field">
            <span>Status</span>
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
          </label>

          <label className="tasks-filter-field">
            <span>Governance</span>
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
          </label>

          <label className="tasks-filter-field">
            <span>Memory</span>
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
          </label>

          <label className="tasks-filter-field">
            <span>RAG</span>
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
          </label>

          <label className="tasks-filter-field">
            <span>Limit</span>
            <input
              type="number"
              min={10}
              max={200}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="tasks-center-filter-actions">
          <button type="button" onClick={() => loadTasks(true)}>
            Apply Filters
          </button>

          <button type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="tasks-center-loading">Loading Tasks Center...</div>
      ) : tasks.length === 0 ? (
        <div className="tasks-center-empty">
          <strong>No tasks matched your filters.</strong>
          <p>Try clearing filters or sending a task from Manual Widget or WhatsApp.</p>
        </div>
      ) : (
        <div className="tasks-center-layout">
          <main className="tasks-center-list">
            {tasks.map((task) => {
              const isActive = selectedTask?.id === task.id;

              return (
                <button
                  type="button"
                  key={task.id}
                  className={`tasks-center-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="tasks-center-item-header">
                    <div>
                      <span>@{task.agentName}</span>
                      <strong>{truncateText(task.inputText, 150)}</strong>
                    </div>

                    <div className={`tasks-status-pill ${task.status}`}>
                      {task.status}
                    </div>
                  </div>

                  <p>{truncateText(task.outputText, 220)}</p>

                  <div className="tasks-center-item-meta">
                    <span>{task.source}</span>
                    <span>{formatDateTime(task.updatedAt)}</span>
                    <span>{getRuntimeLabel(task)}</span>
                    <span>
                      Governance:{" "}
                      {typeof task.governanceAllowed === "boolean"
                        ? task.governanceAllowed
                          ? "allowed"
                          : "denied"
                        : "unknown"}
                    </span>
                    <span>
                      Memory:{" "}
                      {task.runtimeMemoryInjected
                        ? `${task.runtimeMemoryItemCount ?? 0} items`
                        : "none"}
                    </span>
                    <span>
                      RAG:{" "}
                      {task.runtimeRagRetrieved
                        ? `${task.runtimeRagItemCount ?? 0} chunks`
                        : "none"}
                    </span>
                  </div>

                  <div className="tasks-center-inline-metadata">
                    <RuntimeMemoryTaskMetadata task={task} compact />
                    <RuntimeRagTaskMetadata task={task} compact />
                  </div>
                </button>
              );
            })}
          </main>

          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      )}
    </section>
  );
}