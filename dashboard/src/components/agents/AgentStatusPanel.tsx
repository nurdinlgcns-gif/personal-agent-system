import type { AgentSnapshot } from "../../types/api";

type AgentStatusPanelProps = {
  agents: AgentSnapshot[];
  agentStatuses: Record<string, string>;
};

type AgentViewModel = {
  id: string;
  name: string;
  status: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

const MAX_VISIBLE_AGENTS = 4;

const fallbackAgents: AgentViewModel[] = [
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

function getAgentRole(agentName: string) {
  if (agentName === "design-agent") {
    return "Creative copy assistant";
  }

  if (agentName === "research-agent") {
    return "Research insight assistant";
  }

  if (agentName === "code-agent") {
    return "Code implementation assistant";
  }

  return "AI task assistant";
}

function getAgentInitial(agentName: string) {
  return agentName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getStatusLabel(status: string) {
  if (status === "working") {
    return "Processing task";
  }

  if (status === "idle") {
    return "Ready for command";
  }

  if (status === "error") {
    return "Needs attention";
  }

  return "Status unknown";
}

function formatUpdatedAt(updatedAt: string) {
  if (!updatedAt || updatedAt === "-") {
    return "-";
  }

  return new Date(updatedAt).toLocaleTimeString();
}

export function AgentStatusPanel({
  agents,
  agentStatuses,
}: AgentStatusPanelProps) {
  const sourceAgents: AgentViewModel[] =
    agents.length > 0 ? agents : fallbackAgents;

  const visibleAgents = sourceAgents.slice(0, MAX_VISIBLE_AGENTS);
  const hiddenAgentCount = Math.max(sourceAgents.length - MAX_VISIBLE_AGENTS, 0);

  return (
    <section className="panel agent-panel">
      <div className="panel-header">
        <div>
          <h2>Agent Status</h2>
          <p className="panel-subtitle">
            Realtime lifecycle monitor
            {hiddenAgentCount > 0 ? ` • ${hiddenAgentCount} more hidden` : ""}
          </p>
        </div>

        <button>View All Agents</button>
      </div>

      <div className="agent-grid">
        {visibleAgents.map((agent) => {
          const status = agentStatuses[agent.name] || agent.status || "idle";

          return (
            <article key={agent.id} className={`agent-card ${status}`}>
              <div className="agent-card-top-row">
                <div className={`agent-avatar agent-avatar-${status}`}>
                  <span>{getAgentInitial(agent.name)}</span>
                </div>

                <span className={`agent-status-badge ${status}`}>
                  <span className="agent-status-dot" />
                  {status}
                </span>
              </div>

              <div className="agent-main-info">
                <strong>{agent.name}</strong>
                <p>{getAgentRole(agent.name)}</p>
              </div>

              <div className="agent-state-row">
                <span>{getStatusLabel(status)}</span>
                <small>Updated {formatUpdatedAt(agent.updatedAt)}</small>
              </div>

              <div className="agent-activity-track">
                <div className={`agent-activity-fill ${status}`} />
              </div>

              <div className="agent-meta-row">
                <span>Source</span>
                <strong>WebSocket</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}