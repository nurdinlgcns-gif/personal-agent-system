type TopHeaderProps = {
    connectionStatus: string;
    socketId: string | null;
  };
  
  export function TopHeader({ connectionStatus, socketId }: TopHeaderProps) {
    const now = new Date();
  
    return (
      <header className="top-header">
        <div>
          <h1>Personal Multi-Agent System</h1>
          <p>Realtime AI Agent Orchestration Dashboard</p>
        </div>
  
        <div className="header-actions">
          <div className={`status-badge ${connectionStatus}`}>
            <span className="status-dot" />
            {connectionStatus}
          </div>
  
          <div className="socket-chip">
            <span>WebSocket</span>
            <span className={socketId ? "online-dot" : "offline-dot"} />
          </div>
  
          <div className="time-card">
            <strong>{now.toLocaleTimeString()}</strong>
            <small>{now.toLocaleDateString()}</small>
          </div>
        </div>
      </header>
    );
  }