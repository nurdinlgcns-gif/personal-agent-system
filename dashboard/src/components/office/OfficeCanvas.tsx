import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type {
  AgentSnapshot,
  SkillSnapshot,
  TaskSnapshot,
} from "../../types/api";
import {
  OfficeDetailPanel,
  type OfficeDetailItem,
} from "./OfficeDetailPanel";
import { OfficeFlowChannels } from "./OfficeFlowChannels";
import { sortOfficeAgents } from "./officeAgentOrder";

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

type ActivityLogPosition = {
  x: number;
  y: number;
};

type VisualFlowState = {
  active: boolean;
  source: string;
  status: string;
  taskId: string | null;
  startedAt: number;
};

const ACTIVITY_LOG_POSITION_KEY = "office-activity-log-position";
const OFFICE_ZOOM_STORAGE_KEY = "office-scene-zoom-level";
const OFFICE_SHOW_LABELS_KEY = "office-show-labels";
const OFFICE_SHOW_LOG_KEY = "office-show-activity-log";
const OFFICE_COMPACT_MODE_KEY = "office-compact-mode";

const OFFICE_SCENE_WIDTH = 1600;
const OFFICE_SCENE_HEIGHT = 700;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.25;
const ZOOM_STEP = 0.1;

const MIN_VISUAL_FLOW_MS = 4200;

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

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function readBooleanPreference(key: string, fallbackValue: boolean) {
  const savedValue = localStorage.getItem(key);

  if (savedValue === "true") {
    return true;
  }

  if (savedValue === "false") {
    return false;
  }

  return fallbackValue;
}

function getInitialZoomLevel() {
  const savedZoom = localStorage.getItem(OFFICE_ZOOM_STORAGE_KEY);

  if (savedZoom) {
    const parsedZoom = Number(savedZoom);

    if (!Number.isNaN(parsedZoom)) {
      return clampZoom(parsedZoom);
    }
  }

  if (window.innerWidth <= 700) {
    return 0.62;
  }

  if (window.innerWidth <= 1200) {
    return 0.75;
  }

  return 1;
}

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

function formatShortTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString();
}

function getActivityIcon(status: string) {
  if (status === "in_progress") {
    return "⌁";
  }

  if (status === "done") {
    return "✓";
  }

  if (status === "error") {
    return "!";
  }

  return "•";
}

function getActivityLabel(task: TaskSnapshot) {
  if (task.status === "in_progress") {
    return `${task.agentName} is processing`;
  }

  if (task.status === "done") {
    return `${task.agentName} completed task`;
  }

  if (task.status === "error") {
    return `${task.agentName} task failed`;
  }

  return `${task.agentName} update`;
}

function getRuntimeProviderLabel(task?: TaskSnapshot) {
  if (!task) {
    return "-";
  }

  return task.runtimeProviderName || task.runtimeProviderType || "-";
}

function getRuntimeModelLabel(task?: TaskSnapshot) {
  if (!task) {
    return "-";
  }

  return task.runtimeModel || "-";
}

function getRuntimeModeLabel(task?: TaskSnapshot) {
  if (!task) {
    return "-";
  }

  return task.runtimeMode || "-";
}

function getRuntimeResolvedFromLabel(task?: TaskSnapshot) {
  if (!task) {
    return "-";
  }

  return task.runtimeResolvedFrom || "-";
}

