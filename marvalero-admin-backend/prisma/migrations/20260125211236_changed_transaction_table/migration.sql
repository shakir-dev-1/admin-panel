-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "syncedFromStripe" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "currency" SET DEFAULT 'usd';

-- CreateIndex
CREATE INDEX "Transaction_lastSyncedAt_idx" ON "Transaction"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Transaction_stripePaymentId_idx" ON "Transaction"("stripePaymentId");
