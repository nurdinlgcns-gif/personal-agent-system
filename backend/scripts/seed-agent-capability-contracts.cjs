process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    ignoreDeprecations: "6.0",
    module: "commonjs",
    moduleResolution: "node",
  });
  
  require("ts-node/register/transpile-only");
  
  const { PrismaClient } = require("@prisma/client");
  const {
    agentCapabilityContracts,
  } = require("../src/services/agents/agentCapabilityContracts");
  
  const prisma = new PrismaClient();
  
  function stringifyJson(value) {
    return JSON.stringify(value || []);
  }
  
  function contractToData(contract) {
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
  
  async function main() {
    console.log("");
    console.log("===============================================");
    console.log(" SEED AGENT CAPABILITY CONTRACTS");
    console.log("===============================================");
    console.log("");
  
    for (const contract of agentCapabilityContracts) {
      const data = contractToData(contract);
  
      const result = await prisma.agentCapabilityContract.upsert({
        where: {
          agentName: contract.agentName,
        },
        create: data,
        update: {
          displayName: data.displayName,
          role: data.role,
          description: data.description,
          strictBoundary: data.strictBoundary,
          unknownIntentPolicy: data.unknownIntentPolicy,
          allowedDomainsJson: data.allowedDomainsJson,
          deniedDomainsJson: data.deniedDomainsJson,
          allowedKeywordsJson: data.allowedKeywordsJson,
          deniedKeywordsJson: data.deniedKeywordsJson,
          softAllowedKeywordsJson: data.softAllowedKeywordsJson,
          safeSmallTalkKeywordsJson: data.safeSmallTalkKeywordsJson,
          primarySkillsJson: data.primarySkillsJson,
          fallbackAgentsJson: data.fallbackAgentsJson,
          refusalStyle: data.refusalStyle,
          refusalMessage: data.refusalMessage,
          unknownIntentMessage: data.unknownIntentMessage,
          enabled: data.enabled,
        },
      });
  
      console.log(`[UPSERTED] ${result.agentName} -> ${result.role}`);
    }
  
    console.log("");
    console.log("[OK] Agent capability contracts seeded.");
    console.log("");
  }
  
  main()
    .catch((error) => {
      console.error("[ERROR] Failed to seed agent capability contracts:");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });