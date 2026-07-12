import { useState } from "react";
import type {
  AgentSnapshot,
  SkillSnapshot,
  TaskSnapshot,
} from "../../types/api";
import {
  OfficeDetailPanel,
  type OfficeDetailItem,
} from "./OfficeDetailPanel";

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

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function createTaskDetail(task?: TaskSnapshot): OfficeDetailItem {
  if (!task) {
    return {
      type: "task",
      title: "No Task Selected",
      subtitle: "No task data is available yet.",
      status: "waiting",
      accent: "blue",
      body: "Tasks from WhatsApp, Manual Console, or backend automation will appear here.",
      metadata: [
        {
          label: "State",
          value: "waiting",
        },
      ],
    };
  }

  return {
    type: "task",
    title: task.agentName,
    subtitle: task.inputText,
    status: task.status,
    accent:
      task.status === "error"
        ? "red"
        : task.status === "done"
          ? "green"
          : "orange",
    body: task.outputText || "No output preview available yet.",
    metadata: [
      {
        label: "Task ID",
        value: task.id,
      },
      {
        label: "Source",
        value: task.source,
      },
      {
        label: "Status",
        value: task.status,
      },
      {
        label: "Created",
        value: formatTime(task.createdAt),
      },
      {
        label: "Updated",
        value: formatTime(task.updatedAt),
      },
    ],
  };
}

