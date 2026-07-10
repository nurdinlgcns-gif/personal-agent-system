export type AgentSnapshot = {
    id: string;
    name: string;
    status: string;
    color?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  
  export type TaskSnapshot = {
    id: string;
    agentName: string;
    inputText: string;
    outputText?: string | null;
    status: string;
    source: string;
    createdAt: string;
    updatedAt: string;
  };
  
  export type AgentsStatusResponse = {
    agents: AgentSnapshot[];
  };
  
  export type RecentTasksResponse = {
    tasks: TaskSnapshot[];
  };