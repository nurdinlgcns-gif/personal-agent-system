import type { TaskSnapshot } from "../../types/api";

type WhatsAppPanelProps = {
  lastWhatsAppTask?: TaskSnapshot;
  whatsappTaskCount: number;
  isProcessing: boolean;
};

function truncateText(value?: string | null, maxLength = 120) {
  if (!value) {
    return "No data recorded yet.";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export function WhatsAppPanel({
  lastWhatsAppTask,
  whatsappTaskCount,
  isProcessing,
}: WhatsAppPanelProps) {
  return (
    <section className="panel whatsapp-panel dashboard-whatsapp-polish">
      <div className="panel-header">
        <div>
          <h2>WhatsApp Integration</h2>
          <p className="panel-subtitle">Main mobile command interface</p>
        </div>

        <span className={`connected-chip ${isProcessing ? "processing" : ""}`}>
          {isProcessing ? "Processing" : "Connected"}
        </span>
      </div>

      <div className="dashboard-whatsapp-summary-grid">
        <div>
          <span>State</span>
          <strong>{isProcessing ? "Processing" : "Ready"}</strong>
        </div>

        <div>
          <span>Requests</span>
          <strong>{whatsappTaskCount}</strong>
        </div>

        <div>
          <span>Last Agent</span>
          <strong>
            {lastWhatsAppTask?.agentName ? `@${lastWhatsAppTask.agentName}` : "-"}
          </strong>
        </div>

        <div>
          <span>Last Updated</span>
          <strong>{formatDateTime(lastWhatsAppTask?.updatedAt)}</strong>
        </div>
      </div>

      <div className="dashboard-whatsapp-preview-grid">
        <div>
          <span>Last Incoming Message</span>
          <p>{truncateText(lastWhatsAppTask?.inputText, 180)}</p>
        </div>

        <div>
          <span>Last Reply Sent</span>
          <p>{truncateText(lastWhatsAppTask?.outputText, 180)}</p>
        </div>
      </div>
    </section>
  );
}