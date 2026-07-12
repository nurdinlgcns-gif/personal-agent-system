type OfficeFlowChannelsProps = {
    isProcessing: boolean;
    latestSource: string;
    latestTaskStatus: string;
    hasLatestTask: boolean;
  };
  
  export function OfficeFlowChannels({
    isProcessing,
    latestSource,
    latestTaskStatus,
    hasLatestTask,
  }: OfficeFlowChannelsProps) {
    const isManualFlowActive = hasLatestTask && latestSource === "manual";
    const isWhatsAppFlowActive = hasLatestTask && latestSource === "whatsapp";
    const hasVisibleActivity = isProcessing || hasLatestTask;
  
    return (
      <svg
        className={`office-flow-channel-layer ${
          isProcessing ? "flow-active" : "flow-idle"
        } flow-status-${latestTaskStatus} flow-source-${latestSource}`}
        viewBox="0 0 1600 700"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter
            id="office-flow-glow"
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="3.6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
  
        {/* WhatsApp Source -> Server Room */}
        <path
          className="office-flow-duct duct-whatsapp-server"
          d="M285 305 H570 V355 H755"
        />
  
        {/* Manual Console -> Server Room */}
        <path
          className="office-flow-duct duct-manual-server"
          d="M285 530 H570 V390 H755"
        />
  
        {/* design-agent -> Server Room */}
        <path
          className="office-flow-duct duct-agent-server"
          d="M940 585 H985 V445 H860"
        />
  
        {/* Skill Shelf -> design-agent */}
        <path
          className="office-flow-duct duct-skill-agent"
          d="M620 615 H740"
        />
  
        {/* Server Room -> Output Board */}
        <path
          className="office-flow-duct duct-server-output"
          d="M900 385 H1125 V505 H1260"
        />
  
        {/* Ambient moving streams, subtle but always visible for structural clarity */}
        <path
          className={`office-flow-data ambient data-whatsapp-server ${
            isWhatsAppFlowActive ? "active" : ""
          }`}
          d="M285 305 H570 V355 H755"
        />
  
        <path
          className={`office-flow-data ambient data-skill-agent ${
            hasVisibleActivity ? "active" : ""
          }`}
          d="M620 615 H740"
        />
  
        {/* Active source / system streams */}
        <path
          className={`office-flow-data data-manual-server ${
            isManualFlowActive ? "active" : ""
          }`}
          d="M285 530 H570 V390 H755"
        />
  
        <path
          className={`office-flow-data data-agent-server ${
            hasVisibleActivity ? "active" : ""
          }`}
          d="M940 585 H985 V445 H860"
        />
  
        <path
          className={`office-flow-data data-server-output ${
            hasLatestTask ? "active" : ""
          }`}
          d="M900 385 H1125 V505 H1260"
        />
  
        {/* Source anchors */}
        <circle
          className={`office-flow-node whatsapp-anchor ${
            isWhatsAppFlowActive ? "active" : ""
          }`}
          cx="285"
          cy="305"
          r="6"
        />
  
        <circle
          className={`office-flow-node manual-anchor ${
            isManualFlowActive ? "active" : ""
          }`}
          cx="285"
          cy="530"
          r="6"
        />
  
        {/* Server anchors */}
        <circle
          className={`office-flow-node server-anchor server-whatsapp-anchor ${
            isWhatsAppFlowActive || hasLatestTask ? "active" : ""
          }`}
          cx="755"
          cy="355"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-manual-anchor ${
            isManualFlowActive || hasLatestTask ? "active" : ""
          }`}
          cx="755"
          cy="390"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-agent-anchor ${
            hasVisibleActivity ? "active" : ""
          }`}
          cx="860"
          cy="445"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-output-anchor ${
            hasLatestTask ? "active" : ""
          }`}
          cx="900"
          cy="385"
          r="6"
        />
  
        {/* Agent anchors */}
        <circle
          className={`office-flow-node agent-server-anchor ${
            hasVisibleActivity ? "active" : ""
          }`}
          cx="940"
          cy="585"
          r="6"
        />
  
        <circle
          className={`office-flow-node agent-skill-anchor ${
            hasVisibleActivity ? "active" : ""
          }`}
          cx="740"
          cy="615"
          r="6"
        />
  
        {/* Skill Shelf anchor */}
        <circle
          className={`office-flow-node skill-anchor ${
            hasVisibleActivity ? "active" : ""
          }`}
          cx="620"
          cy="615"
          r="6"
        />
  
        {/* Output Board anchor */}
        <circle
          className={`office-flow-node output-anchor ${
            hasLatestTask ? "active" : ""
          }`}
          cx="1260"
          cy="505"
          r="6"
        />
      </svg>
    );
  }