export function OfficeCanvas({
  agents,
  agentStatuses,
  recentTasks,
  skills,
  isProcessing,
}: OfficeCanvasProps) {
  const [selectedItem, setSelectedItem] = useState<OfficeDetailItem | null>(null);

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

  function openAgentDetail(agent: AgentSnapshot, status: string) {
    const latestAgentTask = getLatestTaskForAgent(recentTasks, agent.name);
    const assignedSkills = skills.filter((skill) => skill.agentName === agent.name);

    setSelectedItem({
      type: "agent",
      title: agent.name,
      subtitle: getAgentRole(agent.name),
      status,
      accent:
        status === "working" ? "orange" : status === "error" ? "red" : "green",
      body:
        latestAgentTask?.inputText ||
        "This agent is registered and ready to receive tasks.",
      metadata: [
        {
          label: "Agent ID",
          value: agent.id,
        },
        {
          label: "Current Status",
          value: status,
        },
        {
          label: "Assigned Skills",
          value:
            assignedSkills.length > 0
              ? assignedSkills.map((skill) => skill.name).join(", ")
              : "-",
        },
        {
          label: "Last Task",
          value: latestAgentTask?.id || "-",
        },
        {
          label: "Updated",
          value: formatTime(agent.updatedAt),
        },
      ],
    });
  }

  function openSourceDetail(source: "whatsapp" | "manual", task?: TaskSnapshot) {
    setSelectedItem({
      type: "source",
      title: source === "whatsapp" ? "WhatsApp Source" : "Manual Console",
      subtitle:
        source === "whatsapp"
          ? "Mobile command interface"
          : "Dashboard command interface",
      status: task?.status || "waiting",
      accent: source === "whatsapp" ? "green" : "blue",
      body:
        task?.inputText ||
        `No ${source === "whatsapp" ? "WhatsApp" : "manual"} task has been received yet.`,
      metadata: [
        {
          label: "Source",
          value: source,
        },
        {
          label: "Latest Task ID",
          value: task?.id || "-",
        },
        {
          label: "Agent",
          value: task?.agentName || "-",
        },
        {
          label: "Status",
          value: task?.status || "waiting",
        },
        {
          label: "Created",
          value: task ? formatTime(task.createdAt) : "-",
        },
      ],
    });
  }

  function openSkillDetail(skill?: SkillSnapshot) {
    setSelectedItem({
      type: "skill",
      title: skill?.name || "Skill Shelf",
      subtitle: skill ? `Assigned to ${skill.agentName}` : "No skill registered",
      status: skill ? "loaded" : "empty",
      accent: "purple",
      body:
        skill?.description ||
        "Skills registered in the backend will be visualized here.",
      metadata: [
        {
          label: "Skill ID",
          value: skill?.id || "-",
        },
        {
          label: "Agent",
          value: skill?.agentName || "-",
        },
        {
          label: "Path",
          value: skill?.filePath || "-",
        },
        {
          label: "Updated",
          value: skill ? formatTime(skill.updatedAt) : "-",
        },
      ],
    });
  }

  function openOutputDetail(task?: TaskSnapshot) {
    setSelectedItem({
      type: "output",
      title: "Output Board",
      subtitle: task ? `${task.agentName} latest output` : "No output yet",
      status: task?.status || "waiting",
      accent:
        task?.status === "error"
          ? "red"
          : task?.status === "done"
            ? "green"
            : "yellow",
      body: getOutputPreview(task),
      metadata: [
        {
          label: "Task ID",
          value: task?.id || "-",
        },
        {
          label: "Agent",
          value: task?.agentName || "-",
        },
        {
          label: "Source",
          value: task?.source || "-",
        },
        {
          label: "Status",
          value: task?.status || "waiting",
        },
      ],
    });
  }

  function openServerDetail() {
    setSelectedItem({
      type: "server",
      title: "Server Room",
      subtitle: "Realtime backend orchestration layer",
      status: isProcessing ? "processing" : "running",
      accent: "cyan",
      body:
        "This area represents the backend server, WebSocket event stream, orchestrator, database, and routing logic that coordinate agent activity.",
      metadata: [
        {
          label: "Agents",
          value: String(realAgents.length),
        },
        {
          label: "Working",
          value: String(workingCount),
        },
        {
          label: "Idle",
          value: String(idleCount),
        },
        {
          label: "Errors",
          value: String(errorCount),
        },
        {
          label: "Skills",
          value: String(skills.length),
        },
      ],
    });
  }

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

        <button
          type="button"
          className="office-server-core office-clickable"
          onClick={openServerDetail}
        >
          <div className="server-glass" />
          <div className="server-rack rack-one" />
          <div className="server-rack rack-two" />
          <div className="server-rack rack-three" />
          <div className="server-core-light" />

          <div className="office-floating-label label-server">
            <span className="dot cyan" />
            <strong>Server Room</strong>
            <small>
              {isProcessing ? "Routing live task events" : "All systems running"}
            </small>
          </div>
        </button>

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
            <button
              type="button"
              key={agent.id}
              className={`office-room office-clickable ${slot.roomClass} ${status} registered ${
                isActiveAgent ? "active-room" : ""
              }`}
              onClick={() => openAgentDetail(agent, status)}
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
            </button>
          );
        })}

        <button
          type="button"
          className={`office-source-card office-clickable source-whatsapp ${
            latestSource === "whatsapp" ? "source-active" : ""
          }`}
          onClick={() => openSourceDetail("whatsapp", latestWhatsAppTask)}
        >
          <span className="dot green" />
          <strong>WhatsApp Source</strong>
          <small>
            {getSourceSummary(
              latestWhatsAppTask,
              "Waiting for WhatsApp message"
            )}
          </small>
        </button>

        <button
          type="button"
          className={`office-source-card office-clickable source-manual ${
            latestSource === "manual" ? "source-active" : ""
          }`}
          onClick={() => openSourceDetail("manual", latestManualTask)}
        >
          <span className="dot blue" />
          <strong>Manual Console</strong>
          <small>
            {getSourceSummary(latestManualTask, "Waiting for dashboard command")}
          </small>
        </button>

        <button
          type="button"
          className={`office-resource-card office-clickable resource-skill ${
            activeSkill ? "resource-ready" : ""
          } ${isProcessing ? "resource-active" : ""}`}
          onClick={() => openSkillDetail(activeSkill)}
        >
          <span className="dot purple" />
          <strong>Skill Shelf</strong>
          <small>
            {activeSkill
              ? `${activeSkill.name} → ${activeSkill.agentName}`
              : "No skill registered"}
          </small>
        </button>

        <button
          type="button"
          className={`office-resource-card office-clickable resource-output ${
            latestTask?.status || ""
          }`}
          onClick={() => openOutputDetail(latestTask)}
        >
          <span className="dot yellow" />
          <strong>Output Board</strong>
          <small>{getOutputPreview(latestTask)}</small>
        </button>

        {latestTask && (
          <button
            type="button"
            className={`office-active-task office-clickable ${latestTask.status}`}
            onClick={() => setSelectedItem(createTaskDetail(latestTask))}
          >
            <span>{latestTask.source}</span>
            <strong>{latestTask.agentName}</strong>
            <small>{getTaskLabel(latestTask)}</small>
          </button>
        )}

        <div className="office-help-bar">
          <span>Realtime office visualization</span>
          <span>Click any element to inspect details</span>
        </div>

        <OfficeDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      </div>
    </div>
  );
}