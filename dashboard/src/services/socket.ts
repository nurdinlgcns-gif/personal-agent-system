import { io } from "socket.io-client";
import { useAgentStore } from "../store/agentStore";
import type { AgentStatusPayload, TaskEventPayload } from "../types/websocket";

const BACKEND_URL = "http://localhost:3000";

export const socket = io(BACKEND_URL, {
  autoConnect: true,
});

socket.on("connect", () => {
  console.log("[SOCKET] Connected:", socket.id);

  useAgentStore.getState().setConnected(socket.id || "unknown");
});

socket.on("disconnect", () => {
  console.log("[SOCKET] Disconnected");

  useAgentStore.getState().setDisconnected();
});

socket.on("connected", (data) => {
  console.log("[SOCKET] Server welcome:", data);
});

socket.on("agent-status", (data: AgentStatusPayload) => {
  console.log("[SOCKET] Agent status:", data);

  useAgentStore.getState().updateAgentStatus(data);
});

socket.on("task-event", (data: TaskEventPayload) => {
  console.log("[SOCKET] Task event:", data);

  useAgentStore.getState().addTaskEvent(data);
});