-- AlterTable
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryIdsJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryInjected" BOOLEAN;
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryItemCount" INTEGER;
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryScopesJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeMemorySourcesJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryTotalChars" INTEGER;
ALTER TABLE "Task" ADD COLUMN "runtimeMemoryTypesJson" TEXT;
