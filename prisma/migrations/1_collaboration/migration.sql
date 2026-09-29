-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'ORGANIZATION',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- Documents already shared before this migration stay visible to their parties.
UPDATE "Document" SET "sentAt" = "updatedAt" WHERE "status" <> 'DRAFT';

-- AlterTable
ALTER TABLE "DocumentSection" ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "updatedByName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Stakeholder" ADD COLUMN     "invitedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "acceptedById" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "token" TEXT;

UPDATE "Invitation" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

-- The deployment still running when this migration applies creates invitations without a token.
ALTER TABLE "Invitation" ALTER COLUMN "token" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Invitation" ALTER COLUMN "token" SET NOT NULL;

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sectionId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presence_documentId_lastSeenAt_idx" ON "Presence"("documentId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_userId_documentId_key" ON "Presence"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
