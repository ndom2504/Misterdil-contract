-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "DocumentSection" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PushToken" ADD COLUMN     "chime" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionLike" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionView" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "SectionLike_sectionId_userId_key" ON "SectionLike"("sectionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionView_sectionId_userId_key" ON "SectionView"("sectionId", "userId");

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionLike" ADD CONSTRAINT "SectionLike_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DocumentSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionLike" ADD CONSTRAINT "SectionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionView" ADD CONSTRAINT "SectionView_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DocumentSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionView" ADD CONSTRAINT "SectionView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
