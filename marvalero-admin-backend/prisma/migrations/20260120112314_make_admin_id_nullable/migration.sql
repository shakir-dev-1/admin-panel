-- DropForeignKey
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_adminId_fkey";

-- AlterTable
ALTER TABLE "AdminAuditLog" ALTER COLUMN "adminId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
