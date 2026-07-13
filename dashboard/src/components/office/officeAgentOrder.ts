import type { AgentSnapshot } from "../../types/api";

const preferredOfficeAgentOrder = [
  "design-agent",
  "writer-agent",
  "image-agent",
  "code-agent",
  "research-agent",
  "qa-agent",
];

function getOfficeAgentOrderIndex(agentName: string) {
  const index = preferredOfficeAgentOrder.indexOf(agentName);

  if (index === -1) {
    return preferredOfficeAgentOrder.length + 1;
  }

  return index;
}

export function sortOfficeAgents(agents: AgentSnapshot[]) {
  return [...agents].sort((firstAgent, secondAgent) => {
    const firstIndex = getOfficeAgentOrderIndex(firstAgent.name);
    const secondIndex = getOfficeAgentOrderIndex(secondAgent.name);

    if (firstIndex !== secondIndex) {
      return firstIndex - secondIndex;
    }

    return firstAgent.name.localeCompare(secondAgent.name);
  });
}