import type { AgentSnapshot, SkillSnapshot, TaskSnapshot } from "../../types/api";

type OfficeCanvasProps = {
  agents: AgentSnapshot[];
  agentStatuses: Record<string, string>;
  recentTasks: TaskSnapshot[];
  skills: SkillSnapshot[];
};

type OfficeAgent = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

const fallbackAgents: OfficeAgent[] = [
  {
    id: "design-agent-placeholder",
    name: "design-agent",
    status: "idle",
    updatedAt: "-",
  },
  {
    id: "research-agent-placeholder",
    name: "research-agent",
    status: "idle",
    updatedAt: "-",
  },
  {
    id: "code-agent-placeholder",
    name: "code-agent",
    status: "idle",
    updatedAt: "-",
  },
];

function getAgentInitial(agentName: string) {
  return agentName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getAgentRole(agentName: string) {
  if (agentName === "design-agent") {
    return "Creative desk";
  }

  if (agentName === "research-agent") {
    return "Research desk";
  }

  if (agentName === "code-agent") {
    return "Code desk";
  }

  return "Agent desk";
}

function getLatestTaskForAgent(tasks: TaskSnapshot[], agentName: string) {
  return tasks.find((task) => task.agentName === agentName);
}

function getLatestWhatsAppTask(tasks: TaskSnapshot[]) {
  return tasks.find((task) => task.source === "whatsapp");
}

function getLatestManualTask(tasks: TaskSnapshot[]) {
  return tasks.find((task) => task.source === "manual");
}

function formatTime(value: string) {
  if (!value || value === "-") {
    return "-";
  }

  return new Date(value).toLocaleTimeString();
}

export function OfficeCanvas({
  agents,
  agentStatuses,
  recentTasks,
  skills,
}: OfficeCanvasProps) {
  const officeAgents: OfficeAgent[] =
    agents.length > 0
      ? agents.slice(0, 4).map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agentStatuses[agent.name] || agent.status || "idle",
          updatedAt: agent.updatedAt,
        }))
      : fallbackAgents;

  const latestWhatsAppTask = getLatestWhatsAppTask(recentTasks);
  const latestManualTask = getLatestManualTask(recentTasks);
  const latestTask = recentTasks[0];
  const primarySkill = skills[0];

  return (
    <div className="office-shell">
      <div className="office-command-strip">
        <div>
          <strong>Office Activity Map</strong>
          <span>Realtime visual layer for your multi-agent system</span>
        </div>

        <div className="office-summary-chips">
          <span>{officeAgents.length} agents</span>
          <span>{skills.length} skills</span>
          <span>{recentTasks.length} recent tasks</span>
        </div>
      </div>

      <div className="office-canvas">
        <div className="office-grid-floor" />

        <section className="office-zone office-source-zone">
          <div className="office-zone-label">Sources</div>

          <article
            className={`office-object source-terminal ${
              latestWhatsAppTask ? "active" : ""
            }`}
          >
            <div className="office-object-icon">💬</div>
            <div>
              <strong>WhatsApp Terminal</strong>
              <p>{latestWhatsAppTask?.inputText || "Waiting for WhatsApp task"}</p>
              <small>source: whatsapp</small>
            </div>
          </article>

          <article
            className={`office-object source-console ${
              latestManualTask ? "active" : ""
            }`}
          >
            <div className="office-object-icon">⌨</div>
            <div>
              <strong>Manual Console</strong>
              <p>{latestManualTask?.inputText || "Waiting for dashboard command"}</p>
              <small>source: manual</small>
            </div>
          </article>
        </section>

        <section className="office-zone office-agent-zone">
          <div className="office-zone-label">Agent Workstations</div>

          <div className="office-agent-grid">
            {officeAgents.map((agent) => {
              const latestAgentTask = getLatestTaskForAgent(
                recentTasks,
                agent.name
              );

              return (
                <article
                  key={agent.id}
                  className={`office-agent-desk ${agent.status}`}
                >
                  <div className="office-agent-avatar">
                    <span>{getAgentInitial(agent.name)}</span>
                  </div>

                  <div className="office-agent-body">
                    <div className="office-agent-title-row">
                      <strong>{agent.name}</strong>
                      <span className={`office-status-pill ${agent.status}`}>
                        {agent.status}
                      </span>
                    </div>

                    <p>{getAgentRole(agent.name)}</p>

                    <div className="office-agent-task">
                      <small>Current / latest task</small>
                      <span>
                        {latestAgentTask?.inputText ||
                          "No task assigned yet"}
                      </span>
                    </div>

                    <div className="office-agent-footer">
                      <small>Updated {formatTime(agent.updatedAt)}</small>
                      <small>WebSocket</small>
                    </div>
                  </div>

                  <div className="office-desk-glow" />
                </article>
              );
            })}
          </div>
        </section>

        <section className="office-zone office-resource-zone">
          <div className="office-zone-label">Resources</div>

          <article className="office-object skill-shelf">
            <div className="office-object-icon">▧</div>
            <div>
              <strong>Skill Shelf</strong>
              <p>{primarySkill?.name || "No skill registered"}</p>
              <small>
                {primarySkill
                  ? `assigned: ${primarySkill.agentName}`
                  : "waiting for skill"}
              </small>
            </div>
          </article>

          <article className="office-object memory-vault">
            <div className="office-object-icon">◫</div>
            <div>
              <strong>Memory Vault</strong>
              <p>Ready for future memory context</p>
              <small>vault module prepared</small>
            </div>
          </article>
        </section>

        <section className="office-zone office-output-zone">
          <div className="office-zone-label">Output</div>

          <article className={`office-object task-board ${latestTask ? "active" : ""}`}>
            <div className="office-object-icon">▤</div>
            <div>
              <strong>Task Board</strong>
              <p>
                {latestTask
                  ? `${latestTask.agentName} → ${latestTask.status}`
                  : "No task available"}
              </p>
              <small>{latestTask ? latestTask.source : "waiting"}</small>
            </div>
          </article>

          <article className="office-object output-board">
            <div className="office-object-icon">▣</div>
            <div>
              <strong>Output Board</strong>
              <p>
                {latestTask?.outputText
                  ? latestTask.outputText.slice(0, 110) + "..."
                  : "Latest response will be displayed here"}
              </p>
              <small>result preview</small>
            </div>
          </article>
        </section>

        <svg className="office-flow-lines" viewBox="0 0 1000 560">
          <path className="office-flow-line source-to-agent" d="M170 150 C260 110, 330 150, 410 210" />
          <path className="office-flow-line agent-to-skill" d="M520 230 C610 160, 690 150, 800 150" />
          <path className="office-flow-line agent-to-output" d="M540 330 C650 400, 740 420, 820 380" />
        </svg>
      </div>
    </div>
  );
}