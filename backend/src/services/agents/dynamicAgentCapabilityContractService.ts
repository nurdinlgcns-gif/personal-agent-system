import { prisma } from "../../db/prisma";
import {
  findAgentCapabilityContract,
  listAgentCapabilityContracts,
  type AgentCapabilityContract,
} from "./agentCapabilityContracts";

type AgentCapabilityContractRecord = {
  id: string;
  agentName: string;
  displayName: string;
  role: string;
  description: string;
  strictBoundary: boolean;
  unknownIntentPolicy: string;
  allowedDomainsJson: string;
  deniedDomainsJson: string;
  allowedKeywordsJson: string;
  deniedKeywordsJson: string;
  softAllowedKeywordsJson: string;
  safeSmallTalkKeywordsJson: string;
  primarySkillsJson: string;
  fallbackAgentsJson: string;
  refusalStyle: string;
  refusalMessage: string;
  unknownIntentMessage: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateAgentCapabilityContractPayload = Partial<{
  displayName: string;
  role: string;
  description: string;
  strictBoundary: boolean;
  unknownIntentPolicy: "allow" | "clarify_or_refuse";
  allowedDomains: string[];
  deniedDomains: string[];
  allowedKeywords: string[];
  deniedKeywords: string[];
  softAllowedKeywords: string[];
  safeSmallTalkKeywords: string[];
  primarySkills: string[];
  fallbackAgents: string[];
  refusalStyle: "polite_redirect" | "polite_decline";
  refusalMessage: string;
  unknownIntentMessage: string;
  enabled: boolean;
}>;

function safeJsonParse<TValue>(value: string | null | undefined, fallback: TValue) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? []);
}

function recordToContract(
  record: AgentCapabilityContractRecord
): AgentCapabilityContract {
  return {
    agentName: record.agentName,
    displayName: record.displayName,
    role: record.role,
    description: record.description,
    strictBoundary: record.strictBoundary,
    unknownIntentPolicy:
      record.unknownIntentPolicy === "allow" ? "allow" : "clarify_or_refuse",
    allowedDomains: safeJsonParse<string[]>(record.allowedDomainsJson, []),
    deniedDomains: safeJsonParse<string[]>(record.deniedDomainsJson, []),
    allowedKeywords: safeJsonParse<string[]>(record.allowedKeywordsJson, []),
    deniedKeywords: safeJsonParse<string[]>(record.deniedKeywordsJson, []),
    softAllowedKeywords: safeJsonParse<string[]>(
      record.softAllowedKeywordsJson,
      []
    ),
    safeSmallTalkKeywords: safeJsonParse<string[]>(
      record.safeSmallTalkKeywordsJson,
      []
    ),
    primarySkills: safeJsonParse<string[]>(record.primarySkillsJson, []),
    fallbackAgents: safeJsonParse<string[]>(record.fallbackAgentsJson, []),
    refusalStyle:
      record.refusalStyle === "polite_decline"
        ? "polite_decline"
        : "polite_redirect",
    refusalMessage: record.refusalMessage,
    unknownIntentMessage: record.unknownIntentMessage,
  };
}

function contractToCreateData(contract: AgentCapabilityContract) {
  return {
    agentName: contract.agentName,
    displayName: contract.displayName,
    role: contract.role,
    description: contract.description,
    strictBoundary: contract.strictBoundary,
    unknownIntentPolicy: contract.unknownIntentPolicy,
    allowedDomainsJson: stringifyJson(contract.allowedDomains),
    deniedDomainsJson: stringifyJson(contract.deniedDomains),
    allowedKeywordsJson: stringifyJson(contract.allowedKeywords),
    deniedKeywordsJson: stringifyJson(contract.deniedKeywords),
    softAllowedKeywordsJson: stringifyJson(contract.softAllowedKeywords),
    safeSmallTalkKeywordsJson: stringifyJson(contract.safeSmallTalkKeywords),
    primarySkillsJson: stringifyJson(contract.primarySkills),
    fallbackAgentsJson: stringifyJson(contract.fallbackAgents),
    refusalStyle: contract.refusalStyle,
    refusalMessage: contract.refusalMessage,
    unknownIntentMessage: contract.unknownIntentMessage,
    enabled: true,
  };
}

