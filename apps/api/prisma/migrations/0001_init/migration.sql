-- Create enums
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE "HistoryEntityType" AS ENUM ('LIST', 'TASK', 'SUBTASK', 'AI_OPERATION');
CREATE TYPE "HistoryActionType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RESTORED', 'AI_EXECUTED', 'AI_UNDONE');
CREATE TYPE "AiOperationStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'EXECUTED', 'UNDONE', 'FAILED');

-- Create tables
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "displayName" TEXT,
  "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
  "providerUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "List" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "listId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "deadline" TIMESTAMP(3),
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Subtask" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "parentTaskId" TEXT,
  "title" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subtask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "History" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "entityType" "HistoryEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "actionType" "HistoryActionType" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AiOperation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "planPayload" JSONB NOT NULL,
  "status" "AiOperationStatus" NOT NULL DEFAULT 'PLANNED',
  "executedAt" TIMESTAMP(3),
  "undoneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "List_userId_name_key" ON "List"("userId", "name");

-- Secondary indexes
CREATE INDEX "User_provider_providerUserId_idx" ON "User"("provider", "providerUserId");
CREATE INDEX "List_userId_deletedAt_idx" ON "List"("userId", "deletedAt");
CREATE INDEX "Task_userId_status_deletedAt_idx" ON "Task"("userId", "status", "deletedAt");
CREATE INDEX "Task_listId_idx" ON "Task"("listId");
CREATE INDEX "Subtask_userId_taskId_idx" ON "Subtask"("userId", "taskId");
CREATE INDEX "History_userId_createdAt_idx" ON "History"("userId", "createdAt");
CREATE INDEX "History_entityType_entityId_createdAt_idx" ON "History"("entityType", "entityId", "createdAt");
CREATE INDEX "AiOperation_userId_status_createdAt_idx" ON "AiOperation"("userId", "status", "createdAt");
