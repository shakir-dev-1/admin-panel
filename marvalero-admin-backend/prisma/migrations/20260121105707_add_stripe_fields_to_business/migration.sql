-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;
