-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DISCOUNT', 'TRIAL_DAYS');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'APPLIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('OWNER', 'EMPLOYEE', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CHECKED_IN', 'NO_SHOW', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "CampaignOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED');

-- CreateEnum
CREATE TYPE "BusinessCountry" AS ENUM ('PK', 'US');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PREPAID', 'UNPAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TwoFactorType" AS ENUM ('EMAIL', 'SMS', 'GOOGLE_AUTH');

-- CreateEnum
CREATE TYPE "BusinessClientType" AS ENUM ('CUSTOMER', 'CLIENT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAY_IN', 'PAY_OUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionPaymentStatus" AS ENUM ('PAID_OUT', 'REFUNDED', 'UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('YEAR', 'MONTH');

-- CreateEnum
CREATE TYPE "AddOnType" AS ENUM ('EMPLOYEE', 'LOCATION');

-- CreateEnum
CREATE TYPE "AddOnStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BusinessUserType" AS ENUM ('PILOT', 'REGULAR', 'REFERRAL');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'UPGRADED', 'DOWNGRADED', 'RENEWED', 'CANCELLED');

-- CreateTable
CREATE TABLE "scopes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" "Roles" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_scopes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,

    CONSTRAINT "role_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refreshTokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "businessUserId" TEXT,
    "influencerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "city" TEXT,
    "country" TEXT,
    "device" TEXT,
    "deviceToken" TEXT,
    "ipAddress" TEXT,
    "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "countryCode" TEXT,
    "regionName" TEXT,

    CONSTRAINT "refreshTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessUsers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "address" TEXT,
    "alternativePhoneNumber" TEXT,
    "city" TEXT,
    "firstName" TEXT,
    "floor" TEXT,
    "homeNumber" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "sector" TEXT,
    "state" TEXT,
    "username" TEXT,
    "zipcode" TEXT,
    "isAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
    "area" TEXT,
    "street" TEXT,
    "twoFactorType" "TwoFactorType",
    "avatarId" TEXT,
    "dateOfBirth" DATE,
    "gender" TEXT,
    "fullName" TEXT,
    "clerkUserId" TEXT NOT NULL,
    "isEmployeeConsentApproved" BOOLEAN NOT NULL DEFAULT false,
    "businessUserType" "BusinessUserType" NOT NULL DEFAULT 'REGULAR',
    "inviteCode" TEXT,
    "referralCode" TEXT NOT NULL,

    CONSTRAINT "businessUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "floor" TEXT,
    "office" TEXT,
    "sector" TEXT,
    "state" TEXT,
    "zipcode" TEXT NOT NULL,
    "industryType" TEXT[],
    "avatarId" TEXT,
    "email" TEXT,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "area" TEXT,
    "street" TEXT,
    "isPhoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,
    "hasBeenPromptedForSync" BOOLEAN NOT NULL DEFAULT false,
    "locationTitle" TEXT,
    "primaryLocationId" TEXT,
    "averageRating" DOUBLE PRECISION,
    "description" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalAverageRating" DOUBLE PRECISION,
    "prePayment" INTEGER NOT NULL DEFAULT 0,
    "clerkOrganizationId" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "country" TEXT NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessPayoutInfo" (
    "id" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "cnic" TEXT NOT NULL,
    "accountTitle" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "accountNumberIv" TEXT NOT NULL,
    "cnicIv" TEXT NOT NULL,
    "msisdnIv" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,

    CONSTRAINT "businessPayoutInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amountSent" DOUBLE PRECISION NOT NULL,
    "amountReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionType" "TransactionType" NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "transactionStatus" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
    "paymentStatus" "TransactionPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "tip" DOUBLE PRECISION,
    "prePayment" INTEGER NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessPolicies" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "policy" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessPolicies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "features" JSONB NOT NULL DEFAULT '[]',
    "prices" JSONB NOT NULL DEFAULT '[]',
    "trialPeriodDays" INTEGER,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessSubscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "customerTransactionId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID',
    "isTrialUsed" BOOLEAN DEFAULT true,
    "orderId" TEXT,
    "paymentCheck" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "startDate" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
    "canceledDate" TIMESTAMP(3),

    CONSTRAINT "businessSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAddOn" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "purchaseById" TEXT NOT NULL,
    "type" "AddOnType" NOT NULL,
    "status" "AddOnStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "resourceId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSubscriptionHistory" (
    "id" TEXT NOT NULL,
    "businessSubscriptionId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" "SubscriptionEventType" NOT NULL,
    "oldPlanId" TEXT,
    "newPlanId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessSubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessSocialMedia" (
    "id" TEXT NOT NULL,
    "instagram" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "twitter" TEXT,
    "businessId" TEXT NOT NULL,
    "snapchat" TEXT,
    "tiktok" TEXT,

    CONSTRAINT "businessSocialMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessHours" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weekday" TEXT NOT NULL,
    "closingHour" INTEGER,
    "closingMinute" INTEGER,
    "closingPeriod" VARCHAR(2),
    "openingHour" INTEGER,
    "openingMinute" INTEGER,
    "openingPeriod" VARCHAR(2),

    CONSTRAINT "businessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessHolidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "businessHolidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessPackages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "imageId" TEXT,
    "durationHours" INTEGER,
    "durationMinutes" INTEGER,
    "totalDuration" INTEGER,
    "price" DOUBLE PRECISION,

    CONSTRAINT "businessPackages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessPackageToServices" (
    "id" TEXT NOT NULL,
    "businessPackageId" TEXT NOT NULL,
    "businessServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessPackageToServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessServices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "durationHours" INTEGER,
    "durationMinutes" INTEGER,
    "totalDuration" INTEGER,
    "averageRating" DOUBLE PRECISION,

    CONSTRAINT "businessServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessClients" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "area" TEXT,
    "city" TEXT,
    "floor" INTEGER,
    "houseNumber" INTEGER,
    "note" TEXT,
    "sector" TEXT,
    "street" TEXT,
    "type" "BusinessClientType" NOT NULL,
    "stylistNote" TEXT,

    CONSTRAINT "businessClients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employeeClients" (
    "id" TEXT NOT NULL,
    "businessMemberId" TEXT NOT NULL,
    "businessClientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employeeClients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "businessServiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessPackageId" TEXT,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serviceCategories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "serviceCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT,
    "url" TEXT NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessMemberToBusinessServices" (
    "id" TEXT NOT NULL,
    "businessMemberId" TEXT NOT NULL,
    "businessServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessMemberToBusinessServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessMembers" (
    "id" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "designation" TEXT,
    "onlineBooking" BOOLEAN NOT NULL DEFAULT false,
    "walkInBooking" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION,
    "about" TEXT,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "businessMembers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employeeHours" (
    "id" TEXT NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "startHour" INTEGER,
    "startMinute" INTEGER,
    "startPeriod" TEXT,
    "endHour" INTEGER,
    "endMinute" INTEGER,
    "endPeriod" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessMemberId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "endShift" TIMESTAMP(3),
    "startShift" TIMESTAMP(3),

    CONSTRAINT "employeeHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CREATED',
    "note" TEXT,
    "employeeId" TEXT,
    "businessServiceId" TEXT,
    "businessId" TEXT NOT NULL,
    "start" TIMESTAMPTZ(6) NOT NULL,
    "end" TIMESTAMPTZ(6) NOT NULL,
    "clientId" TEXT NOT NULL,
    "sendReminderEmail" BOOLEAN NOT NULL DEFAULT false,
    "businessPackageId" TEXT,
    "primaryAppointmentId" TEXT,
    "notificationTime" TIMESTAMPTZ(6),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collabCampaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collabCampaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaignOffers" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "CampaignOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaignOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "username" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "twoFactorType" "TwoFactorType",

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "dateOfBirth" DATE,
    "firstName" TEXT,
    "gender" TEXT,
    "isAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "username" TEXT,
    "googleId" TEXT,
    "facebookId" TEXT,
    "profilePicture" TEXT,
    "avatarId" TEXT,
    "twoFactorType" "TwoFactorType",
    "hasAcceptedPolicy" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "clerkUserId" TEXT NOT NULL,
    "banDate" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anonymousModeForReviews" BOOLEAN NOT NULL DEFAULT false,
    "appUpdatesNotification" BOOLEAN NOT NULL DEFAULT false,
    "appointmentRemindersNotification" BOOLEAN NOT NULL DEFAULT true,
    "cameraPermission" BOOLEAN NOT NULL DEFAULT false,
    "emailNotificationForAppointments" BOOLEAN NOT NULL DEFAULT false,
    "galleryPermission" BOOLEAN NOT NULL DEFAULT false,
    "generalNotification" BOOLEAN NOT NULL DEFAULT false,
    "locationPermission" BOOLEAN NOT NULL DEFAULT false,
    "newServiceAvailableNotification" BOOLEAN NOT NULL DEFAULT true,
    "notificationsOnLockScreenPermission" BOOLEAN NOT NULL DEFAULT false,
    "paymentsNotification" BOOLEAN NOT NULL DEFAULT true,
    "promoDiscountsNotification" BOOLEAN NOT NULL DEFAULT true,
    "pushNotificationForAppointments" BOOLEAN NOT NULL DEFAULT true,
    "reviewVisibleToOtherUsers" BOOLEAN NOT NULL DEFAULT true,
    "soundNotification" BOOLEAN NOT NULL DEFAULT true,
    "specialOffersNotification" BOOLEAN NOT NULL DEFAULT false,
    "syncContactsPermission" BOOLEAN NOT NULL DEFAULT false,
    "textNotificationForAppointments" BOOLEAN NOT NULL DEFAULT false,
    "vibrateNotification" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "userSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searchEntries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "searchEntries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessReviews" (
    "id" TEXT NOT NULL,
    "ratings" DOUBLE PRECISION NOT NULL,
    "review" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "businessMemberId" TEXT,
    "isRead" BOOLEAN DEFAULT false,
    "businessServiceId" TEXT,
    "isPublic" BOOLEAN DEFAULT true,

    CONSTRAINT "businessReviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessReviewReplies" (
    "id" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,

    CONSTRAINT "businessReviewReplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "industryTypes" TEXT[],
    "categories" TEXT[],

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactUsEntries" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,

    CONSTRAINT "contactUsEntries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordinates" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "businessId" TEXT NOT NULL,
    "coordinate" geometry,
    "timezone" TEXT,

    CONSTRAINT "coordinates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "businessUserType" "BusinessUserType" NOT NULL DEFAULT 'REGULAR',
    "invitedByBusinessUserId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "referredByBusinessUserId" TEXT,
    "rewardType" "RewardType" NOT NULL,
    "status" "RewardStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businessUserSettings" (
    "id" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "appointmentNotification" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "businessUserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BusinessToLanguage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessToLanguage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BusinessToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_businessToServiceCreatedBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_businessToServiceCreatedBy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_businessToServiceDeletedBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_businessToServiceDeletedBy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AmenityToBusiness" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AmenityToBusiness_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_InterestToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InterestToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "scopes_name_key" ON "scopes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_scopes_roleId_scopeId_key" ON "role_scopes"("roleId", "scopeId");

-- CreateIndex
CREATE INDEX "refresh_token_id_index" ON "refreshTokens"("id");

-- CreateIndex
CREATE INDEX "refresh_token_device_token_index" ON "refreshTokens"("deviceToken");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_index" ON "refreshTokens"("businessUserId");

-- CreateIndex
CREATE UNIQUE INDEX "refreshTokens_influencerId_userAgent_key" ON "refreshTokens"("influencerId", "userAgent");

-- CreateIndex
CREATE UNIQUE INDEX "refreshTokens_businessUserId_userAgent_key" ON "refreshTokens"("businessUserId", "userAgent");

-- CreateIndex
CREATE UNIQUE INDEX "refreshTokens_userId_userAgent_key" ON "refreshTokens"("userId", "userAgent");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_email_key" ON "businessUsers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_phoneNumber_key" ON "businessUsers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_username_key" ON "businessUsers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_avatarId_key" ON "businessUsers"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_clerkUserId_key" ON "businessUsers"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "businessUsers_referralCode_key" ON "businessUsers"("referralCode");

-- CreateIndex
CREATE INDEX "business_user_id_index" ON "businessUsers"("id");

-- CreateIndex
CREATE INDEX "business_user_email_index" ON "businessUsers"("email");

-- CreateIndex
CREATE INDEX "business_user_username_index" ON "businessUsers"("username");

-- CreateIndex
CREATE INDEX "business_user_full_name_index" ON "businessUsers"("fullName");

-- CreateIndex
CREATE INDEX "business_user_referral_code_index" ON "businessUsers"("referralCode");

-- CreateIndex
CREATE INDEX "business_user_invite_code_index" ON "businessUsers"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_avatarId_key" ON "businesses"("avatarId");

-- CreateIndex
CREATE INDEX "business_id_index" ON "businesses"("id");

-- CreateIndex
CREATE INDEX "business_clerk_organization_id_index" ON "businesses"("clerkOrganizationId");

-- CreateIndex
CREATE INDEX "business_name_index" ON "businesses"("name");

-- CreateIndex
CREATE INDEX "business_zipcode_index" ON "businesses"("zipcode");

-- CreateIndex
CREATE INDEX "business_city_index" ON "businesses"("city");

-- CreateIndex
CREATE INDEX "business_stripe_account_id_index" ON "businesses"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "banks_bankCode_key" ON "banks"("bankCode");

-- CreateIndex
CREATE INDEX "bank_id_index" ON "banks"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessPayoutInfo_businessId_key" ON "businessPayoutInfo"("businessId");

-- CreateIndex
CREATE INDEX "business_payout_info_id_index" ON "businessPayoutInfo"("id");

-- CreateIndex
CREATE INDEX "transaction_id_index" ON "transactions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_appointmentId_key" ON "invoices"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripePaymentIntentId_key" ON "invoices"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "invoice_id_index" ON "invoices"("id");

-- CreateIndex
CREATE INDEX "invoice_appointment_id_index" ON "invoices"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "businessPolicies_businessId_key" ON "businessPolicies"("businessId");

-- CreateIndex
CREATE INDEX "business_policy_id_index" ON "businessPolicies"("id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_title_key" ON "subscriptions"("title");

-- CreateIndex
CREATE INDEX "subscription_id_index" ON "subscriptions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessSubscription_customerTransactionId_key" ON "businessSubscription"("customerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "businessSubscription_orderId_key" ON "businessSubscription"("orderId");

-- CreateIndex
CREATE INDEX "subscription_business_id_index" ON "businessSubscription"("businessId");

-- CreateIndex
CREATE INDEX "BusinessSubscriptionHistory_subscriptionId_idx" ON "BusinessSubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "businessSocialMedia_businessId_key" ON "businessSocialMedia"("businessId");

-- CreateIndex
CREATE INDEX "business_social_media_id_index" ON "businessSocialMedia"("id");

-- CreateIndex
CREATE UNIQUE INDEX "languages_name_key" ON "languages"("name");

-- CreateIndex
CREATE INDEX "language_id_index" ON "languages"("id");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "amenities_id_index" ON "amenities"("id");

-- CreateIndex
CREATE INDEX "business_hours_id_index" ON "businessHours"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessHours_businessId_weekday_key" ON "businessHours"("businessId", "weekday");

-- CreateIndex
CREATE INDEX "business_holiday_id_index" ON "businessHolidays"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessHolidays_businessId_date_key" ON "businessHolidays"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "businessPackages_imageId_key" ON "businessPackages"("imageId");

-- CreateIndex
CREATE INDEX "business_package_service_id_index" ON "businessPackages"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessPackages_businessId_title_key" ON "businessPackages"("businessId", "title");

-- CreateIndex
CREATE INDEX "business_package_to_service_id_index" ON "businessPackageToServices"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessPackageToServices_businessPackageId_businessService_key" ON "businessPackageToServices"("businessPackageId", "businessServiceId");

-- CreateIndex
CREATE INDEX "business_services_id_index" ON "businessServices"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessServices_businessId_serviceId_key" ON "businessServices"("businessId", "serviceId");

-- CreateIndex
CREATE INDEX "business_clients_id_index" ON "businessClients"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessClients_businessId_email_phoneNumber_key" ON "businessClients"("businessId", "email", "phoneNumber");

-- CreateIndex
CREATE INDEX "employee_clients_id_index" ON "employeeClients"("id");

-- CreateIndex
CREATE UNIQUE INDEX "employeeClients_businessMemberId_businessClientId_categoryI_key" ON "employeeClients"("businessMemberId", "businessClientId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_businessServiceId_key" ON "promotions"("businessServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_businessPackageId_key" ON "promotions"("businessPackageId");

-- CreateIndex
CREATE INDEX "promotion_id_index" ON "promotions"("id");

-- CreateIndex
CREATE INDEX "service_id_index" ON "services"("id");

-- CreateIndex
CREATE INDEX "service_title_index" ON "services"("title");

-- CreateIndex
CREATE UNIQUE INDEX "services_categoryId_title_key" ON "services"("categoryId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "serviceCategories_title_key" ON "serviceCategories"("title");

-- CreateIndex
CREATE INDEX "service_category_id_index" ON "serviceCategories"("id");

-- CreateIndex
CREATE INDEX "service_category_title_index" ON "serviceCategories"("title");

-- CreateIndex
CREATE INDEX "file_id_index" ON "files"("id");

-- CreateIndex
CREATE INDEX "file_type_index" ON "files"("type");

-- CreateIndex
CREATE UNIQUE INDEX "files_businessId_key_key" ON "files"("businessId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "files_businessId_categoryId_key" ON "files"("businessId", "categoryId");

-- CreateIndex
CREATE INDEX "business_member_to_business_service_id_index" ON "businessMemberToBusinessServices"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessMemberToBusinessServices_businessMemberId_businessS_key" ON "businessMemberToBusinessServices"("businessMemberId", "businessServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "businessMembers_businessUserId_key" ON "businessMembers"("businessUserId");

-- CreateIndex
CREATE INDEX "business_member_id_index" ON "businessMembers"("id");

-- CreateIndex
CREATE INDEX "business_member_business_user_id_index" ON "businessMembers"("businessUserId");

-- CreateIndex
CREATE INDEX "business_member_business_id_index" ON "businessMembers"("businessId");

-- CreateIndex
CREATE INDEX "business_member_role_id_index" ON "businessMembers"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "businessMembers_businessUserId_businessId_key" ON "businessMembers"("businessUserId", "businessId");

-- CreateIndex
CREATE INDEX "employee_hours_id_index" ON "employeeHours"("id");

-- CreateIndex
CREATE UNIQUE INDEX "employeeHours_businessMemberId_date_key" ON "employeeHours"("businessMemberId", "date");

-- CreateIndex
CREATE INDEX "appointment_id_index" ON "appointments"("id");

-- CreateIndex
CREATE INDEX "collab_campaign_id_index" ON "collabCampaigns"("id");

-- CreateIndex
CREATE INDEX "campaign_offer_id_index" ON "campaignOffers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "campaignOffers_influencerId_campaignId_key" ON "campaignOffers"("influencerId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_email_key" ON "influencers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_username_key" ON "influencers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_phoneNumber_key" ON "influencers"("phoneNumber");

-- CreateIndex
CREATE INDEX "influencer_id_index" ON "influencers"("id");

-- CreateIndex
CREATE INDEX "influencer_email_index" ON "influencers"("email");

-- CreateIndex
CREATE INDEX "influencer_username_index" ON "influencers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_avatarId_key" ON "users"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE INDEX "user_id_index" ON "users"("id");

-- CreateIndex
CREATE INDEX "user_email_index" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_username_index" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "userSettings_userId_key" ON "userSettings"("userId");

-- CreateIndex
CREATE INDEX "user_settings_id_index" ON "userSettings"("id");

-- CreateIndex
CREATE INDEX "search_history_id_index" ON "searchEntries"("id");

-- CreateIndex
CREATE UNIQUE INDEX "searchEntries_userId_businessId_key" ON "searchEntries"("userId", "businessId");

-- CreateIndex
CREATE INDEX "business_review_id_index" ON "businessReviews"("id");

-- CreateIndex
CREATE INDEX "business_review_business_member_id_index" ON "businessReviews"("businessMemberId");

-- CreateIndex
CREATE INDEX "business_review_business_id_index" ON "businessReviews"("id");

-- CreateIndex
CREATE INDEX "business_review_user_id_index" ON "businessReviews"("id");

-- CreateIndex
CREATE UNIQUE INDEX "businessReviews_userId_businessId_key" ON "businessReviews"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "businessReviews_userId_businessMemberId_key" ON "businessReviews"("userId", "businessMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "businessReviews_userId_businessServiceId_key" ON "businessReviews"("userId", "businessServiceId");

-- CreateIndex
CREATE INDEX "business_review_reply_id_index" ON "businessReviewReplies"("id");

-- CreateIndex
CREATE INDEX "business_review_reply_business_id_index" ON "businessReviewReplies"("businessId");

-- CreateIndex
CREATE INDEX "business_review_reply_review_id_index" ON "businessReviewReplies"("reviewId");

-- CreateIndex
CREATE INDEX "business_review_reply_user_id_index" ON "businessReviewReplies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "interests_name_key" ON "interests"("name");

-- CreateIndex
CREATE INDEX "interest_id_index" ON "interests"("id");

-- CreateIndex
CREATE INDEX "contact_us_entry_id_index" ON "contactUsEntries"("id");

-- CreateIndex
CREATE UNIQUE INDEX "coordinates_businessId_key" ON "coordinates"("businessId");

-- CreateIndex
CREATE INDEX "coordinates_id_index" ON "coordinates"("id");

-- CreateIndex
CREATE INDEX "coordinates_coordinate_idx" ON "coordinates" USING GIST ("coordinate");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_key" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_businessUserType_idx" ON "invitations"("businessUserType");

-- CreateIndex
CREATE INDEX "referred_by_business_user_id" ON "rewards"("referredByBusinessUserId");

-- CreateIndex
CREATE INDEX "recieved_by_business_user_id" ON "rewards"("businessUserId");

-- CreateIndex
CREATE UNIQUE INDEX "businessUserSettings_businessUserId_key" ON "businessUserSettings"("businessUserId");

-- CreateIndex
CREATE INDEX "business_user_settings_id_index" ON "businessUserSettings"("id");

-- CreateIndex
CREATE INDEX "_BusinessToLanguage_B_index" ON "_BusinessToLanguage"("B");

-- CreateIndex
CREATE INDEX "_BusinessToUser_B_index" ON "_BusinessToUser"("B");

-- CreateIndex
CREATE INDEX "_businessToServiceCreatedBy_B_index" ON "_businessToServiceCreatedBy"("B");

-- CreateIndex
CREATE INDEX "_businessToServiceDeletedBy_B_index" ON "_businessToServiceDeletedBy"("B");

-- CreateIndex
CREATE INDEX "_AmenityToBusiness_B_index" ON "_AmenityToBusiness"("B");

-- CreateIndex
CREATE INDEX "_InterestToUser_B_index" ON "_InterestToUser"("B");

-- AddForeignKey
ALTER TABLE "role_scopes" ADD CONSTRAINT "role_scopes_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_scopes" ADD CONSTRAINT "role_scopes_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessUsers" ADD CONSTRAINT "businessUsers_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPayoutInfo" ADD CONSTRAINT "businessPayoutInfo_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPayoutInfo" ADD CONSTRAINT "businessPayoutInfo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPolicies" ADD CONSTRAINT "businessPolicies_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessSubscription" ADD CONSTRAINT "businessSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessSubscription" ADD CONSTRAINT "businessSubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAddOn" ADD CONSTRAINT "BusinessAddOn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAddOn" ADD CONSTRAINT "BusinessAddOn_purchaseById_fkey" FOREIGN KEY ("purchaseById") REFERENCES "businessMembers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubscriptionHistory" ADD CONSTRAINT "BusinessSubscriptionHistory_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "businessSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessSocialMedia" ADD CONSTRAINT "businessSocialMedia_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessHours" ADD CONSTRAINT "businessHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessHolidays" ADD CONSTRAINT "businessHolidays_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPackages" ADD CONSTRAINT "businessPackages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPackages" ADD CONSTRAINT "businessPackages_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPackageToServices" ADD CONSTRAINT "businessPackageToServices_businessPackageId_fkey" FOREIGN KEY ("businessPackageId") REFERENCES "businessPackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessPackageToServices" ADD CONSTRAINT "businessPackageToServices_businessServiceId_fkey" FOREIGN KEY ("businessServiceId") REFERENCES "businessServices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessServices" ADD CONSTRAINT "businessServices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessServices" ADD CONSTRAINT "businessServices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessClients" ADD CONSTRAINT "businessClients_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessClients" ADD CONSTRAINT "businessClients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeClients" ADD CONSTRAINT "employeeClients_businessClientId_fkey" FOREIGN KEY ("businessClientId") REFERENCES "businessClients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeClients" ADD CONSTRAINT "employeeClients_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "businessMembers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeClients" ADD CONSTRAINT "employeeClients_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "serviceCategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_businessPackageId_fkey" FOREIGN KEY ("businessPackageId") REFERENCES "businessPackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_businessServiceId_fkey" FOREIGN KEY ("businessServiceId") REFERENCES "businessServices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "serviceCategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "serviceCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessMemberToBusinessServices" ADD CONSTRAINT "businessMemberToBusinessServices_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "businessMembers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessMemberToBusinessServices" ADD CONSTRAINT "businessMemberToBusinessServices_businessServiceId_fkey" FOREIGN KEY ("businessServiceId") REFERENCES "businessServices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessMembers" ADD CONSTRAINT "businessMembers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessMembers" ADD CONSTRAINT "businessMembers_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessMembers" ADD CONSTRAINT "businessMembers_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeHours" ADD CONSTRAINT "employeeHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeHours" ADD CONSTRAINT "employeeHours_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "businessMembers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_businessPackageId_fkey" FOREIGN KEY ("businessPackageId") REFERENCES "businessPackages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_businessServiceId_fkey" FOREIGN KEY ("businessServiceId") REFERENCES "businessServices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "businessClients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "businessMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_primaryAppointmentId_fkey" FOREIGN KEY ("primaryAppointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collabCampaigns" ADD CONSTRAINT "collabCampaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaignOffers" ADD CONSTRAINT "campaignOffers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaignOffers" ADD CONSTRAINT "campaignOffers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "collabCampaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaignOffers" ADD CONSTRAINT "campaignOffers_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSettings" ADD CONSTRAINT "userSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "searchEntries" ADD CONSTRAINT "searchEntries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "searchEntries" ADD CONSTRAINT "searchEntries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviews" ADD CONSTRAINT "businessReviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviews" ADD CONSTRAINT "businessReviews_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "businessMembers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviews" ADD CONSTRAINT "businessReviews_businessServiceId_fkey" FOREIGN KEY ("businessServiceId") REFERENCES "businessServices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviews" ADD CONSTRAINT "businessReviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviewReplies" ADD CONSTRAINT "businessReviewReplies_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviewReplies" ADD CONSTRAINT "businessReviewReplies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "businessReviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessReviewReplies" ADD CONSTRAINT "businessReviewReplies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinates" ADD CONSTRAINT "coordinates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedByBusinessUserId_fkey" FOREIGN KEY ("invitedByBusinessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_referredByBusinessUserId_fkey" FOREIGN KEY ("referredByBusinessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessUserSettings" ADD CONSTRAINT "businessUserSettings_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "businessUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessToLanguage" ADD CONSTRAINT "_BusinessToLanguage_A_fkey" FOREIGN KEY ("A") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessToLanguage" ADD CONSTRAINT "_BusinessToLanguage_B_fkey" FOREIGN KEY ("B") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessToUser" ADD CONSTRAINT "_BusinessToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessToUser" ADD CONSTRAINT "_BusinessToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessToServiceCreatedBy" ADD CONSTRAINT "_businessToServiceCreatedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessToServiceCreatedBy" ADD CONSTRAINT "_businessToServiceCreatedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessToServiceDeletedBy" ADD CONSTRAINT "_businessToServiceDeletedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessToServiceDeletedBy" ADD CONSTRAINT "_businessToServiceDeletedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToBusiness" ADD CONSTRAINT "_AmenityToBusiness_A_fkey" FOREIGN KEY ("A") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToBusiness" ADD CONSTRAINT "_AmenityToBusiness_B_fkey" FOREIGN KEY ("B") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterestToUser" ADD CONSTRAINT "_InterestToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterestToUser" ADD CONSTRAINT "_InterestToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

