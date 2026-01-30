/*
  Warnings:

  - You are about to drop the column `subscriptionPlan` on the `Business` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `Business` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Business` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Business" DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");
