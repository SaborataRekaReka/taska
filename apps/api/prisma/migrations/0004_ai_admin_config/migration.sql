-- CreateTable
CREATE TABLE "AiAdminConfig" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "myDayAutoConfirm" BOOLEAN NOT NULL DEFAULT true,
  "myDayAutoExecute" BOOLEAN NOT NULL DEFAULT true,
  "myDayTaskLimit" INTEGER NOT NULL DEFAULT 4,
  "blockDeleteOperations" BOOLEAN NOT NULL DEFAULT false,
  "requireUndoReason" BOOLEAN NOT NULL DEFAULT true,
  "operatorNotes" TEXT,
  "promptGuardrails" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAdminConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAdminConfig_userId_key" ON "AiAdminConfig"("userId");

-- CreateIndex
CREATE INDEX "AiAdminConfig_updatedAt_idx" ON "AiAdminConfig"("updatedAt");

-- AddForeignKey
ALTER TABLE "AiAdminConfig"
  ADD CONSTRAINT "AiAdminConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
