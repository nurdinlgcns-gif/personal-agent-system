import { Router } from "express";
import {
  getDynamicAgentCapabilityContract,
  listDynamicAgentCapabilityContracts,
  updateDynamicAgentCapabilityContract,
} from "../services/agents/dynamicAgentCapabilityContractService";
import { checkAgentCapabilityDynamic } from "../services/agents/agentCapabilityGuard";
import { resolveRuntimeMemoriesForAgent } from "../services/memory/memoryRuntimeScopeResolver";

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

  const source =
    request.body?.source === "whatsapp" ||
    request.body?.source === "api" ||
    request.body?.source === "system"
      ? request.body.source
      : "manual";

  const maxMemoryResults =
    typeof request.body?.maxMemoryResults === "number" &&
    request.body.maxMemoryResults > 0
      ? Math.min(request.body.maxMemoryResults, 10)
      : 5;

  const capabilityResult = await checkAgentCapabilityDynamic({
    agentName,
    inputText,
  });

  const memoryContext = capabilityResult.allowed
    ? await resolveRuntimeMemoriesForAgent({
        agentName,
        inputText,
        source,
        matchedSkillNames: capabilityResult.matchedSkillNames,
        maxResults: maxMemoryResults,
      })
    : null;

  response.json({
    ...capabilityResult,
    memoryContext,
  });
});