import type { TaskSnapshot } from "../../types/api";

type WhatsAppPanelProps = {
  lastWhatsAppTask?: TaskSnapshot;
  whatsappTaskCount: number;
};

export function WhatsAppPanel({
  lastWhatsAppTask,
  whatsappTaskCount,
}: WhatsAppPanelProps) {
  return (
    <section className="panel whatsapp-panel">
      <div className="panel-header">
        <h2>WhatsApp Integration</h2>
        <span className="connected-chip">Connected</span>
      </div>

      <div className="info-list">
        <div>
          <small>Allowed Sender</small>
          <strong>Configured in .env</strong>
        </div>

        <div>
          <small>WhatsApp Requests</small>
          <strong>{whatsappTaskCount} recent tasks</strong>
        </div>

        <div>
          <small>Last Incoming Message</small>
          <p>{lastWhatsAppTask?.inputText || "No WhatsApp task yet."}</p>
        </div>

        <div>
          <small>Last Reply Sent</small>
          <p>
            {lastWhatsAppTask?.outputText
              ? lastWhatsAppTask.outputText.slice(0, 120) + "..."
              : "No reply recorded yet."}
          </p>
        </div>
      </div>
    </section>
  );
}