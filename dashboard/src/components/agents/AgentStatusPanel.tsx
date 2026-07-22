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

function getStatusLabel(status: string) {
  if (status === "working") {
    return "Processing task";
  }

  if (status === "idle") {
    return "Ready";
  }

  if (status === "error") {
    return "Needs attention";
  }

  return "Unknown";
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

  const workingCount = sourceAgents.filter(
    (agent) => (agentStatuses[agent.name] || agent.status || "idle") === "working"
  ).length;

  const idleCount = sourceAgents.filter(
    (agent) => (agentStatuses[agent.name] || agent.status || "idle") === "idle"
  ).length;

  const errorCount = sourceAgents.filter(
    (agent) => (agentStatuses[agent.name] || agent.status || "idle") === "error"
  ).length;

  return (
    <section className="panel agent-panel dashboard-table-panel">
      <div className="panel-header">
        <div>
          <h2>Agent Status</h2>
          <p className="panel-subtitle">Realtime lifecycle monitor</p>
        </div>

        <div className="dashboard-mini-summary">
          <span>{sourceAgents.length} agents</span>
          <span>{workingCount} working</span>
          <span>{idleCount} idle</span>
          <span>{errorCount} error</span>
        </div>
      </div>

      <div className="dashboard-agent-table">
        <div className="dashboard-agent-row header">
          <span>Agent</span>
          <span>Role</span>
          <span>Status</span>
          <span>State</span>
          <span>Updated</span>
          <span>Source</span>
        </div>

        {sourceAgents.map((agent) => {
          const status = agentStatuses[agent.name] || agent.status || "idle";

          return (
            <div key={agent.id} className="dashboard-agent-row">
              <span className="dashboard-agent-name">@{agent.name}</span>
              <span>{getAgentRole(agent.name)}</span>
              <span>
                <strong className={`dashboard-status-pill ${status}`}>
                  {status}
                </strong>
              </span>
              <span>{getStatusLabel(status)}</span>
              <span>{formatUpdatedAt(agent.updatedAt)}</span>
              <span>WebSocket</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}