function buildUpdateData(payload: UpdateAgentCapabilityContractPayload) {
  const data: Record<string, unknown> = {};

  if (typeof payload.displayName === "string") {
    data.displayName = payload.displayName;
  }

  if (typeof payload.role === "string") {
    data.role = payload.role;
  }

  if (typeof payload.description === "string") {
    data.description = payload.description;
  }

  if (typeof payload.strictBoundary === "boolean") {
    data.strictBoundary = payload.strictBoundary;
  }

  if (
    payload.unknownIntentPolicy === "allow" ||
    payload.unknownIntentPolicy === "clarify_or_refuse"
  ) {
    data.unknownIntentPolicy = payload.unknownIntentPolicy;
  }

  if (Array.isArray(payload.allowedDomains)) {
    data.allowedDomainsJson = stringifyJson(payload.allowedDomains);
  }

  if (Array.isArray(payload.deniedDomains)) {
    data.deniedDomainsJson = stringifyJson(payload.deniedDomains);
  }

  if (Array.isArray(payload.allowedKeywords)) {
    data.allowedKeywordsJson = stringifyJson(payload.allowedKeywords);
  }

  if (Array.isArray(payload.deniedKeywords)) {
    data.deniedKeywordsJson = stringifyJson(payload.deniedKeywords);
  }

  if (Array.isArray(payload.softAllowedKeywords)) {
    data.softAllowedKeywordsJson = stringifyJson(payload.softAllowedKeywords);
  }

  if (Array.isArray(payload.safeSmallTalkKeywords)) {
    data.safeSmallTalkKeywordsJson = stringifyJson(payload.safeSmallTalkKeywords);
  }

  if (Array.isArray(payload.primarySkills)) {
    data.primarySkillsJson = stringifyJson(payload.primarySkills);
  }

  if (Array.isArray(payload.fallbackAgents)) {
    data.fallbackAgentsJson = stringifyJson(payload.fallbackAgents);
  }

  if (
    payload.refusalStyle === "polite_redirect" ||
    payload.refusalStyle === "polite_decline"
  ) {
    data.refusalStyle = payload.refusalStyle;
  }

  if (typeof payload.refusalMessage === "string") {
    data.refusalMessage = payload.refusalMessage;
  }

  if (typeof payload.unknownIntentMessage === "string") {
    data.unknownIntentMessage = payload.unknownIntentMessage;
  }

  if (typeof payload.enabled === "boolean") {
    data.enabled = payload.enabled;
  }

  return data;
}

export async function listDynamicAgentCapabilityContracts() {
  const records = await prisma.agentCapabilityContract.findMany({
    where: {
      enabled: true,
    },
    orderBy: {
      agentName: "asc",
    },
  });

  if (records.length === 0) {
    return listAgentCapabilityContracts();
  }

  return records.map((record) =>
    recordToContract(record as AgentCapabilityContractRecord)
  );
}

export async function getDynamicAgentCapabilityContract(agentName: string) {
  const record = await prisma.agentCapabilityContract.findUnique({
    where: {
      agentName,
    },
  });

  if (record && record.enabled) {
    return recordToContract(record as AgentCapabilityContractRecord);
  }

  return findAgentCapabilityContract(agentName);
}

export async function upsertDynamicAgentCapabilityContract(
  contract: AgentCapabilityContract
) {
  const data = contractToCreateData(contract);

  const record = await prisma.agentCapabilityContract.upsert({
    where: {
      agentName: contract.agentName,
    },
    create: data,
    update: {
      ...data,
      agentName: undefined,
    },
  });

  return recordToContract(record as AgentCapabilityContractRecord);
}

export async function updateDynamicAgentCapabilityContract(
  agentName: string,
  payload: UpdateAgentCapabilityContractPayload
) {
  const existingRecord = await prisma.agentCapabilityContract.findUnique({
    where: {
      agentName,
    },
  });

  if (!existingRecord) {
    const staticContract = findAgentCapabilityContract(agentName);

    if (!staticContract) {
      throw new Error(`Agent capability contract "${agentName}" not found.`);
    }

    await upsertDynamicAgentCapabilityContract(staticContract);
  }

  const updatedRecord = await prisma.agentCapabilityContract.update({
    where: {
      agentName,
    },
    data: buildUpdateData(payload),
  });

  return recordToContract(updatedRecord as AgentCapabilityContractRecord);
}