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

  runtimeProviderId?: string | null;
  runtimeProviderName?: string | null;
  runtimeProviderType?: string | null;
  runtimeModel?: string | null;
  runtimeMode?: string | null;
  runtimeResolvedFrom?: string | null;

  governanceAllowed?: boolean | null;
  governanceReason?: string | null;
  governanceConfidence?: string | null;
  governanceMatchedAllowedJson?: string | null;
  governanceMatchedDeniedJson?: string | null;
  governanceMatchedSoftJson?: string | null;
  governanceMatchedSmallTalkJson?: string | null;
  governanceSuggestedAgentsJson?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type AgentsStatusResponse = {
  agents: AgentSnapshot[];
};

export type RecentTasksResponse = {
  tasks: TaskSnapshot[];
};

export type ManualTaskRuntimeProvider = {
  providerId?: string | null;
  providerName?: string;
  providerType?: string;
  model?: string;
  mode?: string;
  resolvedFrom?: string;
  isMock?: boolean;
};

export type ManualTaskCapabilityBoundary = {
  allowed: boolean;
  agentName: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  matchedAllowedKeywords: string[];
  matchedDeniedKeywords: string[];
  matchedSoftAllowedKeywords?: string[];
  matchedSmallTalkKeywords?: string[];
  suggestedAgents: string[];
};

export type ManualTaskResponse = {
  result: string;
  task?: TaskSnapshot | null;
  runtimeProvider?: ManualTaskRuntimeProvider | null;
  capabilityBoundary?: ManualTaskCapabilityBoundary;
  runtimeMemoryContext?: ManualTaskRuntimeMemoryContext | null;
};

export type SkillSnapshot = {
  id: string;
  name: string;
  description?: string | null;
  filePath?: string | null;
  content?: string | null;
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

export type ManualTaskRuntimeMemoryContext = {
  injected: boolean;
  itemCount: number;
  totalChars: number;
  usedMemoryIds: string[];
  usedMemoryTypes: string[];
  usedMemoryScopes: string[];
  usedMemorySources: string[];
};