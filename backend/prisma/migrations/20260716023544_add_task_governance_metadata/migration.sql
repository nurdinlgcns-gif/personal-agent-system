-- AlterTable
ALTER TABLE "Task" ADD COLUMN "governanceAllowed" BOOLEAN;
ALTER TABLE "Task" ADD COLUMN "governanceConfidence" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceMatchedAllowedJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceMatchedDeniedJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceMatchedSmallTalkJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceMatchedSoftJson" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceReason" TEXT;
ALTER TABLE "Task" ADD COLUMN "governanceSuggestedAgentsJson" TEXT;
