-- CreateEnum
CREATE TYPE "AiOperationScope" AS ENUM ('GLOBAL', 'TASK');

-- AlterTable
ALTER TABLE "AiOperation"
  ADD COLUMN "taskId" TEXT,
  ADD COLUMN "scope" "AiOperationScope" NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN "model" TEXT,
  ADD COLUMN "executionPayload" JSONB,
  ADD COLUMN "undoPayload" JSONB,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "AiOperation_taskId_createdAt_idx" ON "AiOperation"("taskId", "createdAt");
