import { Router } from "express";
import { listAgentCapabilityContracts } from "../services/agents/agentCapabilityContracts";
import { checkAgentCapability } from "../services/agents/agentCapabilityGuard";

export const agentGovernanceRoutes = Router();

agentGovernanceRoutes.get("/contracts", (_request, response) => {
  response.json({
    contracts: listAgentCapabilityContracts(),
  });
});

agentGovernanceRoutes.post("/check", (request, response) => {
  const agentName =
    typeof request.body?.agentName === "string"
      ? request.body.agentName
      : "design-agent";

  const inputText =
    typeof request.body?.inputText === "string" ? request.body.inputText : "";

  if (!inputText.trim()) {
    response.status(400).json({
      message: "inputText is required.",
    });
    return;
  }

  const result = checkAgentCapability({
    agentName,
    inputText,
  });

  response.json(result);
});