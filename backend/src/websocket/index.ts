import { Server } from "socket.io";
import http from "http";
import { logger } from "../utils/logger";

let io: Server | null = null;

export function initWebSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    logger.server(`Dashboard connected: ${socket.id}`);

    socket.emit("connected", {
      message: "Connected to Personal Agent System WebSocket",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", () => {
      logger.server(`Dashboard disconnected: ${socket.id}`);
    });
  });
}

export function broadcastAgentStatus(agentName: string, status: string) {
  if (!io) {
    logger.server("WebSocket belum siap, event agent-status tidak dikirim");
    return;
  }

  io.emit("agent-status", {
    agentName,
    status,
    timestamp: new Date().toISOString(),
  });

  logger.server(`Broadcast agent-status: ${agentName} -> ${status}`);
}