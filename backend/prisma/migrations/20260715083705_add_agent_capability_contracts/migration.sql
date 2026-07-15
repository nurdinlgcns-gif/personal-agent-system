-- CreateTable
CREATE TABLE "AgentCapabilityContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "strictBoundary" BOOLEAN NOT NULL DEFAULT true,
    "unknownIntentPolicy" TEXT NOT NULL DEFAULT 'clarify_or_refuse',
    "allowedDomainsJson" TEXT NOT NULL DEFAULT '[]',
    "deniedDomainsJson" TEXT NOT NULL DEFAULT '[]',
    "allowedKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "deniedKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "softAllowedKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "safeSmallTalkKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "primarySkillsJson" TEXT NOT NULL DEFAULT '[]',
    "fallbackAgentsJson" TEXT NOT NULL DEFAULT '[]',
    "refusalStyle" TEXT NOT NULL DEFAULT 'polite_redirect',
    "refusalMessage" TEXT NOT NULL,
    "unknownIntentMessage" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentCapabilityContract_agentName_key" ON "AgentCapabilityContract"("agentName");
