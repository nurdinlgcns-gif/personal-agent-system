export function WhatsAppPanel() {
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
            <small>Last Incoming Message</small>
            <p>@design-agent ...</p>
          </div>
  
          <div>
            <small>Last Reply Sent</small>
            <p>Agent response delivered to WhatsApp.</p>
          </div>
        </div>
      </section>
    );
  }