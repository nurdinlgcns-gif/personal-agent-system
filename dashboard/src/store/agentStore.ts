import { create } from "zustand";
import type { AgentStatusPayload, TaskEventPayload } from "../types/websocket";

type AgentState = {
  connectionStatus: "connected" | "disconnected" | "connecting";
  socketId: string | null;

  agentStatuses: Record<string, string>;
  agentEvents: AgentStatusPayload[];
  taskEvents: TaskEventPayload[];

  setConnected: (socketId: string) => void;
  setDisconnected: () => void;

  updateAgentStatus: (payload: AgentStatusPayload) => void;
  addTaskEvent: (payload: TaskEventPayload) => void;

  clearEvents: () => void;
};

export const useAgentStore = create<AgentState>((set) => ({
  connectionStatus: "connecting",
  socketId: null,

  agentStatuses: {},
  agentEvents: [],
  taskEvents: [],

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

  updateAgentStatus: (payload) =>
    set((state) => ({
      agentStatuses: {
        ...state.agentStatuses,
        [payload.agentName]: payload.status,
      },
      agentEvents: [payload, ...state.agentEvents].slice(0, 20),
    })),

  addTaskEvent: (payload) =>
    set((state) => ({
      taskEvents: [payload, ...state.taskEvents].slice(0, 20),
    })),

  clearEvents: () =>
    set({
      agentEvents: [],
      taskEvents: [],
    }),
}));