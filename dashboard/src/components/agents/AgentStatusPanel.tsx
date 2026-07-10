import type { AgentSnapshot } from "../../types/api";

type AgentStatusPanelProps = {
  agents: AgentSnapshot[];
  agentStatuses: Record<string, string>;
};

const fallbackAgents = [
  {
    id: "design-agent-placeholder",
    name: "design-agent",
    status: "idle",
    color: "blue",
    createdAt: "-",
    updatedAt: "-",
  },
  {
    id: "research-agent-placeholder",
    name: "research-agent",
    status: "idle",
    color: "green",
    createdAt: "-",
    updatedAt: "-",
  },
  {
    id: "code-agent-placeholder",
    name: "code-agent",
    status: "idle",
    color: "purple",
    createdAt: "-",
    updatedAt: "-",
  },
];

export function AgentStatusPanel({
  agents,
  agentStatuses,
}: AgentStatusPanelProps) {
  const visibleAgents = agents.length > 0 ? agents : fallbackAgents;

  return (
    <section className="panel agent-panel">
      <div className="panel-header">
        <h2>Agent Status</h2>
        <button>View All Agents</button>
      </div>

      <div className="agent-grid">
        {visibleAgents.map((agent) => {
          const status = agentStatuses[agent.name] || agent.status || "idle";

          return (
            <div key={agent.id} className={`agent-card ${status}`}>
              <div className="agent-avatar">
                <span>🤖</span>
              </div>

              <div className="agent-info">
                <strong>{agent.name}</strong>

                <span className={`agent-status-badge ${status}`}>
                  {status}
                </span>

                <div className="activity-line">⌁⌁⌁⌁⌁</div>

                <small>
                  Updated{" "}
                  {agent.updatedAt !== "-"
                    ? new Date(agent.updatedAt).toLocaleTimeString()
                    : "-"}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}