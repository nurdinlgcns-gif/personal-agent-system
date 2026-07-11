import { create } from "zustand";
import type { AgentStatusPayload, TaskEventPayload } from "../types/websocket";
import type {
  AgentSnapshot,
  TaskSnapshot,
  SkillSnapshot,
  DashboardSummary,
} from "../types/api";

type AgentState = {
  connectionStatus: "connected" | "disconnected" | "connecting";
  socketId: string | null;

  agentStatuses: Record<string, string>;
  agents: AgentSnapshot[];
  recentTasks: TaskSnapshot[];
  skills: SkillSnapshot[];
  dashboardSummary: DashboardSummary | null;

  agentEvents: AgentStatusPayload[];
  taskEvents: TaskEventPayload[];

  isInitialLoading: boolean;
  isSilentRefreshing: boolean;
  snapshotError: string | null;

  setConnected: (socketId: string) => void;
  setDisconnected: () => void;

  setAgentsSnapshot: (agents: AgentSnapshot[]) => void;
  setRecentTasksSnapshot: (tasks: TaskSnapshot[]) => void;
  setSkillsSnapshot: (skills: SkillSnapshot[]) => void;
  setDashboardSummary: (summary: DashboardSummary) => void;

  setInitialLoading: (loading: boolean) => void;
  setSilentRefreshing: (refreshing: boolean) => void;
  setSnapshotError: (error: string | null) => void;

  updateAgentStatus: (payload: AgentStatusPayload) => void;
  addTaskEvent: (payload: TaskEventPayload) => void;

  clearEvents: () => void;
};

export const useAgentStore = create<AgentState>((set) => ({
  connectionStatus: "connecting",
  socketId: null,

  agentStatuses: {},
  agents: [],
  recentTasks: [],
  skills: [],
  dashboardSummary: null,

  agentEvents: [],
  taskEvents: [],

  isInitialLoading: false,
  isSilentRefreshing: false,
  snapshotError: null,

  setConnected: (socketId) =>
    set({
      connectionStatus: "connected",
      socketId,
    }),

  setDisconnected: () =>
    set({
      connectionStatus: "disconnected",
      socketId: null,
    }),

  setAgentsSnapshot: (agents) =>
    set((state) => {
      const mappedStatuses = agents.reduce<Record<string, string>>(
        (accumulator, agent) => {
          accumulator[agent.name] =
            state.agentStatuses[agent.name] || agent.status;

          return accumulator;
        },
        {}
      );

      return {
        agents,
        agentStatuses: {
          ...mappedStatuses,
          ...state.agentStatuses,
        },
      };
    }),

  setRecentTasksSnapshot: (tasks) =>
    set({
      recentTasks: tasks,
    }),

  setSkillsSnapshot: (skills) =>
    set({
      skills,
    }),

  setDashboardSummary: (summary) =>
    set({
      dashboardSummary: summary,
    }),

  setInitialLoading: (loading) =>
    set({
      isInitialLoading: loading,
    }),

  setSilentRefreshing: (refreshing) =>
    set({
      isSilentRefreshing: refreshing,
    }),

  setSnapshotError: (error) =>
    set({
      snapshotError: error,
    }),

  updateAgentStatus: (payload) =>
    set((state) => {
      const updatedAgents = state.agents.map((agent) =>
        agent.name === payload.agentName
          ? {
              ...agent,
              status: payload.status,
              updatedAt: payload.timestamp,
            }
          : agent
      );

      return {
        agentStatuses: {
          ...state.agentStatuses,
          [payload.agentName]: payload.status,
        },
        agents: updatedAgents,
        agentEvents: [payload, ...state.agentEvents].slice(0, 40),
      };
    }),

  addTaskEvent: (payload) =>
    set((state) => ({
      taskEvents: [payload, ...state.taskEvents].slice(0, 40),
    })),

  clearEvents: () =>
    set({
      agentEvents: [],
      taskEvents: [],
    }),
}));