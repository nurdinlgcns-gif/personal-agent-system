import type { TaskSnapshot } from "../../types/api";

type WhatsAppPanelProps = {
  lastWhatsAppTask?: TaskSnapshot;
  whatsappTaskCount: number;
  isProcessing: boolean;
};

export function WhatsAppPanel({
  lastWhatsAppTask,
  whatsappTaskCount,
  isProcessing,
}: WhatsAppPanelProps) {
  return (
    <section className="panel whatsapp-panel">
      <div className="panel-header">
        <div>
          <h2>WhatsApp Integration</h2>
          <p className="panel-subtitle">Main mobile command interface</p>
        </div>

        <span className={`connected-chip ${isProcessing ? "processing" : ""}`}>
          {isProcessing ? "Processing" : "Connected"}
        </span>
      </div>

      <div className="info-list whatsapp-info-list">
        <div>
          <small>Connection State</small>
          <strong>{isProcessing ? "Agent is processing" : "Ready"}</strong>
        </div>

        <div>
          <small>WhatsApp Requests</small>
          <strong>{whatsappTaskCount} total requests</strong>
        </div>

        <div>
          <small>Last Incoming Message</small>
          <p>{lastWhatsAppTask?.inputText || "No WhatsApp task yet."}</p>
        </div>

        <div>
          <small>Last Reply Sent</small>
          <p>
            {lastWhatsAppTask?.outputText
              ? lastWhatsAppTask.outputText.slice(0, 140) + "..."
              : "No reply recorded yet."}
          </p>
        </div>
      </div>
    </section>
  );
}