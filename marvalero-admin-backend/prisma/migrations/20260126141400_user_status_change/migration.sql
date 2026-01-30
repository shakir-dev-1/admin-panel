/*
  Warnings:

  - The values [SUSPENDED,BANNED] on the enum `AccountStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountStatus_new" AS ENUM ('ACTIVE', 'DISABLED');
ALTER TABLE "User" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";
DROP TYPE "public"."AccountStatus_old";
COMMIT;
