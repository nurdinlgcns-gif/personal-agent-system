import type { TaskSnapshot } from "../../types/api";
import { RuntimeMemoryTaskMetadata } from "../runtime/RuntimeMemoryTaskMetadata";

type RecentTasksTableProps = {
  tasks: TaskSnapshot[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getTaskStatusLabel(status: string) {
  if (status === "done") {
    return "Done";
  }

  if (status === "error") {
    return "Error";
  }

  if (status === "in_progress") {
    return "In progress";
  }

  return status;
}

function getRuntimeLabel(task: TaskSnapshot) {
  if (!task.runtimeProviderName && !task.runtimeModel) {
    return null;
  }

  return `${task.runtimeProviderName || task.runtimeProviderType || "Runtime"} / ${task.runtimeModel || "auto"
    }`;
}

function getGovernanceLabel(task: TaskSnapshot) {
  if (typeof task.governanceAllowed !== "boolean") {
    return null;
  }

  return task.governanceAllowed ? "Allowed" : "Denied";
}

function truncateText(value?: string | null, maxLength = 150) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export function RecentTasksTable({
  tasks,
  onRefresh,
  isRefreshing,
}: RecentTasksTableProps) {
  return (
    <section className="recent-tasks-card">
      <div className="section-header">
        <div>
          <span>Recent activity</span>
          <h2>Recent Tasks</h2>
        </div>

        <button type="button" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="recent-tasks-empty">
          <strong>No recent task yet.</strong>
          <p>Send a task from the Floating Assistant or WhatsApp.</p>
        </div>
      ) : (
        <div className="recent-tasks-list">
          {tasks.map((task) => {
            const runtimeLabel = getRuntimeLabel(task);
            const governanceLabel = getGovernanceLabel(task);

            return (
              <article key={task.id} className="recent-task-row">
                <div className="recent-task-main">
                  <div className="recent-task-title-row">
                    <div>
                      <span className="recent-task-agent">@{task.agentName}</span>
                      <strong>{truncateText(task.inputText, 110)}</strong>
                    </div>

                    <span className={`recent-task-status ${task.status}`}>
                      {getTaskStatusLabel(task.status)}
                    </span>
                  </div>

                  {task.outputText && (
                    <p className="recent-task-output">
                      {truncateText(task.outputText, 220)}
                    </p>
                  )}

                  <div className="recent-task-meta-row">
                    <span>{task.source}</span>
                    <span>{formatDateTime(task.updatedAt)}</span>

                    {runtimeLabel && <span>Runtime: {runtimeLabel}</span>}

                    {governanceLabel && (
                      <span
                        className={`recent-task-governance ${task.governanceAllowed ? "allowed" : "denied"
                          }`}
                      >
                        Governance: {governanceLabel}
                      </span>
                    )}
                  </div>

                  {task.governanceReason && (
                    <p className="recent-task-governance-reason">
                      {task.governanceReason}
                    </p>
                  )}

                  <RuntimeMemoryTaskMetadata task={task} compact />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}