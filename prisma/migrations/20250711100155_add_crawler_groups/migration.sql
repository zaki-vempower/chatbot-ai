-- AlterTable
ALTER TABLE "CrawledData" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "CrawlerGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrawlerGroup_name_key" ON "CrawlerGroup"("name");

-- AddForeignKey
ALTER TABLE "CrawledData" ADD CONSTRAINT "CrawledData_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CrawlerGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
