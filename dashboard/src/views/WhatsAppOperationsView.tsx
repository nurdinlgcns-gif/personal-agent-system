import { useEffect, useMemo, useState } from "react";
import type { TaskSnapshot } from "../types/api";
import {
  fetchWhatsAppOperations,
  type WhatsAppOperationsFilters,
  type WhatsAppOperationsResponse,
} from "../services/whatsappOperationsApi";
import { RuntimeMemoryTaskMetadata } from "../components/runtime/RuntimeMemoryTaskMetadata";
import { RuntimeRagTaskMetadata } from "../components/runtime/RuntimeRagTaskMetadata";
import { WhatsAppConnectionCard } from "../components/whatsapp/WhatsAppConnectionCard";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  FilterGrid,
  FormField,
  InfoPill,
  MetricCard,
  MetricGrid,
  PageHero,
  PageShell,
  PanelCard,
} from "../components/ui";

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

function boolLabel(value?: boolean | null) {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "Yes" : "No";
}

function getRuntimeLabel(task: TaskSnapshot) {
  if (!task.runtimeProviderName && !task.runtimeModel) {
    return "No runtime metadata";
  }

  return `${task.runtimeProviderName || task.runtimeProviderType || "Runtime"} / ${
    task.runtimeModel || "auto"
  }`;
}

function WhatsAppMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="whatsapp-ops-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WhatsAppPills({
  values,
  emptyLabel = "none",
}: {
  values: string[];
  emptyLabel?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="whatsapp-ops-pills">
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="whatsapp-ops-pills">
      {values.slice(0, 6).map((value) => (
        <span key={value}>{value}</span>
      ))}

      {values.length > 6 && <span>+{values.length - 6}</span>}
    </div>
  );
}

function WhatsAppTaskDetailPanel({
  task,
  onClose,
}: {
  task: TaskSnapshot | null;
  onClose: () => void;
}) {
  if (!task) {
    return (
      <aside className="whatsapp-ops-detail-panel empty">
        <strong>No WhatsApp task selected</strong>
        <p>Select a WhatsApp task to inspect runtime and RAG metadata.</p>
      </aside>
    );
  }

  const matchedAllowed = parseJsonArray(task.governanceMatchedAllowedJson);
  const matchedDenied = parseJsonArray(task.governanceMatchedDeniedJson);
  const matchedSoft = parseJsonArray(task.governanceMatchedSoftJson);
  const suggested = parseJsonArray(task.governanceSuggestedAgentsJson);

  return (
    <aside className="whatsapp-ops-detail-panel">
      <div className="whatsapp-ops-detail-header">
        <div>
          <span>WhatsApp Task Detail</span>
          <h3>@{task.agentName}</h3>
          <p>{truncateText(task.inputText, 220)}</p>
        </div>

        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="whatsapp-ops-detail-section">
        <span>Clean reply preview</span>
        <p>{task.outputText || "No reply output yet."}</p>
      </div>

      <div className="whatsapp-ops-detail-grid">
        <WhatsAppMetric label="Status" value={task.status} />
        <WhatsAppMetric label="Source" value={task.source} />
        <WhatsAppMetric label="Created" value={formatDateTime(task.createdAt)} />
        <WhatsAppMetric label="Updated" value={formatDateTime(task.updatedAt)} />
      </div>

      <div className="whatsapp-ops-detail-section">
        <span>Runtime Provider</span>

        <div className="whatsapp-ops-detail-grid">
          <WhatsAppMetric label="Provider" value={task.runtimeProviderName || "-"} />
          <WhatsAppMetric label="Type" value={task.runtimeProviderType || "-"} />
          <WhatsAppMetric label="Model" value={task.runtimeModel || "-"} />
          <WhatsAppMetric label="Mode" value={task.runtimeMode || "-"} />
          <WhatsAppMetric label="Resolved" value={task.runtimeResolvedFrom || "-"} />
        </div>
      </div>

      <div className="whatsapp-ops-detail-section">
        <span>Governance Boundary</span>

        <div className="whatsapp-ops-detail-grid">
          <WhatsAppMetric
            label="Allowed"
            value={boolLabel(task.governanceAllowed)}
          />
          <WhatsAppMetric
            label="Confidence"
            value={task.governanceConfidence || "-"}
          />
          <WhatsAppMetric label="Reason" value={task.governanceReason || "-"} />
        </div>

        <div className="whatsapp-ops-pill-block">
          <small>Allowed signals</small>
          <WhatsAppPills values={matchedAllowed} />
        </div>

        <div className="whatsapp-ops-pill-block">
          <small>Denied signals</small>
          <WhatsAppPills values={matchedDenied} />
        </div>

        <div className="whatsapp-ops-pill-block">
          <small>Soft / skill signals</small>
          <WhatsAppPills values={matchedSoft} />
        </div>

        <div className="whatsapp-ops-pill-block">
          <small>Suggested agents / skills</small>
          <WhatsAppPills values={suggested} />
        </div>
      </div>

      <div className="whatsapp-ops-detail-section">
        <span>Runtime Memory</span>
        <RuntimeMemoryTaskMetadata task={task} />
      </div>

      <div className="whatsapp-ops-detail-section">
        <span>Runtime RAG</span>
        <RuntimeRagTaskMetadata task={task} />
      </div>
    </aside>
  );
}

