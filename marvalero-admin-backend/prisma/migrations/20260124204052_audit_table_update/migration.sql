-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
