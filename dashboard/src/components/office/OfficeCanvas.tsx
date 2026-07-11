import type {
    AgentSnapshot,
    SkillSnapshot,
    TaskSnapshot,
  } from "../../types/api";
  
  type OfficeCanvasProps = {
    agents: AgentSnapshot[];
    agentStatuses: Record<string, string>;
    recentTasks: TaskSnapshot[];
    skills: SkillSnapshot[];
    isProcessing: boolean;
  };
  
  type OfficeRoomSlot = {
    key: string;
    title: string;
    roomClass: string;
    accent: "green" | "blue" | "purple" | "pink" | "yellow" | "cyan";
  };
  
  const roomSlots: OfficeRoomSlot[] = [
    {
      key: "slot-design",
      title: "Agent Desk",
      roomClass: "room-design",
      accent: "green",
    },
    {
      key: "slot-writer",
      title: "Agent Desk",
      roomClass: "room-writer",
      accent: "purple",
    },
    {
      key: "slot-image",
      title: "Agent Desk",
      roomClass: "room-image",
      accent: "pink",
    },
    {
      key: "slot-code",
      title: "Agent Desk",
      roomClass: "room-code",
      accent: "blue",
    },
    {
      key: "slot-research",
      title: "Agent Desk",
      roomClass: "room-research",
      accent: "cyan",
    },
    {
      key: "slot-qa",
      title: "Agent Desk",
      roomClass: "room-qa",
      accent: "yellow",
    },
  ];
  
  function normalizeStatus(status?: string) {
    if (status === "working" || status === "in_progress") {
      return "working";
    }
  
    if (status === "error") {
      return "error";
    }
  
    return "idle";
  }
  
  function getAgentInitial(agentName: string) {
    return agentName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }
  
  function getAgentRole(agentName: string) {
    if (agentName === "design-agent") {
      return "Designing creative output";
    }
  
    if (agentName === "research-agent") {
      return "Researching information";
    }
  
    if (agentName === "code-agent") {
      return "Refactoring code";
    }
  
    if (agentName === "writer-agent") {
      return "Writing content";
    }
  
    if (agentName === "image-agent") {
      return "Generating visual assets";
    }
  
    if (agentName === "qa-agent") {
      return "Testing application flow";
    }
  
    return "Processing assigned tasks";
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
  
  function getTaskLabel(task?: TaskSnapshot) {
    if (!task) {
      return "Waiting";
    }
  
    if (task.status === "in_progress") {
      return "Processing";
    }
  
    if (task.status === "done") {
      return "Completed";
    }
  
    if (task.status === "error") {
      return "Failed";
    }
  
    return task.status;
  }
  
  function getSceneLabel(isProcessing: boolean, latestTask?: TaskSnapshot) {
    if (isProcessing) {
      return "Live task flow active";
    }
  
    if (latestTask?.status === "done") {
      return "Latest task completed";
    }
  
    if (latestTask?.status === "error") {
      return "Latest task failed";
    }
  
    return "Office standing by";
  }
  
  function getSkillForLatestTask(
    skills: SkillSnapshot[],
    latestTask?: TaskSnapshot
  ) {
    if (!latestTask) {
      return skills[0];
    }
  
    return (
      skills.find((skill) => skill.agentName === latestTask.agentName) ||
      skills[0]
    );
  }
  
  function getOutputPreview(task?: TaskSnapshot) {
    if (!task) {
      return "Latest output will appear here";
    }
  
    if (task.status === "in_progress") {
      return "Output is being generated...";
    }
  
    if (task.status === "error") {
      return task.outputText || "Task failed before producing output.";
    }
  
    return task.outputText
      ? `${task.outputText.slice(0, 86)}...`
      : "Task completed without output preview.";
  }
  
  function getSourceSummary(task?: TaskSnapshot, fallbackText?: string) {
    if (!task) {
      return fallbackText || "Waiting for activity";
    }
  
    return task.inputText;
  }
  
  export function OfficeCanvas({
    agents,
    agentStatuses,
    recentTasks,
    skills,
    isProcessing,
  }: OfficeCanvasProps) {
    const realAgents = agents.slice(0, roomSlots.length);
  
    const latestTask = recentTasks[0];
    const latestWhatsAppTask = getLatestWhatsAppTask(recentTasks);
    const latestManualTask = getLatestManualTask(recentTasks);
    const activeSkill = getSkillForLatestTask(skills, latestTask);
  
    const latestTaskStatus = latestTask?.status || "idle";
    const latestSource = latestTask?.source || "none";
  
    const workingCount = realAgents.filter((agent) => {
      const status = normalizeStatus(agentStatuses[agent.name] || agent.status);
      return status === "working";
    }).length;
  
    const idleCount = realAgents.filter((agent) => {
      const status = normalizeStatus(agentStatuses[agent.name] || agent.status);
      return status === "idle";
    }).length;
  
    const errorCount = realAgents.filter((agent) => {
      const status = normalizeStatus(agentStatuses[agent.name] || agent.status);
      return status === "error";
    }).length;
  
    return (
      <div className="office-scene-shell">
        <div className="office-scene-topbar">
          <div>
            <strong>Agent Office Scene</strong>
            <span>{getSceneLabel(isProcessing, latestTask)}</span>
          </div>
  
          <div className="office-scene-stats">
            <span>{realAgents.length} real agents</span>
            <span>{workingCount} working</span>
            <span>{idleCount} idle</span>
            <span>{errorCount} error</span>
            <span>{skills.length} skills</span>
          </div>
        </div>
  
        <div
          className={`office-scene ${isProcessing ? "is-processing" : ""} ${
            realAgents.length === 1 ? "single-agent-scene" : ""
          } office-latest-${latestTaskStatus}`}
        >
          <div className="office-scene-bg" />
  
          <div className="office-server-core">
            <div className="server-glass" />
            <div className="server-rack rack-one" />
            <div className="server-rack rack-two" />
            <div className="server-rack rack-three" />
            <div className="server-core-light" />
  
            <div className="office-floating-label label-server">
              <span className="dot cyan" />
              <strong>Server Room</strong>
              <small>
                {isProcessing
                  ? "Routing live task events"
                  : "All systems running"}
              </small>
            </div>
          </div>
  
          {realAgents.length === 0 && (
            <div className="office-empty-agents">
              <strong>No registered agents found</strong>
              <small>
                Register an agent in the backend to show it in the office.
              </small>
            </div>
          )}
  
          {realAgents.map((agent, index) => {
            const slot = roomSlots[index];
            const status = normalizeStatus(
              agentStatuses[agent.name] || agent.status
            );
            const latestAgentTask = getLatestTaskForAgent(
              recentTasks,
              agent.name
            );
  
            const isActiveAgent =
              status === "working" || latestAgentTask?.status === "in_progress";
  
            return (
              <section
                key={agent.id}
                className={`office-room ${slot.roomClass} ${status} registered ${
                  isActiveAgent ? "active-room" : ""
                }`}
              >
                <div className="room-floor" />
                <div className="room-back-wall" />
                <div className="room-side-wall" />
  
                <div className="room-neon-strip" />
                <div className="room-plant plant-left" />
                <div className="room-plant plant-right" />
  
                <div className="agent-desk">
                  <div className="desk-surface" />
                  <div className="desk-monitor monitor-main" />
                  <div className="desk-monitor monitor-side" />
                  <div className="desk-keyboard" />
                  <div className="desk-chair" />
                </div>
  
                <div className="agent-avatar-iso">
                  <span>{getAgentInitial(agent.name)}</span>
                </div>
  
                <div className={`office-floating-label room-label ${slot.accent}`}>
                  <span className={`dot ${slot.accent}`} />
                  <strong>{agent.name}</strong>
                  <small>
                    {latestAgentTask?.inputText || getAgentRole(agent.name)}
                  </small>
                </div>
  
                {latestAgentTask && (
                  <div className={`mini-task-card ${latestAgentTask.status}`}>
                    <strong>{getTaskLabel(latestAgentTask)}</strong>
                    <small>{latestAgentTask.source}</small>
                  </div>
                )}
              </section>
            );
          })}
  
          <div
            className={`office-source-card source-whatsapp ${
              latestSource === "whatsapp" ? "source-active" : ""
            }`}
          >
            <span className="dot green" />
            <strong>WhatsApp Source</strong>
            <small>
              {getSourceSummary(latestWhatsAppTask, "Waiting for WhatsApp message")}
            </small>
          </div>
  
          <div
            className={`office-source-card source-manual ${
              latestSource === "manual" ? "source-active" : ""
            }`}
          >
            <span className="dot blue" />
            <strong>Manual Console</strong>
            <small>
              {getSourceSummary(latestManualTask, "Waiting for dashboard command")}
            </small>
          </div>
  
          <div
            className={`office-resource-card resource-skill ${
              activeSkill ? "resource-ready" : ""
            } ${isProcessing ? "resource-active" : ""}`}
          >
            <span className="dot purple" />
            <strong>Skill Shelf</strong>
            <small>
              {activeSkill
                ? `${activeSkill.name} → ${activeSkill.agentName}`
                : "No skill registered"}
            </small>
          </div>
  
          <div
            className={`office-resource-card resource-output ${
              latestTask?.status || ""
            }`}
          >
            <span className="dot yellow" />
            <strong>Output Board</strong>
            <small>{getOutputPreview(latestTask)}</small>
          </div>
  
          {latestTask && (
            <div className={`office-active-task ${latestTask.status}`}>
              <span>{latestTask.source}</span>
              <strong>{latestTask.agentName}</strong>
              <small>{getTaskLabel(latestTask)}</small>
            </div>
          )}
  
          <div className="office-help-bar">
            <span>Realtime office visualization</span>
            <span>Only registered agents are displayed</span>
          </div>
        </div>
      </div>
    );
  }