import { Router } from "express";
import {
  getDynamicAgentCapabilityContract,
  listDynamicAgentCapabilityContracts,
  updateDynamicAgentCapabilityContract,
} from "../services/agents/dynamicAgentCapabilityContractService";
import { checkAgentCapabilityDynamic } from "../services/agents/agentCapabilityGuard";

export const agentGovernanceRoutes = Router();

agentGovernanceRoutes.get("/contracts", async (_request, response) => {
  const contracts = await listDynamicAgentCapabilityContracts();

  response.json({
    contracts,
  });
});

agentGovernanceRoutes.get("/contracts/:agentName", async (request, response) => {
  const contract = await getDynamicAgentCapabilityContract(
    request.params.agentName
  );

  if (!contract) {
    response.status(404).json({
      message: "Agent capability contract not found.",
    });
    return;
  }

  response.json(contract);
});

agentGovernanceRoutes.patch(
  "/contracts/:agentName",
  async (request, response) => {
    try {
      const contract = await updateDynamicAgentCapabilityContract(
        request.params.agentName,
        request.body
      );

      response.json(contract);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to update agent capability contract.",
      });
    }
  }
);

agentGovernanceRoutes.post("/check", async (request, response) => {
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

  const result = await checkAgentCapabilityDynamic({
    agentName,
    inputText,
  });

  response.json(result);
});