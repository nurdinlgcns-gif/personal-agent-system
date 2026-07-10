type AgentStatusPanelProps = {
    agentStatuses: Record<string, string>;
  };
  
  const defaultAgents = ["design-agent", "research-agent", "code-agent"];
  
  export function AgentStatusPanel({ agentStatuses }: AgentStatusPanelProps) {
    return (
      <section className="panel agent-panel">
        <div className="panel-header">
          <h2>Agent Status</h2>
          <button>View All Agents</button>
        </div>
  
        <div className="agent-grid">
          {defaultAgents.map((agentName) => {
            const status = agentStatuses[agentName] || "idle";
  
            return (
              <div key={agentName} className={`agent-card ${status}`}>
                <div className="agent-avatar">
                  <span>🤖</span>
                </div>
  
                <div className="agent-info">
                  <strong>{agentName}</strong>
                  <span className={`agent-status-badge ${status}`}>
                    {status}
                  </span>
                  <div className="activity-line">⌁⌁⌁⌁⌁</div>
                  <small>Realtime monitored</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }