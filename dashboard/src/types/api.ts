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
  
export type ManualTaskResponse = {

    result: string;
  
  };

  export type SkillSnapshot = {
    id: string;
    name: string;
    description?: string | null;
    filePath?: string | null;
    agentName: string;
    createdAt: string;
    updatedAt: string;
  };
  
  export type SkillsResponse = {
    skills: SkillSnapshot[];
  };

  export type DashboardSummary = {
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    errorTasks: number;
    whatsappRequests: number;
    manualRequests: number;
  };
  
  export type DashboardSummaryResponse = {
    summary: DashboardSummary;
  };