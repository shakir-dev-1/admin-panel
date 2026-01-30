/*
  Warnings:

  - Changed the type of `status` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('succeeded', 'requires_payment_method', 'canceled', 'processing', 'requires_action', 'requires_capture', 'disputed', 'refunded', 'partially_refunded');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_businessId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "businessId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