function getRuntimeActivityLabel(task: TaskSnapshot) {
  if (!task.runtimeProviderName && !task.runtimeModel) {
    return "runtime auto";
  }

  const providerName =
    task.runtimeProviderName || task.runtimeProviderType || "runtime";

  const modelName = task.runtimeModel || "auto";

  return `${providerName} · ${modelName}`;
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
      runtimeMemoryTask: null,
      metadata: [
        {
          label: "Task ID",
          value: "-",
        },
        {
          label: "Source",
          value: "-",
        },
        {
          label: "Status",
          value: "waiting",
        },
        {
          label: "Runtime Provider",
          value: "-",
        },
        {
          label: "Runtime Type",
          value: "-",
        },
        {
          label: "Runtime Model",
          value: "-",
        },
        {
          label: "Runtime Mode",
          value: "-",
        },
        {
          label: "Resolved From",
          value: "-",
        },
        {
          label: "Memory Injected",
          value: "-",
        },
        {
          label: "Memory Items",
          value: "-",
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
    runtimeMemoryTask: task,
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
        label: "Runtime Provider",
        value: getRuntimeProviderLabel(task),
      },
      {
        label: "Runtime Type",
        value: task.runtimeProviderType || "-",
      },
      {
        label: "Runtime Model",
        value: getRuntimeModelLabel(task),
      },
      {
        label: "Runtime Mode",
        value: getRuntimeModeLabel(task),
      },
      {
        label: "Resolved From",
        value: getRuntimeResolvedFromLabel(task),
      },
      {
        label: "Memory Injected",
        value:
          typeof task.runtimeMemoryInjected === "boolean"
            ? task.runtimeMemoryInjected
              ? "Yes"
              : "No"
            : "-",
      },
      {
        label: "Memory Items",
        value:
          typeof task.runtimeMemoryItemCount === "number"
            ? String(task.runtimeMemoryItemCount)
            : "-",
      },
      {
        label: "Memory Chars",
        value:
          typeof task.runtimeMemoryTotalChars === "number"
            ? String(task.runtimeMemoryTotalChars)
            : "-",
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
  const sceneViewportRef = useRef<HTMLDivElement | null>(null);
  const visualFlowTimeoutRef = useRef<number | null>(null);

  const [selectedItem, setSelectedItem] = useState<OfficeDetailItem | null>(
    null
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showMoreActivity, setShowMoreActivity] = useState(false);

  const [showLabels, setShowLabels] = useState(() =>
    readBooleanPreference(OFFICE_SHOW_LABELS_KEY, true)
  );
  const [showActivityLog, setShowActivityLog] = useState(() =>
    readBooleanPreference(OFFICE_SHOW_LOG_KEY, true)
  );
  const [compactMode, setCompactMode] = useState(() =>
    readBooleanPreference(OFFICE_COMPACT_MODE_KEY, false)
  );

  const [zoomLevel, setZoomLevel] = useState(getInitialZoomLevel);

  const [visualFlow, setVisualFlow] = useState<VisualFlowState>({
    active: false,
    source: "none",
    status: "idle",
    taskId: null,
    startedAt: 0,
  });

  const [activityLogPosition, setActivityLogPosition] =
    useState<ActivityLogPosition>(() => {
      const savedPosition = localStorage.getItem(ACTIVITY_LOG_POSITION_KEY);

      if (!savedPosition) {
        return { x: 0, y: 0 };
      }

      try {
        return JSON.parse(savedPosition) as ActivityLogPosition;
      } catch {
        return { x: 0, y: 0 };
      }
    });

  const [isActivityLogDragging, setIsActivityLogDragging] = useState(false);

  const activityLogDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const realAgents = sortOfficeAgents(agents).slice(0, roomSlots.length);

  const latestTask = recentTasks[0];
  const latestWhatsAppTask = getLatestWhatsAppTask(recentTasks);
  const latestManualTask = getLatestManualTask(recentTasks);
  const activeSkill = getSkillForLatestTask(skills, latestTask);

  const latestTaskStatus = latestTask?.status || "idle";
  const latestSource = latestTask?.source || "none";
  const hasLatestTask = Boolean(latestTask);

  const visibleActivityTasks = showMoreActivity
    ? recentTasks.slice(0, 8)
    : recentTasks.slice(0, 4);

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

  const visualFlowSource = visualFlow.source || latestSource;
  const visualFlowStatus = visualFlow.active ? "in_progress" : visualFlow.status;
  const visualFlowHasTask = hasLatestTask || Boolean(visualFlow.taskId);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDetailPanel();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (visualFlowTimeoutRef.current) {
        window.clearTimeout(visualFlowTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isProcessing) {
      if (visualFlowTimeoutRef.current) {
        window.clearTimeout(visualFlowTimeoutRef.current);
        visualFlowTimeoutRef.current = null;
      }

      setVisualFlow({
        active: true,
        source: latestSource,
        status: "in_progress",
        taskId: latestTask?.id || null,
        startedAt: Date.now(),
      });

      return;
    }

    setVisualFlow((currentFlow) => {
      if (!currentFlow.active) {
        return {
          ...currentFlow,
          source: latestSource || currentFlow.source,
          status: latestTaskStatus,
          taskId: latestTask?.id || currentFlow.taskId,
        };
      }

      const finalStatus =
        latestTaskStatus === "error"
          ? "error"
          : latestTaskStatus === "done"
            ? "done"
            : "idle";

      const elapsedTime = Date.now() - currentFlow.startedAt;
      const remainingTime = Math.max(0, MIN_VISUAL_FLOW_MS - elapsedTime);

      if (visualFlowTimeoutRef.current) {
        window.clearTimeout(visualFlowTimeoutRef.current);
      }

      visualFlowTimeoutRef.current = window.setTimeout(() => {
        setVisualFlow((previousFlow) => ({
          ...previousFlow,
          active: false,
          status: finalStatus,
          taskId: latestTask?.id || previousFlow.taskId,
          startedAt: 0,
        }));
      }, remainingTime);

      return currentFlow;
    });
  }, [isProcessing, latestSource, latestTaskStatus, latestTask?.id]);

  useEffect(() => {
    localStorage.setItem(
      ACTIVITY_LOG_POSITION_KEY,
      JSON.stringify(activityLogPosition)
    );
  }, [activityLogPosition]);

  useEffect(() => {
    localStorage.setItem(OFFICE_ZOOM_STORAGE_KEY, String(zoomLevel));
  }, [zoomLevel]);

  useEffect(() => {
    localStorage.setItem(OFFICE_SHOW_LABELS_KEY, String(showLabels));
  }, [showLabels]);

  useEffect(() => {
    localStorage.setItem(OFFICE_SHOW_LOG_KEY, String(showActivityLog));
  }, [showActivityLog]);

  useEffect(() => {
    localStorage.setItem(OFFICE_COMPACT_MODE_KEY, String(compactMode));
  }, [compactMode]);

  function setDetail(key: string, item: OfficeDetailItem) {
    setSelectedKey(key);
    setSelectedItem(item);
  }

  function closeDetailPanel() {
    setSelectedKey(null);
    setSelectedItem(null);
  }

  function resetActivityLogPosition() {
    setActivityLogPosition({
      x: 0,
      y: 0,
    });
  }

  function zoomIn() {
    setZoomLevel((currentZoom) =>
      clampZoom(Number((currentZoom + ZOOM_STEP).toFixed(2)))
    );
  }

  function zoomOut() {
    setZoomLevel((currentZoom) =>
      clampZoom(Number((currentZoom - ZOOM_STEP).toFixed(2)))
    );
  }

  function resetZoom() {
    setZoomLevel(1);
  }

  function resetOfficePreferences() {
    closeDetailPanel();
    setShowLabels(true);
    setShowActivityLog(true);
    setCompactMode(false);
    setShowMoreActivity(false);
    setZoomLevel(1);
    resetActivityLogPosition();

    localStorage.setItem(OFFICE_SHOW_LABELS_KEY, "true");
    localStorage.setItem(OFFICE_SHOW_LOG_KEY, "true");
    localStorage.setItem(OFFICE_COMPACT_MODE_KEY, "false");
    localStorage.setItem(OFFICE_ZOOM_STORAGE_KEY, "1");
    localStorage.setItem(
      ACTIVITY_LOG_POSITION_KEY,
      JSON.stringify({ x: 0, y: 0 })
    );
  }

  function fitOfficeScene() {
    const viewport = sceneViewportRef.current;

    if (!viewport) {
      return;
    }

    const availableWidth = viewport.clientWidth - 28;
    const availableHeight = viewport.clientHeight - 28;

    const widthScale = availableWidth / OFFICE_SCENE_WIDTH;
    const heightScale = availableHeight / OFFICE_SCENE_HEIGHT;

    const nextZoom = clampZoom(
      Number(Math.min(widthScale, heightScale, 1).toFixed(2))
    );

    setZoomLevel(nextZoom);

    window.requestAnimationFrame(() => {
      viewport.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
      });
    });
  }

  function handleActivityLogPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("button")) {
      return;
    }

    event.stopPropagation();

    activityLogDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: activityLogPosition.x,
      originY: activityLogPosition.y,
    };

    setIsActivityLogDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleActivityLogPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = activityLogDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextX = dragState.originX + event.clientX - dragState.startX;
    const nextY = dragState.originY + event.clientY - dragState.startY;

    setActivityLogPosition({
      x: nextX,
      y: nextY,
    });
  }

  function handleActivityLogPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = activityLogDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    activityLogDragRef.current = null;
    setIsActivityLogDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function openAgentDetail(agent: AgentSnapshot, status: string) {
    const latestAgentTask = getLatestTaskForAgent(recentTasks, agent.name);
    const assignedSkills = skills.filter(
      (skill) => skill.agentName === agent.name
    );

    setDetail(`agent:${agent.name}`, {
      type: "agent",
      title: agent.name,
      subtitle: getAgentRole(agent.name),
      status,
      accent:
        status === "working" ? "orange" : status === "error" ? "red" : "green",
      body:
        latestAgentTask?.inputText ||
        "This agent is registered and ready to receive tasks.",
      runtimeMemoryTask: latestAgentTask || null,
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
    setDetail(`source:${source}`, {
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
        `No ${source === "whatsapp" ? "WhatsApp" : "manual"
        } task has been received yet.`,
      runtimeMemoryTask: task || null,
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
          label: "Memory Injected",
          value:
            typeof task?.runtimeMemoryInjected === "boolean"
              ? task.runtimeMemoryInjected
                ? "Yes"
                : "No"
              : "-",
        },
        {
          label: "Memory Items",
          value:
            typeof task?.runtimeMemoryItemCount === "number"
              ? String(task.runtimeMemoryItemCount)
              : "-",
        },
        {
          label: "Created",
          value: task ? formatTime(task.createdAt) : "-",
        },
      ],
    });
  }

  function openSkillDetail(skill?: SkillSnapshot) {
    setDetail("skill:shelf", {
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
    setDetail("output:board", {
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
      runtimeMemoryTask: task || null,
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
        {
          label: "Runtime Provider",
          value: getRuntimeProviderLabel(task),
        },
        {
          label: "Runtime Type",
          value: task?.runtimeProviderType || "-",
        },
        {
          label: "Runtime Model",
          value: getRuntimeModelLabel(task),
        },
        {
          label: "Runtime Mode",
          value: getRuntimeModeLabel(task),
        },
        {
          label: "Resolved From",
          value: getRuntimeResolvedFromLabel(task),
        },
        {
          label: "Memory Injected",
          value:
            typeof task?.runtimeMemoryInjected === "boolean"
              ? task.runtimeMemoryInjected
                ? "Yes"
                : "No"
              : "-",
        },
        {
          label: "Memory Items",
          value:
            typeof task?.runtimeMemoryItemCount === "number"
              ? String(task.runtimeMemoryItemCount)
              : "-",
        },
        {
          label: "Memory Chars",
          value:
            typeof task?.runtimeMemoryTotalChars === "number"
              ? String(task.runtimeMemoryTotalChars)
              : "-",
        },
      ],
    });
  }

  function openServerDetail() {
    setDetail("server:core", {
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

  function openTaskDetail(task: TaskSnapshot) {
    setDetail(`task:${task.id}`, createTaskDetail(task));
  }

  return (
    <div className="office-scene-shell">
      <div className="office-scene-topbar">
        <div>
          <strong>Agent Office Scene</strong>
          <span>{getSceneLabel(visualFlow.active, latestTask)}</span>
        </div>

        <div className="office-scene-stats">
          <span>{realAgents.length} real agents</span>
          <span>{workingCount} working</span>
          <span>{idleCount} idle</span>
          <span>{errorCount} error</span>
          <span>{skills.length} skills</span>
        </div>
      </div>

      <div className="office-viewport-controls">
        <div className="office-viewport-control-group">
          <button type="button" onClick={zoomOut}>
            Zoom -
          </button>

          <button type="button" onClick={resetZoom}>
            {Math.round(zoomLevel * 100)}%
          </button>

          <button type="button" onClick={zoomIn}>
            Zoom +
          </button>

          <button type="button" onClick={fitOfficeScene}>
            Fit
          </button>
        </div>

        <small>Scroll or drag the viewport to explore the office scene.</small>
      </div>

      <div className="office-scene-viewport" ref={sceneViewportRef}>
        <div
          className="office-stage"
          style={{
            width: OFFICE_SCENE_WIDTH * zoomLevel,
            height: OFFICE_SCENE_HEIGHT * zoomLevel,
          }}
        >
          <div
            className={`office-scene ${visualFlow.active ? "is-processing" : ""
              } ${realAgents.length === 1 ? "single-agent-scene" : ""} office-latest-${visualFlowStatus
              } ${selectedItem ? "detail-open" : ""} ${showLabels ? "" : "labels-hidden"
              } ${showActivityLog ? "" : "activity-hidden"} ${compactMode ? "compact-office" : ""
              }`}
            style={{
              width: OFFICE_SCENE_WIDTH,
              height: OFFICE_SCENE_HEIGHT,
              minHeight: OFFICE_SCENE_HEIGHT,
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
            onClick={closeDetailPanel}
          >
            <div className="office-scene-bg" />

            <OfficeFlowChannels
              isProcessing={visualFlow.active}
              latestSource={visualFlowSource}
              latestTaskStatus={visualFlowStatus}
              hasLatestTask={visualFlowHasTask}
            />

            <div
              className="office-mini-toolbar"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={showLabels ? "active" : ""}
                onClick={() => setShowLabels((current) => !current)}
              >
                {showLabels ? "Hide Labels" : "Show Labels"}
              </button>

              <button
                type="button"
                className={showActivityLog ? "active" : ""}
                onClick={() => setShowActivityLog((current) => !current)}
              >
                {showActivityLog ? "Hide Log" : "Show Log"}
              </button>

              <button
                type="button"
                className={compactMode ? "active" : ""}
                onClick={() => setCompactMode((current) => !current)}
              >
                {compactMode ? "Comfort" : "Compact"}
              </button>

              <button type="button" onClick={resetOfficePreferences}>
                Reset
              </button>
            </div>

            <div
              className="office-legend"
              onClick={(event) => event.stopPropagation()}
            >
              <strong>Legend</strong>

              <div className="office-legend-grid">
                <span>
                  <i className="legend-dot green" />
                  Idle / Done
                </span>

                <span>
                  <i className="legend-dot orange" />
                  Processing
                </span>

                <span>
                  <i className="legend-dot red" />
                  Error
                </span>

                <span>
                  <i className="legend-dot purple" />
                  Skill
                </span>

                <span>
                  <i className="legend-dot cyan" />
                  Server
                </span>

                <span>
                  <i className="legend-dot blue" />
                  Manual
                </span>
              </div>
            </div>

            <button
              type="button"
              className={`office-server-core office-clickable ${selectedKey === "server:core" ? "office-selected-element" : ""
                }`}
              onClick={(event) => {
                event.stopPropagation();
                openServerDetail();
              }}
              aria-pressed={selectedKey === "server:core"}
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
                  {visualFlow.active
                    ? "Routing live task events"
                    : "All systems running"}
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
                status === "working" ||
                latestAgentTask?.status === "in_progress" ||
                visualFlow.active;

              const agentKey = `agent:${agent.name}`;

              return (
                <button
                  type="button"
                  key={agent.id}
                  className={`office-room office-clickable ${slot.roomClass
                    } ${status} registered ${isActiveAgent ? "active-room" : ""
                    } ${selectedKey === agentKey ? "office-selected-element" : ""
                    }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openAgentDetail(agent, status);
                  }}
                  aria-pressed={selectedKey === agentKey}
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

                  <div
                    className={`office-floating-label room-label ${slot.accent}`}
                  >
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
              className={`office-source-card office-clickable source-whatsapp ${latestSource === "whatsapp" ? "source-active" : ""
                } ${selectedKey === "source:whatsapp"
                  ? "office-selected-element"
                  : ""
                }`}
              onClick={(event) => {
                event.stopPropagation();
                openSourceDetail("whatsapp", latestWhatsAppTask);
              }}
              aria-pressed={selectedKey === "source:whatsapp"}
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
              className={`office-source-card office-clickable source-manual ${latestSource === "manual" ? "source-active" : ""
                } ${selectedKey === "source:manual"
                  ? "office-selected-element"
                  : ""
                }`}
              onClick={(event) => {
                event.stopPropagation();
                openSourceDetail("manual", latestManualTask);
              }}
              aria-pressed={selectedKey === "source:manual"}
            >
              <span className="dot blue" />
              <strong>Manual Console</strong>
              <small>
                {getSourceSummary(
                  latestManualTask,
                  "Waiting for dashboard command"
                )}
              </small>
            </button>

            <button
              type="button"
              className={`office-resource-card office-clickable resource-skill ${activeSkill ? "resource-ready" : ""
                } ${visualFlow.active ? "resource-active" : ""} ${selectedKey === "skill:shelf"
                  ? "office-selected-element"
                  : ""
                }`}
              onClick={(event) => {
                event.stopPropagation();
                openSkillDetail(activeSkill);
              }}
              aria-pressed={selectedKey === "skill:shelf"}
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
              className={`office-resource-card office-clickable resource-output ${latestTask?.status || ""
                } ${selectedKey === "output:board"
                  ? "office-selected-element"
                  : ""
                }`}
              onClick={(event) => {
                event.stopPropagation();
                openOutputDetail(latestTask);
              }}
              aria-pressed={selectedKey === "output:board"}
            >
              <span className="dot yellow" />
              <strong>Output Board</strong>
              <small>{getOutputPreview(latestTask)}</small>
            </button>

            {showActivityLog && (
              <div
                className={`office-activity-log ${isActivityLogDragging ? "dragging" : ""
                  }`}
                style={
                  {
                    "--office-activity-log-x": `${activityLogPosition.x}px`,
                    "--office-activity-log-y": `${activityLogPosition.y}px`,
                  } as CSSProperties
                }
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className="office-activity-header draggable"
                  onPointerDown={handleActivityLogPointerDown}
                  onPointerMove={handleActivityLogPointerMove}
                  onPointerUp={handleActivityLogPointerUp}
                  onPointerCancel={handleActivityLogPointerUp}
                >
                  <div>
                    <strong>Mini Activity Log</strong>
                    <small>Latest office events</small>
                  </div>

                  <div className="office-activity-actions">
                    {recentTasks.length > 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowMoreActivity((current) => !current)
                        }
                      >
                        {showMoreActivity ? "Show less" : "Show more"}
                      </button>
                    )}

                    <button type="button" onClick={resetActivityLogPosition}>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="office-activity-list">
                  {visibleActivityTasks.length === 0 ? (
                    <div className="office-activity-empty">
                      <span>◇</span>
                      <p>No task activity yet.</p>
                    </div>
                  ) : (
                    visibleActivityTasks.map((task) => (
                      <button
                        type="button"
                        key={`activity-${task.id}`}
                        className={`office-activity-item ${task.status}`}
                        onClick={() => openTaskDetail(task)}
                      >
                        <span className="activity-icon">
                          {getActivityIcon(task.status)}
                        </span>

                        <div>
                          <strong>{getActivityLabel(task)}</strong>
                          <small>
                            {task.source} · {getRuntimeActivityLabel(task)} ·{" "}
                            {formatShortTime(task.updatedAt)}
                          </small>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="office-help-bar">
              <span>Click any element to inspect details</span>
              <span>ESC or empty area closes panel</span>
            </div>

            <OfficeDetailPanel item={selectedItem} onClose={closeDetailPanel} />
          </div>
        </div>
      </div>
    </div>
  );
}