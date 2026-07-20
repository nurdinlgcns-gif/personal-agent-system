-- CreateTable
CREATE TABLE "KnowledgeSourceImportHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT,
    "title" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousContent" TEXT,
    "nextContent" TEXT NOT NULL,
    "previousContentHash" TEXT,
    "nextContentHash" TEXT NOT NULL,
    "previousContentChars" INTEGER NOT NULL DEFAULT 0,
    "nextContentChars" INTEGER NOT NULL DEFAULT 0,
    "allowedAgentsJson" TEXT NOT NULL DEFAULT '[]',
    "linkedSkillNamesJson" TEXT NOT NULL DEFAULT '[]',
    "sensitivityLevel" TEXT NOT NULL DEFAULT 'normal',
    "sourceMode" TEXT NOT NULL DEFAULT 'manual',
    "fileRelativePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "KnowledgeSourceImportHistory_memoryId_idx" ON "KnowledgeSourceImportHistory"("memoryId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceImportHistory_sourceRef_idx" ON "KnowledgeSourceImportHistory"("sourceRef");

-- CreateIndex
CREATE INDEX "KnowledgeSourceImportHistory_agentName_idx" ON "KnowledgeSourceImportHistory"("agentName");

-- CreateIndex
CREATE INDEX "KnowledgeSourceImportHistory_action_idx" ON "KnowledgeSourceImportHistory"("action");

-- CreateIndex
CREATE INDEX "KnowledgeSourceImportHistory_createdAt_idx" ON "KnowledgeSourceImportHistory"("createdAt");
