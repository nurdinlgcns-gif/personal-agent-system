-- CreateTable
CREATE TABLE "MemoryChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "tokenEstimate" INTEGER NOT NULL,
    "memoryType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "ownerAgentName" TEXT,
    "allowedAgentsJson" TEXT NOT NULL DEFAULT '[]',
    "linkedSkillNamesJson" TEXT NOT NULL DEFAULT '[]',
    "sensitivityLevel" TEXT NOT NULL DEFAULT 'normal',
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "embeddingStatus" TEXT NOT NULL DEFAULT 'pending',
    "embeddingModel" TEXT,
    "embeddingVectorJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoryChunk_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MemoryChunk_memoryId_idx" ON "MemoryChunk"("memoryId");

-- CreateIndex
CREATE INDEX "MemoryChunk_agentName_idx" ON "MemoryChunk"("agentName");

-- CreateIndex
CREATE INDEX "MemoryChunk_scope_idx" ON "MemoryChunk"("scope");

-- CreateIndex
CREATE INDEX "MemoryChunk_embeddingStatus_idx" ON "MemoryChunk"("embeddingStatus");
