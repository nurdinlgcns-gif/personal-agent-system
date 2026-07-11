import { useEffect, useCallback, useState } from "react";

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

import { Sidebar, type DashboardView } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { MetricsGrid } from "./components/common/MetricsGrid";
import { AgentStatusPanel } from "./components/agents/AgentStatusPanel";
import { EventTimeline } from "./components/events/EventTimeline";
import { RecentTasksTable } from "./components/tasks/RecentTasksTable";
import { AgentPreviewPanel } from "./components/preview/AgentPreviewPanel";
import { WhatsAppPanel } from "./components/whatsapp/WhatsAppPanel";
import { SkillLibraryPanel } from "./components/skills/SkillLibraryPanel";
import { FloatingTaskAssistant } from "./components/manual/FloatingTaskAssistant";
import { OfficeView } from "./views/OfficeView";

function App() {
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

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

    isInitialLoading,
    isSilentRefreshing,
    snapshotError,

    setAgentsSnapshot,
    setRecentTasksSnapshot,
    setSkillsSnapshot,
    setDashboardSummary,
    setInitialLoading,
    setSilentRefreshing,
    setSnapshotError,
    clearEvents,
  } = useAgentStore();

  const loadInitialSnapshot = useCallback(async () => {
    try {
      setInitialLoading(true);
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
      setInitialLoading(false);
    }
  }, [
    setAgentsSnapshot,
    setRecentTasksSnapshot,
    setSkillsSnapshot,
    setDashboardSummary,
    setInitialLoading,
    setSnapshotError,
  ]);

  const refreshTasksAndSummary = useCallback(async () => {
    try {
      setSilentRefreshing(true);
      setSnapshotError(null);

      const [tasksData, summaryData] = await Promise.all([
        fetchRecentTasks(10),
        fetchDashboardSummary(),
      ]);

      setRecentTasksSnapshot(tasksData);
      setDashboardSummary(summaryData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to refresh dashboard data";

      setSnapshotError(message);
    } finally {
      setSilentRefreshing(false);
    }
  }, [
    setRecentTasksSnapshot,
    setDashboardSummary,
    setSilentRefreshing,
    setSnapshotError,
  ]);

  useEffect(() => {
    loadInitialSnapshot();
  }, [loadInitialSnapshot]);

  useEffect(() => {
    const latestTaskEvent = taskEvents[0];

    if (!latestTaskEvent) {
      return;
    }

    const shouldRefresh =
      latestTaskEvent.status === "done" || latestTaskEvent.status === "error";

    if (!shouldRefresh) {
      return;
    }

    const refreshTimeout = window.setTimeout(() => {
      refreshTasksAndSummary();
    }, 350);

    return () => {
      window.clearTimeout(refreshTimeout);
    };
  }, [taskEvents, refreshTasksAndSummary]);

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

  const realtimeRunningTaskCount = Object.values(latestTaskEventById).filter(
    (event) => event.status === "in_progress"
  ).length;

  const hasWorkingAgent = Object.values(agentStatuses).some(
    (status) => status === "working"
  );

  const isProcessing = realtimeRunningTaskCount > 0 || hasWorkingAgent;

  const agentCount = agents.length || 3;

  const runningTaskCount =
    realtimeRunningTaskCount || dashboardSummary?.runningTasks || 0;

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
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="dashboard-main">
        <TopHeader connectionStatus={connectionStatus} socketId={socketId} />

        {snapshotError && (
          <div className="snapshot-alert">
            Snapshot error: {snapshotError}
          </div>
        )}

        {isInitialLoading && (
          <div className="dashboard-loading-banner">
            <span className="loading-spinner" />
            Loading dashboard snapshot...
          </div>
        )}

        {isSilentRefreshing && (
          <div className="silent-refresh-indicator">
            <span className="loading-dot" />
            Syncing latest data...
          </div>
        )}

        {isProcessing && (
          <div className="processing-banner">
            <span className="processing-dot" />
            Agent task is currently processing...
          </div>
        )}

        {activeView === "dashboard" ? (
          <>
            <MetricsGrid
              agentCount={agentCount}
              runningTaskCount={runningTaskCount}
              completedTaskCount={completedTaskCount}
              errorTaskCount={errorTaskCount}
              whatsappTaskCount={whatsappTaskCount}
            />

            <section className="dashboard-grid-main">
              <AgentStatusPanel agents={agents} agentStatuses={agentStatuses} />

              <EventTimeline
                agentEvents={agentEvents}
                taskEvents={taskEvents}
                onClearEvents={clearEvents}
                isProcessing={isProcessing}
              />

              <AgentPreviewPanel status={designAgentStatus} />
            </section>

            <section className="dashboard-grid-bottom">
              <RecentTasksTable
                tasks={dashboardTasks}
                onRefresh={refreshTasksAndSummary}
                isRefreshing={isSilentRefreshing}
              />

              <div className="side-stack">
                <WhatsAppPanel
                  lastWhatsAppTask={lastWhatsAppTask}
                  whatsappTaskCount={whatsappTaskCount}
                  isProcessing={isProcessing}
                />

                <SkillLibraryPanel skills={skills} />
              </div>
            </section>
          </>
        ) : (
          <OfficeView
            agents={agents}
            agentStatuses={agentStatuses}
            recentTasks={dashboardTasks}
            skills={skills}
            isProcessing={isProcessing}
          />
        )}

        <FloatingTaskAssistant
          onTaskSent={refreshTasksAndSummary}
          agents={agents}
          skills={skills}
        />
      </main>
    </div>
  );
}

export default App;