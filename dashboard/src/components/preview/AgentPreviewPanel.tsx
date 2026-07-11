type AgentPreviewPanelProps = {
  status: string;
};

function getPreviewTitle(status: string) {
  if (status === "working") {
    return "Agent Processing";
  }

  if (status === "error") {
    return "Agent Attention Required";
  }

  return "Agent Standing By";
}

function getPreviewDescription(status: string) {
  if (status === "working") {
    return "The agent is actively processing a task from WhatsApp or dashboard command.";
  }

  if (status === "error") {
    return "The agent encountered an error and requires attention before continuing.";
  }

  return "The agent is online, connected, and ready to receive the next command.";
}

function getStatusLabel(status: string) {
  if (status === "working") {
    return "Working";
  }

  if (status === "error") {
    return "Error";
  }

  return "Idle";
}

export function AgentPreviewPanel({ status }: AgentPreviewPanelProps) {
  const normalizedStatus =
    status === "working" || status === "error" ? status : "idle";

  return (
    <section
      className={`panel preview-panel preview-${normalizedStatus}`}
    >
      <div className="panel-header">
        <div>
          <h2>3D Agent Preview</h2>
          <p className="panel-subtitle">Status-aware visual placeholder</p>
        </div>

        <span className={`preview-status-chip ${normalizedStatus}`}>
          {getStatusLabel(normalizedStatus)}
        </span>
      </div>

      <div className="preview-stage">
        <div className="preview-orbit orbit-one" />
        <div className="preview-orbit orbit-two" />

        <div className="robot-preview">
          <div className="robot-glow" />

          <div className="robot-antenna">
            <span />
          </div>

          <div className="robot-head">
            <div className="robot-eye" />
            <div className="robot-eye" />
          </div>

          <div className="robot-neck" />

          <div className="robot-body">
            <div className="robot-core" />
          </div>

          <div className="robot-shadow" />
        </div>
      </div>

      <div className="preview-info">
        <h3>{getPreviewTitle(normalizedStatus)}</h3>
        <p>{getPreviewDescription(normalizedStatus)}</p>

        <div className="preview-signal-row">
          <span>Realtime Signal</span>
          <strong>{normalizedStatus}</strong>
        </div>
      </div>
    </section>
  );
}