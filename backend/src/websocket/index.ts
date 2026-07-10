import { Server } from "socket.io";
import http from "http";
import { logger } from "../utils/logger";
import {
  WS_EVENTS,
  AgentStatusPayload,
  ConnectedPayload,
  TaskEventPayload,
} from "../types/websocketEvents";

let io: Server | null = null;

function getTimestamp(): string {
  return new Date().toISOString();
}

export function initWebSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    logger.server(`Dashboard connected: ${socket.id}`);

    const payload: ConnectedPayload = {
      message: "Connected to Personal Agent System WebSocket",
      socketId: socket.id,
      timestamp: getTimestamp(),
    };

    socket.emit(WS_EVENTS.CONNECTED, payload);

    socket.on("disconnect", () => {
      logger.server(`Dashboard disconnected: ${socket.id}`);
    });
  });
}

export function broadcastAgentStatus(
  agentName: string,
  status: string
) {
  if (!io) {
    logger.server("WebSocket belum siap, event agent-status tidak dikirim");
    return;
  }

  const payload: AgentStatusPayload = {
    agentName,
    status,
    timestamp: getTimestamp(),
  };

  io.emit(WS_EVENTS.AGENT_STATUS, payload);

  logger.server(`Broadcast agent-status: ${agentName} -> ${status}`);
}

export function broadcastTaskEvent(payload: Omit<TaskEventPayload, "timestamp">) {
  if (!io) {
    logger.server("WebSocket belum siap, event task-event tidak dikirim");
    return;
  }

  const eventPayload: TaskEventPayload = {
    ...payload,
    timestamp: getTimestamp(),
  };

  io.emit(WS_EVENTS.TASK_EVENT, eventPayload);

  logger.server(
    `Broadcast task-event: ${payload.agentName} -> ${payload.status}`
  );
}