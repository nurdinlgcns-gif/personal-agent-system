export type AgentStatusPayload = {
    agentName: string;
    status: string;
    timestamp: string;
  };
  
  export type TaskEventPayload = {
    taskId?: string;
    agentName: string;
    status: string;
    source?: string;
    timestamp: string;
  };
  