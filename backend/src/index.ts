import express from "express";
import cors from "cors";
import http from "http";

import { routeTask } from "./orchestrator";
import { startWhatsApp } from "./webhook/whatsapp";
import { env, validateEnv } from "./config/env";
import { logger } from "./utils/logger";
import { initWebSocket } from "./websocket";
import { findAllAgents } from "./repositories/agentRepository";
import { findRecentTasks } from "./repositories/taskRepository";

validateEnv();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    app: "personal-agent-system",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/tasks", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Field 'message' wajib diisi dan harus berupa string.",
      });
    }

    if (!message.includes("@")) {
      return res.status(400).json({
        error:
          "Message harus menyertakan mention agent, contoh: @design-agent halo",
      });
    }

    const result = await routeTask(message, {
      source: "manual",
    });

    return res.json({
      result,
    });
  } catch (error) {
    logger.error("Failed to process manual task request", error);

    return res.status(500).json({
      error: "Terjadi error saat memproses task.",
    });
  }
});

app.get("/agents/status", async (req, res) => {
    try {
      const agents = await findAllAgents();
  
      return res.json({
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          color: agent.color,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        })),
      });
    } catch (error) {
      logger.error("Failed to fetch agent status", error);
  
      return res.status(500).json({
        error: "Terjadi error saat mengambil status agent.",
      });
    }
  });
  
  app.get("/tasks/recent", async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit || 10);
      const limit = Number.isNaN(rawLimit) ? 10 : rawLimit;
  
      const tasks = await findRecentTasks(limit);
  
      return res.json({
        tasks: tasks.map((task) => ({
          id: task.id,
          agentName: task.agent.name,
          inputText: task.inputText,
          outputText: task.outputText,
          status: task.status,
          source: task.source,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })),
      });
    } catch (error) {
      logger.error("Failed to fetch recent tasks", error);
  
      return res.status(500).json({
        error: "Terjadi error saat mengambil recent tasks.",
      });
    }
  });
  
const server = http.createServer(app);

initWebSocket(server);

server.listen(env.PORT, () => {
  logger.server(`Server jalan di port ${env.PORT}`);
});

startWhatsApp();