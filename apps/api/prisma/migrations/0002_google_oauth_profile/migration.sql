-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "givenName" TEXT,
  ADD COLUMN "familyName" TEXT,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX IF EXISTS "User_provider_providerUserId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerUserId_key" ON "User"("provider", "providerUserId");
