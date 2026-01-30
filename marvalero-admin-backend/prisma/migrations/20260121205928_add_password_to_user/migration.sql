/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `Admin` table. All the data in the column will be lost.
  - Added the required column `password` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Business_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Business_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "passwordHash",
ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'password';
