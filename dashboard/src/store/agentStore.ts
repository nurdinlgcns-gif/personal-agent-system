import { create } from "zustand";
import type { AgentStatusPayload, TaskEventPayload } from "../types/websocket";
import type { AgentSnapshot, TaskSnapshot, SkillSnapshot,DashboardSummary, } from "../types/api";

type AgentState = {
  connectionStatus: "connected" | "disconnected" | "connecting";
  socketId: string | null;

  agentStatuses: Record<string, string>;
  agents: AgentSnapshot[];
  recentTasks: TaskSnapshot[];

  agentEvents: AgentStatusPayload[];
  taskEvents: TaskEventPayload[];
  
  skills: SkillSnapshot[];
  dashboardSummary: DashboardSummary | null;

  isSnapshotLoading: boolean;
  snapshotError: string | null;

  setConnected: (socketId: string) => void;
  setDisconnected: () => void;

  setAgentsSnapshot: (agents: AgentSnapshot[]) => void;
  setSkillsSnapshot: (skills: SkillSnapshot[]) => void;
  setRecentTasksSnapshot: (tasks: TaskSnapshot[]) => void;
  setDashboardSummary: (summary: DashboardSummary) => void;
  setSnapshotLoading: (loading: boolean) => void;
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
  agentEvents: [],
  taskEvents: [],

  isSnapshotLoading: false,
  dashboardSummary: null,
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
    set(() => {
      const mappedStatuses = agents.reduce<Record<string, string>>(
        (accumulator, agent) => {
          accumulator[agent.name] = agent.status;
          return accumulator;
        },
        {}
      );

      return {
        agents,
        agentStatuses: mappedStatuses,
      };
    }),

  setRecentTasksSnapshot: (tasks) =>
    set({
      recentTasks: tasks,
    }),

  setSnapshotLoading: (loading) =>
    set({
      isSnapshotLoading: loading,
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
        agentEvents: [payload, ...state.agentEvents].slice(0, 20),
      };
    }),

  addTaskEvent: (payload) =>
    set((state) => ({
      taskEvents: [payload, ...state.taskEvents].slice(0, 20),
    })),

  clearEvents: () =>
    set({
      agentEvents: [],
      taskEvents: [],
    }),
  
    setSkillsSnapshot: (skills) =>
    set({
      skills,
    }),

  setDashboardSummary: (summary) =>
    set({
      dashboardSummary: summary,
    }),
}));