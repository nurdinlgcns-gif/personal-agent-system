import type { TaskEventPayload } from "../../types/websocket";

type RecentTasksTableProps = {
  taskEvents: TaskEventPayload[];
};

export function RecentTasksTable({ taskEvents }: RecentTasksTableProps) {
  return (
    <section className="panel recent-tasks-panel">
      <div className="panel-header">
        <h2>Recent Tasks</h2>
        <button>View All Tasks</button>
      </div>

      <div className="table">
        <div className="table-row table-head">
          <span>Task ID</span>
          <span>Agent</span>
          <span>Source</span>
          <span>Status</span>
          <span>Created At</span>
        </div>

        {taskEvents.length === 0 ? (
          <p className="muted table-empty">No task events yet.</p>
        ) : (
          taskEvents.slice(0, 6).map((task, index) => (
            <div key={`${task.timestamp}-${index}`} className="table-row">
              <span>{task.taskId ? task.taskId.slice(0, 8) : "-"}</span>
              <span>{task.agentName}</span>
              <span>{task.source || "-"}</span>
              <span>
                <b className={`task-status ${task.status}`}>{task.status}</b>
              </span>
              <span>{new Date(task.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}