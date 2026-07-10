import { useEffect, useCallback } from "react";

import "./services/socket";
import "./App.css";

import { useAgentStore } from "./store/agentStore";
import { fetchAgentsStatus, fetchRecentTasks } from "./services/api";

import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { MetricsGrid } from "./components/common/MetricsGrid";
import { AgentStatusPanel } from "./components/agents/AgentStatusPanel";
import { EventTimeline } from "./components/events/EventTimeline";
import { RecentTasksTable } from "./components/tasks/RecentTasksTable";
import { AgentPreviewPanel } from "./components/preview/AgentPreviewPanel";
import { WhatsAppPanel } from "./components/whatsapp/WhatsAppPanel";
import { SkillLibraryPanel } from "./components/skills/SkillLibraryPanel";

function App() {
  const {
    connectionStatus,
    socketId,
    agentStatuses,
    agents,
    recentTasks,
    agentEvents,
    taskEvents,
    isSnapshotLoading,
    snapshotError,
    setAgentsSnapshot,
    setRecentTasksSnapshot,
    setSnapshotLoading,
    setSnapshotError,
  } = useAgentStore();

  const loadSnapshot = useCallback(async () => {
    try {
      setSnapshotLoading(true);
      setSnapshotError(null);

      const [agentsData, tasksData] = await Promise.all([
        fetchAgentsStatus(),
        fetchRecentTasks(10),
      ]);

      setAgentsSnapshot(agentsData);
      setRecentTasksSnapshot(tasksData);
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
    setSnapshotLoading,
    setSnapshotError,
  ]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const hasDoneTaskEvent = taskEvents.some(
      (event) => event.status === "done" || event.status === "error"
    );

    if (!hasDoneTaskEvent) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadSnapshot();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [taskEvents, loadSnapshot]);

  const designAgentStatus = agentStatuses["design-agent"] || "idle";

  const agentCount = agents.length || 3;

  const runningTaskCount = recentTasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  const completedTaskCount = recentTasks.filter(
    (task) => task.status === "done"
  ).length;

  const errorTaskCount = recentTasks.filter(
    (task) => task.status === "error"
  ).length;

  const whatsappTaskCount = recentTasks.filter(
    (task) => task.source === "whatsapp"
  ).length;

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <main className="dashboard-main">
        <TopHeader
          connectionStatus={connectionStatus}
          socketId={socketId}
        />

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
          <AgentStatusPanel
            agents={agents}
            agentStatuses={agentStatuses}
          />

          <EventTimeline
            agentEvents={agentEvents}
            taskEvents={taskEvents}
          />

          <AgentPreviewPanel status={designAgentStatus} />
        </section>

        <section className="dashboard-grid-bottom">
          <RecentTasksTable tasks={recentTasks} />

          <div className="side-stack">
            <WhatsAppPanel />
            <SkillLibraryPanel />
          </div>
        </section>

        <section className="manual-task-bar">
          <div>
            <strong>Manual Task Test</strong>
            <p>@design-agent create an ad copy for running shoes</p>
          </div>

          <button>Send Task</button>
        </section>
      </main>
    </div>
  );
}

export default App;