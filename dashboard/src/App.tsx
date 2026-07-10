import "./services/socket";
import { useAgentStore } from "./store/agentStore";
import "./App.css";

function App() {
  const {
    connectionStatus,
    socketId,
    agentStatuses,
    agentEvents,
    taskEvents,
    clearEvents,
  } = useAgentStore();

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>Personal Multi-Agent Dashboard</h1>
          <p>Realtime status monitor for WhatsApp-driven AI agents.</p>
        </div>

        <div className={`connection-badge ${connectionStatus}`}>
          {connectionStatus}
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Connection</h2>
          <p className="label">Socket ID</p>
          <pre>{socketId || "-"}</pre>
        </div>

        <div className="card">
          <h2>Agent Status</h2>

          {Object.keys(agentStatuses).length === 0 ? (
            <p className="muted">No agent status received yet.</p>
          ) : (
            Object.entries(agentStatuses).map(([agentName, status]) => (
              <div key={agentName} className={`agent-row ${status}`}>
                <strong>{agentName}</strong>
                <span>{status}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <div className="section-header">
            <h2>Agent Events</h2>
            <button onClick={clearEvents}>Clear</button>
          </div>

          {agentEvents.length === 0 ? (
            <p className="muted">No agent events yet.</p>
          ) : (
            agentEvents.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`event ${event.status}`}
              >
                <strong>{event.agentName}</strong>
                <span>{event.status}</span>
                <small>{event.timestamp}</small>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>Task Events</h2>

          {taskEvents.length === 0 ? (
            <p className="muted">No task events yet.</p>
          ) : (
            taskEvents.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`event ${event.status}`}
              >
                <strong>{event.agentName}</strong>
                <span>{event.status}</span>
                <small>source: {event.source || "-"}</small>
                <small>{event.timestamp}</small>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;