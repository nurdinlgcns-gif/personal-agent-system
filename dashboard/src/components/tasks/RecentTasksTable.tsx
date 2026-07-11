import type { TaskSnapshot } from "../../types/api";

type RecentTasksTableProps = {
  tasks: TaskSnapshot[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
};

export function RecentTasksTable({
  tasks,
  onRefresh,
  isRefreshing,
}: RecentTasksTableProps) {
  return (
    <section className="panel recent-tasks-panel">
      <div className="panel-header">
        <div>
          <h2>Recent Tasks</h2>
          <p className="panel-subtitle">Latest persisted task history</p>
        </div>

        <div className="panel-header-actions">
          {isRefreshing && <span className="sync-chip">Syncing</span>}

          <button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="table">
        <div className="table-row table-head">
          <span>Task ID</span>
          <span>Agent</span>
          <span>Source</span>
          <span>Status</span>
          <span>Input</span>
          <span>Created At</span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state table-empty-state">
            <div className="empty-state-icon">▦</div>
            <strong>No recent tasks found</strong>
            <p>Tasks from WhatsApp, Postman, or Floating Assistant will appear here.</p>
          </div>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <div key={task.id} className="table-row task-table-row">
              <span title={task.id}>{task.id.slice(0, 8)}</span>
              <span>{task.agentName}</span>
              <span>{task.source}</span>
              <span>
                <b className={`task-status ${task.status}`}>{task.status}</b>
              </span>
              <span title={task.inputText}>{task.inputText}</span>
              <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}