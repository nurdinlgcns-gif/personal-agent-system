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
  res.json({ status: "ok" });
});

app.post("/tasks", async (req, res) => {
  const { message } = req.body;

  const result = await routeTask(message);

  res.json({ result });
});

app.listen(env.PORT, () => {
  logger.server(`Server jalan di port ${env.PORT}`);
});

startWhatsApp();