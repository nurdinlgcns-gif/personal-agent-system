import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { routeTask } from "./orchestrator";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});

app.post("/tasks", async (req, res) => {
    const { message } = req.body;
    const result = await routeTask(message);
    res.json({ result });
  });