import "./services/socket";
import "./App.css";

import { useAgentStore } from "./store/agentStore";
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
    agentEvents,
    taskEvents,
  } = useAgentStore();

  const designAgentStatus = agentStatuses["design-agent"] || "idle";

  const runningTaskCount = taskEvents.filter(
    (event) => event.status === "in_progress"
  ).length;

  const completedTaskCount = taskEvents.filter(
    (event) => event.status === "done"
  ).length;

  const errorTaskCount = taskEvents.filter(
    (event) => event.status === "error"
  ).length;

  const whatsappTaskCount = taskEvents.filter(
    (event) => event.source === "whatsapp"
  ).length;

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <main className="dashboard-main">
        <TopHeader
          connectionStatus={connectionStatus}
          socketId={socketId}
        />

        <MetricsGrid
          agentCount={3}
          runningTaskCount={runningTaskCount}
          completedTaskCount={completedTaskCount}
          errorTaskCount={errorTaskCount}
          whatsappTaskCount={whatsappTaskCount}
        />

        <section className="dashboard-grid-main">
          <AgentStatusPanel agentStatuses={agentStatuses} />

          <EventTimeline
            agentEvents={agentEvents}
            taskEvents={taskEvents}
          />

          <AgentPreviewPanel status={designAgentStatus} />
        </section>

        <section className="dashboard-grid-bottom">
          <RecentTasksTable taskEvents={taskEvents} />

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