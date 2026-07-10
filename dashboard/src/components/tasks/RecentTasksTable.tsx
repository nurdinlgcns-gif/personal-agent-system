import type { TaskSnapshot } from "../../types/api";

type RecentTasksTableProps = {
  tasks: TaskSnapshot[];
};

export function RecentTasksTable({ tasks }: RecentTasksTableProps) {
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

        {tasks.length === 0 ? (
          <p className="muted table-empty">No recent tasks found.</p>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <div key={task.id} className="table-row">
              <span title={task.id}>{task.id.slice(0, 8)}</span>
              <span>{task.agentName}</span>
              <span>{task.source}</span>
              <span>
                <b className={`task-status ${task.status}`}>{task.status}</b>
              </span>
              <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}