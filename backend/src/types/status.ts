export const AGENT_STATUS = {
    IDLE: "idle",
    WORKING: "working",
    ERROR: "error",
  } as const;
  
  export const TASK_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    DONE: "done",
    ERROR: "error",
  } as const;
  
  export type AgentStatus =
    (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];
  
  export type TaskStatus =
    (typeof TASK_STATUS)[keyof typeof TASK_STATUS];