export function WhatsAppOperationsView() {
  const [data, setData] = useState<WhatsAppOperationsResponse | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
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

  const selectedTask = useMemo(() => {
    if (tasks.length === 0) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) || tasks[0];
  }, [selectedTaskId, tasks]);

  const doneCount = tasks.filter((task) => task.status === "done").length;
  const errorCount = tasks.filter((task) => task.status === "error").length;
  const allowedCount = tasks.filter(
    (task) => task.governanceAllowed === true
  ).length;
  const deniedCount = tasks.filter(
    (task) => task.governanceAllowed === false
  ).length;
  const memoryInjectedCount = tasks.filter(
    (task) => task.runtimeMemoryInjected === true
  ).length;
  const ragRetrievedCount = tasks.filter(
    (task) => task.runtimeRagRetrieved === true
  ).length;

  const latestWhatsAppTask = tasks[0] || null;

  async function loadWhatsAppOperations(isSilent = false) {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const filters: WhatsAppOperationsFilters = {
        search,
        status,
        governanceAllowed,
        runtimeMemoryInjected,
        runtimeRagRetrieved,
        limit,
      };

      const nextData = await fetchWhatsAppOperations(filters);

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
        error instanceof Error
          ? error.message
          : "Failed to load WhatsApp Operations.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setGovernanceAllowed("all");
    setRuntimeMemoryInjected("all");
    setRuntimeRagRetrieved("all");
    setLimit(80);
  }

  useEffect(() => {
    loadWhatsAppOperations();
  }, []);

  return (
    <PageShell full className="whatsapp-ops-page">
      <PageHero
        eyebrow="WhatsApp Operations"
        title="WhatsApp Runtime Monitor"
        description="Monitor pairing status, WhatsApp task processing, clean replies, governance boundary, runtime provider, memory context, and runtime RAG retrieval."
        badges={
          <>
            <InfoPill tone="green">Read-only</InfoPill>
            <InfoPill tone="green">WhatsApp channel</InfoPill>
            <InfoPill tone="purple">Governance</InfoPill>
            <InfoPill tone="yellow">Runtime Memory</InfoPill>
            <InfoPill tone="blue">Runtime RAG</InfoPill>
          </>
        }
        actions={
          <ActionButton
            tone="green"
            onClick={() => loadWhatsAppOperations(true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ActionButton>
        }
      />

      {errorMessage && (
        <ErrorState title="WhatsApp Operations error" message={errorMessage} />
      )}

      <WhatsAppConnectionCard />

      <PanelCard accent="green" compact className="whatsapp-ops-standard-panel">
        <MetricGrid>
          <MetricCard label="Loaded" value={tasks.length} />
          <MetricCard label="Total matched" value={data?.totalCount ?? 0} />
          <MetricCard label="Done" value={doneCount} />
          <MetricCard label="Error" value={errorCount} />
          <MetricCard label="Allowed" value={allowedCount} />
          <MetricCard label="Denied" value={deniedCount} />
          <MetricCard label="Memory" value={memoryInjectedCount} />
          <MetricCard label="RAG" value={ragRetrievedCount} />
        </MetricGrid>
      </PanelCard>

      {latestWhatsAppTask && (
        <section className="whatsapp-ops-latest-card">
          <div>
            <span>Latest WhatsApp Task</span>
            <h3>@{latestWhatsAppTask.agentName}</h3>
            <p>{truncateText(latestWhatsAppTask.inputText, 220)}</p>
          </div>

          <div className="whatsapp-ops-latest-meta">
            <span>{latestWhatsAppTask.status}</span>
            <span>{formatDateTime(latestWhatsAppTask.updatedAt)}</span>
            <span>{getRuntimeLabel(latestWhatsAppTask)}</span>
            <span>
              RAG:{" "}
              {latestWhatsAppTask.runtimeRagRetrieved
                ? `${latestWhatsAppTask.runtimeRagItemCount ?? 0} chunks`
                : "none"}
            </span>
          </div>
        </section>
      )}

      <PanelCard accent="green" compact className="whatsapp-ops-standard-panel">
        <FilterGrid>
          <FormField label="Search" wide>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search WhatsApp input, reply, or RAG query..."
            />
          </FormField>

          <FormField label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
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

        <div className="whatsapp-ops-filter-actions">
          <ActionButton tone="green" onClick={() => loadWhatsAppOperations(true)}>
            Apply Filters
          </ActionButton>

          <ActionButton tone="ghost" onClick={clearFilters}>
            Clear Filters
          </ActionButton>
        </div>
      </PanelCard>

      {isLoading ? (
        <div className="whatsapp-ops-loading">Loading WhatsApp Operations...</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No WhatsApp tasks matched your filters."
          description="Send a WhatsApp task or clear filters to inspect channel activity."
        />
      ) : (
        <div className="whatsapp-ops-layout">
          <main className="whatsapp-ops-list">
            {tasks.map((task) => {
              const isActive = selectedTask?.id === task.id;

              return (
                <button
                  type="button"
                  key={task.id}
                  className={`whatsapp-ops-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="whatsapp-ops-item-header">
                    <div>
                      <span>@{task.agentName}</span>
                      <strong>{truncateText(task.inputText, 150)}</strong>
                    </div>

                    <div className={`whatsapp-status-pill ${task.status}`}>
                      {task.status}
                    </div>
                  </div>

                  <p>{truncateText(task.outputText, 220)}</p>

                  <div className="whatsapp-ops-item-meta">
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

                  <div className="whatsapp-ops-inline-metadata">
                    <RuntimeMemoryTaskMetadata task={task} compact />
                    <RuntimeRagTaskMetadata task={task} compact />
                  </div>
                </button>
              );
            })}
          </main>

          <WhatsAppTaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      )}
    </PageShell>
  );
}