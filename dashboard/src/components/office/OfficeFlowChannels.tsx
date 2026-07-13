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
    const isManualFlowActive = isProcessing && latestSource === "manual";
    const isWhatsAppFlowActive = isProcessing && latestSource === "whatsapp";
    const isWorkflowActive = isProcessing;
  
    return (
      <svg
        className={`office-flow-channel-layer ${
          isProcessing ? "flow-active" : "flow-idle"
        } flow-status-${latestTaskStatus} flow-source-${latestSource} ${
          hasLatestTask ? "has-latest-task" : "no-latest-task"
        }`}
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
            <feGaussianBlur stdDeviation="3.4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
  
        {/* Static connector ducts */}
        <path
          className="office-flow-duct duct-whatsapp-server"
          d="M285 305 H570 V355 H755"
        />
  
        <path
          className="office-flow-duct duct-manual-server"
          d="M285 530 H570 V390 H755"
        />
  
        <path
          className="office-flow-duct duct-agent-server"
          d="M940 585 H985 V445 H860"
        />
  
        <path
          className="office-flow-duct duct-skill-agent"
          d="M620 615 H740"
        />
  
        <path
          className="office-flow-duct duct-server-output"
          d="M900 385 H1125 V505 H1260"
        />
  
        {/* Step 1: Source -> Server */}
        <path
          className={`office-flow-data data-whatsapp-server ${
            isWhatsAppFlowActive ? "active step-1" : ""
          }`}
          d="M285 305 H570 V355 H755"
        />
  
        <path
          className={`office-flow-data data-manual-server ${
            isManualFlowActive ? "active step-1" : ""
          }`}
          d="M285 530 H570 V390 H755"
        />
  
        {/* Step 2: Skill -> Agent + Agent -> Server */}
        <path
          className={`office-flow-data data-skill-agent ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          d="M620 615 H740"
        />
  
        <path
          className={`office-flow-data data-agent-server ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          d="M940 585 H985 V445 H860"
        />
  
        {/* Step 3: Server -> Output */}
        <path
          className={`office-flow-data data-server-output ${
            isWorkflowActive ? "active step-3" : ""
          }`}
          d="M900 385 H1125 V505 H1260"
        />
  
        {/* Source anchors */}
        <circle
          className={`office-flow-node whatsapp-anchor ${
            isWhatsAppFlowActive ? "active step-1" : ""
          }`}
          cx="285"
          cy="305"
          r="6"
        />
  
        <circle
          className={`office-flow-node manual-anchor ${
            isManualFlowActive ? "active step-1" : ""
          }`}
          cx="285"
          cy="530"
          r="6"
        />
  
        {/* Server anchors */}
        <circle
          className={`office-flow-node server-anchor server-whatsapp-anchor ${
            isWhatsAppFlowActive ? "active step-1" : ""
          }`}
          cx="755"
          cy="355"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-manual-anchor ${
            isManualFlowActive ? "active step-1" : ""
          }`}
          cx="755"
          cy="390"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-agent-anchor ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          cx="860"
          cy="445"
          r="6"
        />
  
        <circle
          className={`office-flow-node server-anchor server-output-anchor ${
            isWorkflowActive ? "active step-3" : ""
          }`}
          cx="900"
          cy="385"
          r="6"
        />
  
        {/* Agent anchors */}
        <circle
          className={`office-flow-node agent-server-anchor ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          cx="940"
          cy="585"
          r="6"
        />
  
        <circle
          className={`office-flow-node agent-skill-anchor ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          cx="740"
          cy="615"
          r="6"
        />
  
        {/* Skill Shelf anchor */}
        <circle
          className={`office-flow-node skill-anchor ${
            isWorkflowActive ? "active step-2" : ""
          }`}
          cx="620"
          cy="615"
          r="6"
        />
  
        {/* Output Board anchor */}
        <circle
          className={`office-flow-node output-anchor ${
            isWorkflowActive ? "active step-3" : ""
          }`}
          cx="1260"
          cy="505"
          r="6"
        />
      </svg>
    );
  }