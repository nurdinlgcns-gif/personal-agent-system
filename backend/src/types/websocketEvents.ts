export const WS_EVENTS = {
    CONNECTED: "connected",
    AGENT_STATUS: "agent-status",
    TASK_EVENT: "task-event",
  } as const;
  
  export type WebSocketEventName =
    (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
  
  export type AgentStatusPayload = {
    agentName: string;
    status: string;
    timestamp: string;
  };
  
  export type ConnectedPayload = {
    message: string;
    socketId: string;
    timestamp: string;
  };
  
  export type TaskEventPayload = {
    taskId?: string;
    agentName: string;
    status: string;
    source?: string;
    timestamp: string;
  };