-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAttempt_key_createdAt_idx" ON "AdminAttempt"("key", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAttempt_createdAt_idx" ON "AdminAttempt"("createdAt");
