-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "filePath" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fileSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ChatClear" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatClear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatClear_documentId_userId_key" ON "ChatClear"("documentId", "userId");

-- AddForeignKey
ALTER TABLE "ChatClear" ADD CONSTRAINT "ChatClear_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatClear" ADD CONSTRAINT "ChatClear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
