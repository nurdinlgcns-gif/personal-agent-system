import express from "express";
import cors from "cors";
import { routeTask } from "./orchestrator";
import { startWhatsApp } from "./webhook/whatsapp";
import { env, validateEnv } from "./config/env";
import { logger } from "./utils/logger";

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
        error: "Message harus menyertakan mention agent, contoh: @design-agent halo",
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

app.listen(env.PORT, () => {
  logger.server(`Server jalan di port ${env.PORT}`);
});

startWhatsApp();