-- AlterTable
ALTER TABLE "Task" ADD COLUMN "runtimeRagChunkIdsJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagItemCount" INTEGER;
ALTER TABLE "Task" ADD COLUMN "runtimeRagMemoryIdsJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagPreviewOnly" BOOLEAN;
ALTER TABLE "Task" ADD COLUMN "runtimeRagQuery" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagRetrieved" BOOLEAN;
ALTER TABLE "Task" ADD COLUMN "runtimeRagScopesJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagScoresJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagSourcesJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagTopResultsJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeRagTotalChars" INTEGER;
ALTER TABLE "Task" ADD COLUMN "runtimeRagTypesJson" TEXT;
