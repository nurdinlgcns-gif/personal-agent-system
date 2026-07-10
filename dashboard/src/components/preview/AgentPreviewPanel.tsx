type AgentPreviewPanelProps = {
    status: string;
  };
  
  export function AgentPreviewPanel({ status }: AgentPreviewPanelProps) {
    return (
      <section className={`panel preview-panel preview-${status}`}>
        <div className="panel-header">
          <h2>3D Agent Preview</h2>
          <span className="soon-badge">Coming Soon</span>
        </div>
  
        <div className="robot-preview">
          <div className="robot-glow" />
          <div className="robot-head">
            <div className="robot-eye" />
            <div className="robot-eye" />
          </div>
          <div className="robot-body" />
        </div>
  
        <h3>3D Agent Preview</h3>
        <p>Status-driven visualization powered by React Three Fiber.</p>
      </section>
    );
  }