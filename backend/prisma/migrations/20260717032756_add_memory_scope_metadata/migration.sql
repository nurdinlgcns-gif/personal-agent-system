-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "scope" TEXT NOT NULL DEFAULT 'agent',
    "ownerAgentName" TEXT,
    "allowedAgentsJson" TEXT NOT NULL DEFAULT '[]',
    "linkedSkillNamesJson" TEXT NOT NULL DEFAULT '[]',
    "runtimeInjectable" BOOLEAN NOT NULL DEFAULT false,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sensitivityLevel" TEXT NOT NULL DEFAULT 'normal',
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Memory" ("agentId", "content", "createdAt", "id", "type") SELECT "agentId", "content", "createdAt", "id", "type" FROM "Memory";
DROP TABLE "Memory";
ALTER TABLE "new_Memory" RENAME TO "Memory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
