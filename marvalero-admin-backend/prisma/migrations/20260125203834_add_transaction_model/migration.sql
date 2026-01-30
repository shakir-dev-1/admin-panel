-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "refundAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userEmail" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentId_key" ON "Transaction"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Transaction_businessId_idx" ON "Transaction"("businessId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
