import { useEffect, useCallback } from "react";

import "./services/socket";
import "./App.css";

import { useAgentStore } from "./store/agentStore";
import {
  fetchAgentsStatus,
  fetchRecentTasks,
  fetchSkills,
  fetchDashboardSummary,
} from "./services/api";

import type { TaskSnapshot } from "./types/api";
import type { TaskEventPayload } from "./types/websocket";

import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { MetricsGrid } from "./components/common/MetricsGrid";
import { AgentStatusPanel } from "./components/agents/AgentStatusPanel";
import { EventTimeline } from "./components/events/EventTimeline";
import { RecentTasksTable } from "./components/tasks/RecentTasksTable";
import { AgentPreviewPanel } from "./components/preview/AgentPreviewPanel";
import { WhatsAppPanel } from "./components/whatsapp/WhatsAppPanel";
import { SkillLibraryPanel } from "./components/skills/SkillLibraryPanel";
import { FloatingTaskAssistant } from "./components/manual/FloatingTaskAssistant";

function App() {
  const {
    connectionStatus,
    socketId,

    agentStatuses,
    agents,
    recentTasks,
    skills,
    dashboardSummary,

    agentEvents,
    taskEvents,

    isSnapshotLoading,
    snapshotError,

    setAgentsSnapshot,
    setRecentTasksSnapshot,
    setSkillsSnapshot,
    setDashboardSummary,
    setSnapshotLoading,
    setSnapshotError,
  } = useAgentStore();

  const loadSnapshot = useCallback(async () => {
    try {
      setSnapshotLoading(true);
      setSnapshotError(null);

      const [agentsData, tasksData, skillsData, summaryData] =
        await Promise.all([
          fetchAgentsStatus(),
          fetchRecentTasks(10),
          fetchSkills(),
          fetchDashboardSummary(),
        ]);

      setAgentsSnapshot(agentsData);
      setRecentTasksSnapshot(tasksData);
      setSkillsSnapshot(skillsData);
      setDashboardSummary(summaryData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load dashboard snapshot";

      setSnapshotError(message);
    } finally {
      setSnapshotLoading(false);
    }
  }, [
    setAgentsSnapshot,
    setRecentTasksSnapshot,
    setSkillsSnapshot,
    setDashboardSummary,
    setSnapshotLoading,
    setSnapshotError,
  ]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const latestTaskEvent = taskEvents[0];

    if (!latestTaskEvent) {
      return;
    }

    const shouldRefreshSnapshot =
      latestTaskEvent.status === "done" || latestTaskEvent.status === "error";

    if (!shouldRefreshSnapshot) {
      return;
    }

    const firstTimeout = window.setTimeout(() => {
      loadSnapshot();
    }, 300);

    const secondTimeout = window.setTimeout(() => {
      loadSnapshot();
    }, 1000);

    return () => {
      window.clearTimeout(firstTimeout);
      window.clearTimeout(secondTimeout);
    };
  }, [taskEvents, loadSnapshot]);

  const designAgentStatus = agentStatuses["design-agent"] || "idle";

  const latestTaskEventById = taskEvents.reduce<Record<string, TaskEventPayload>>(
    (accumulator, event) => {
      if (!event.taskId) {
        return accumulator;
      }

      if (!accumulator[event.taskId]) {
        accumulator[event.taskId] = event;
      }

      return accumulator;
    },
    {}
  );

  const recentTaskIds = new Set(recentTasks.map((task) => task.id));

  const recentTasksWithRealtimeStatus: TaskSnapshot[] = recentTasks.map(
    (task) => {
      const realtimeEvent = latestTaskEventById[task.id];

      if (!realtimeEvent) {
        return task;
      }

      return {
        ...task,
        status: realtimeEvent.status,
        source: realtimeEvent.source || task.source,
        updatedAt: realtimeEvent.timestamp,
      };
    }
  );

  const realtimeOnlyTasks: TaskSnapshot[] = Object.values(latestTaskEventById)
    .filter((event) => event.taskId && !recentTaskIds.has(event.taskId))
    .map((event) => ({
      id: event.taskId || "realtime-task",
      agentName: event.agentName,
      inputText: "Realtime event pending snapshot...",
      outputText: null,
      status: event.status,
      source: event.source || "realtime",
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
    }));

  const dashboardTasks = [
    ...realtimeOnlyTasks,
    ...recentTasksWithRealtimeStatus,
  ]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 10);

  const agentCount = agents.length || 3;

  /**
   * Metrics utama sekarang dari database summary.
   * Jadi nilainya total dari semua DB, bukan cuma recent 10 tasks.
   */
  const runningTaskCount =
    dashboardSummary?.runningTasks ??
    dashboardTasks.filter((task) => task.status === "in_progress").length;

  const completedTaskCount =
    dashboardSummary?.completedTasks ??
    dashboardTasks.filter((task) => task.status === "done").length;

  const errorTaskCount =
    dashboardSummary?.errorTasks ??
    dashboardTasks.filter((task) => task.status === "error").length;

  const whatsappTaskCount =
    dashboardSummary?.whatsappRequests ??
    dashboardTasks.filter((task) => task.source === "whatsapp").length;

  const lastWhatsAppTask = dashboardTasks.find(
    (task) => task.source === "whatsapp"
  );

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <main className="dashboard-main">
        <TopHeader connectionStatus={connectionStatus} socketId={socketId} />

        {snapshotError && (
          <div className="snapshot-alert">
            Snapshot error: {snapshotError}
          </div>
        )}

        {isSnapshotLoading && (
          <div className="snapshot-loading">
            Loading dashboard snapshot...
          </div>
        )}

        <MetricsGrid
          agentCount={agentCount}
          runningTaskCount={runningTaskCount}
          completedTaskCount={completedTaskCount}
          errorTaskCount={errorTaskCount}
          whatsappTaskCount={whatsappTaskCount}
        />

        <section className="dashboard-grid-main">
          <AgentStatusPanel agents={agents} agentStatuses={agentStatuses} />

          <EventTimeline agentEvents={agentEvents} taskEvents={taskEvents} />

          <AgentPreviewPanel status={designAgentStatus} />
        </section>

        <section className="dashboard-grid-bottom">
          <RecentTasksTable tasks={dashboardTasks} />

          <div className="side-stack">
            <WhatsAppPanel
              lastWhatsAppTask={lastWhatsAppTask}
              whatsappTaskCount={whatsappTaskCount}
            />

            <SkillLibraryPanel skills={skills} />
          </div>
        </section>

        <FloatingTaskAssistant
          onTaskSent={loadSnapshot}
          agents={agents}
          skills={skills}
        />
      </main>
    </div>
  );
}

export default App;