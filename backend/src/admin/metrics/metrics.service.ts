import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RecentUserDto } from '../dto/recent-user.dto.js';

export interface LoginAnalyticsRow {
  date: Date;
  consumer_logins: bigint;
  business_logins: bigint;
  influencer_logins: bigint;
  total_logins: bigint;
}

export interface SerializedLoginAnalyticsRow {
  date: Date;
  consumer_logins: number;
  business_logins: number;
  influencer_logins: number;
  total_logins: number;
}

export interface LoginAnalyticsResponse {
  loginsByDay: SerializedLoginAnalyticsRow[];
  totalLoginsLast7Days: number;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserMetrics() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Get counts from all user types
    const [
      totalUsers,
      totalBusinessUsers,
      totalInfluencers,
      totalConsumers,
      activeConsumers,
      bannedConsumers,
      dailyLogins,

      // Get recent login counts by user type
      consumerDailyLogins,
      businessUserDailyLogins,
      influencerDailyLogins,
    ] = await Promise.all([
      // Total regular users
      this.prisma.user.count(),

      // Total business users
      this.prisma.businessUser.count(),

      // Total influencers
      this.prisma.influencer.count(),

      // Total consumers (regular users)
      this.prisma.user.count(),

      // Active consumers (not banned and email confirmed)
      this.prisma.user.count({
        where: {
          isBanned: false,
          isEmailConfirmed: true,
        },
      }),

      // Banned consumers
      this.prisma.user.count({
        where: {
          isBanned: true,
        },
      }),

      // Daily logins across all user types
      Promise.all([
        this.prisma.refreshToken.count({
          where: {
            lastLogin: { gte: startOfDay },
            userId: { not: null },
          },
        }),
        this.prisma.refreshToken.count({
          where: {
            lastLogin: { gte: startOfDay },
            businessUserId: { not: null },
          },
        }),
        this.prisma.refreshToken.count({
          where: {
            lastLogin: { gte: startOfDay },
            influencerId: { not: null },
          },
        }),
      ]).then(([consumer, business, influencer]) => ({
        total: consumer + business + influencer,
        consumers: consumer,
        business: business,
        influencers: influencer,
      })),

      // Individual daily login counts for breakdown
      this.prisma.refreshToken.count({
        where: {
          lastLogin: { gte: startOfDay },
          userId: { not: null },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          lastLogin: { gte: startOfDay },
          businessUserId: { not: null },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          lastLogin: { gte: startOfDay },
          influencerId: { not: null },
        },
      }),
    ]);

    // Get active business users (email confirmed)
    const activeBusinessUsers = await this.prisma.businessUser.count({
      where: {
        isEmailConfirmed: true,
      },
    });

    // Get active influencers (email confirmed)
    const activeInfluencers = await this.prisma.influencer.count({
      where: {
        isEmailConfirmed: true,
      },
    });

    // Get users who have never logged in
    const [
      consumersNeverLoggedIn,
      businessUsersNeverLoggedIn,
      influencersNeverLoggedIn,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          refreshTokens: {
            none: {},
          },
        },
      }),
      this.prisma.businessUser.count({
        where: {
          refreshTokens: {
            none: {},
          },
        },
      }),
      this.prisma.influencer.count({
        where: {
          refreshTokens: {
            none: {},
          },
        },
      }),
    ]);

    // Get email confirmation stats
    const [
      consumersEmailConfirmed,
      businessUsersEmailConfirmed,
      influencersEmailConfirmed,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { isEmailConfirmed: true },
      }),
      this.prisma.businessUser.count({
        where: { isEmailConfirmed: true },
      }),
      this.prisma.influencer.count({
        where: { isEmailConfirmed: true },
      }),
    ]);

    // Get 2FA enabled stats
    const [
      consumers2FAEnabled,
      businessUsers2FAEnabled,
      influencers2FAEnabled,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { twoFactorEnabled: true },
      }),
      this.prisma.businessUser.count({
        where: { twoFactorEnabled: true },
      }),
      this.prisma.influencer.count({
        where: { twoFactorEnabled: true },
      }),
    ]);

    return {
      // Total counts
      totalUsers: totalUsers + totalBusinessUsers + totalInfluencers,
      totalConsumers,
      totalBusinessUsers,
      totalInfluencers,

      // Active users (email confirmed and not banned for consumers)
      activeUsers: activeConsumers + activeBusinessUsers + activeInfluencers,
      activeConsumers,
      activeBusinessUsers,
      activeInfluencers,

      // Inactive/banned users
      inactiveUsers:
        totalConsumers -
        activeConsumers -
        bannedConsumers +
        (totalBusinessUsers - activeBusinessUsers) +
        (totalInfluencers - activeInfluencers),
      bannedConsumers,

      // Login metrics
      dailyLogins: dailyLogins.total,
      dailyConsumerLogins: consumerDailyLogins,
      dailyBusinessLogins: businessUserDailyLogins,
      dailyInfluencerLogins: influencerDailyLogins,

      // Never logged in
      neverLoggedIn:
        consumersNeverLoggedIn +
        businessUsersNeverLoggedIn +
        influencersNeverLoggedIn,
      consumersNeverLoggedIn,
      businessUsersNeverLoggedIn,
      influencersNeverLoggedIn,

      // Email confirmation
      emailConfirmed:
        consumersEmailConfirmed +
        businessUsersEmailConfirmed +
        influencersEmailConfirmed,
      consumersEmailConfirmed,
      businessUsersEmailConfirmed,
      influencersEmailConfirmed,

      // 2FA adoption
      twoFactorEnabled:
        consumers2FAEnabled + businessUsers2FAEnabled + influencers2FAEnabled,
      consumers2FAEnabled,
      businessUsers2FAEnabled,
      influencers2FAEnabled,

      // User type distribution
      userTypeDistribution: [
        { type: 'CONSUMER', count: totalConsumers },
        { type: 'BUSINESS', count: totalBusinessUsers },
        { type: 'INFLUENCER', count: totalInfluencers },
      ],

      // Status distribution for consumers
      consumerStatusDistribution: [
        { status: 'ACTIVE', count: activeConsumers },
        { status: 'BANNED', count: bannedConsumers },
        {
          status: 'UNVERIFIED',
          count: totalConsumers - activeConsumers - bannedConsumers,
        },
      ],
    };
  }

  // Optional: Get detailed business metrics
  async getBusinessMetrics() {
    const [
      totalBusinesses,
      verifiedBusinesses,
      businessesWithSubscriptions,
      businessesWithPayoutInfo,

      // **Appointments**
      totalAppointments,
      activeAppointments,
      completedAppointments,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({ where: { isVerified: true } }),
      this.prisma.business.count({
        where: {
          subscription: { some: { status: 'ACTIVE' } },
        },
      }),
      this.prisma.business.count({
        where: {
          payoutInfo: { some: {} },
        },
      }),

      // Count all appointments
      this.prisma.appointment.count(),

      // Count active/upcoming appointments
      this.prisma.appointment.count({
        where: {
          status: { in: ['CREATED', 'CONFIRMED', 'CHECKED_IN'] },
        },
      }),

      // Count completed appointments
      this.prisma.appointment.count({
        where: { status: 'COMPLETED' },
      }),
    ]);

    return {
      totalBusinesses,
      verifiedBusinesses,
      businessesWithSubscriptions,
      businessesWithPayoutInfo,
      verificationRate:
        totalBusinesses > 0 ? (verifiedBusinesses / totalBusinesses) * 100 : 0,
      subscriptionRate:
        totalBusinesses > 0
          ? (businessesWithSubscriptions / totalBusinesses) * 100
          : 0,
      payoutInfoRate:
        totalBusinesses > 0
          ? (businessesWithPayoutInfo / totalBusinesses) * 100
          : 0,

      // **Appointments**
      totalAppointments,
      activeAppointments,
      completedAppointments,
      averageAppointmentsPerBusiness:
        totalBusinesses > 0 ? totalAppointments / totalBusinesses : 0,
    };
  }

  async getLoginAnalytics(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    // Use the exact table name from your schema (@map("refreshTokens"))
    const loginsByDay = await this.prisma.$queryRaw<LoginAnalyticsRow[]>`
    SELECT 
      DATE("lastLogin") as date,
      COUNT(CASE WHEN "userId" IS NOT NULL THEN 1 END) as consumer_logins,
      COUNT(CASE WHEN "businessUserId" IS NOT NULL THEN 1 END) as business_logins,
      COUNT(CASE WHEN "influencerId" IS NOT NULL THEN 1 END) as influencer_logins,
      COUNT(*) as total_logins
    FROM "refreshTokens"
    WHERE "lastLogin" >= ${date}
    GROUP BY DATE("lastLogin")
    ORDER BY date DESC
  `;

    // Convert BigInt values to numbers for JSON serialization
    const serializedLoginsByDay: SerializedLoginAnalyticsRow[] =
      loginsByDay.map((day) => ({
        date: day.date,
        consumer_logins: Number(day.consumer_logins),
        business_logins: Number(day.business_logins),
        influencer_logins: Number(day.influencer_logins),
        total_logins: Number(day.total_logins),
      }));

    return {
      loginsByDay: serializedLoginsByDay,
      totalLoginsLast7Days: await this.prisma.refreshToken.count({
        where: {
          lastLogin: { gte: date },
        },
      }),
    };
  }

  async getRecentUsersAllTypes(limit = 10): Promise<RecentUserDto[]> {
    const recentUsers = await this.prisma.$queryRaw<RecentUserDto[]>`
    WITH
    -- Get only the most recent refresh token per consumer
    latest_consumer_login AS (
      SELECT DISTINCT ON ("userId")
        "userId",
        "lastLogin",
        device,
        "ipAddress"
      FROM "refreshTokens"
      WHERE "userId" IS NOT NULL
      ORDER BY "userId", "lastLogin" DESC
    ),

    -- Get only the most recent refresh token per business user
    latest_business_login AS (
      SELECT DISTINCT ON ("businessUserId")
        "businessUserId",
        "lastLogin",
        device,
        "ipAddress"
      FROM "refreshTokens"
      WHERE "businessUserId" IS NOT NULL
      ORDER BY "businessUserId", "lastLogin" DESC
    ),

    -- Get only the most recent refresh token per influencer
    latest_influencer_login AS (
      SELECT DISTINCT ON ("influencerId")
        "influencerId",
        "lastLogin",
        device,
        "ipAddress"
      FROM "refreshTokens"
      WHERE "influencerId" IS NOT NULL
      ORDER BY "influencerId", "lastLogin" DESC
    ),

    -- Get one business name per consumer (via businessClients)
    consumer_business AS (
      SELECT DISTINCT ON (bc."userId")
        bc."userId",
        b.name AS business_name
      FROM "businessClients" bc
      JOIN "businesses" b ON b.id = bc."businessId"
      ORDER BY bc."userId", bc."createdAt" DESC
    ),

    -- Get one business name per business user (via businessMembers)
    business_user_business AS (
      SELECT DISTINCT ON (bm."businessUserId")
        bm."businessUserId",
        b.name AS business_name
      FROM "businessMembers" bm
      JOIN "businesses" b ON b.id = bm."businessId"
      ORDER BY bm."businessUserId", bm."createdAt" DESC
    ),

    recent_activities AS (
      -- Consumers
      SELECT
        u.id,
        CONCAT(COALESCE(u."firstName", ''), ' ', COALESCE(u."lastName", '')) AS name,
        u.email,
        u.username,
        u."phoneNumber",
        lcl."lastLogin"    AS "lastLoginAt",
        lcl.device         AS "lastLoginDevice",
        lcl."ipAddress"    AS "lastLoginIp",
        cb.business_name   AS "businessName",
        u."createdAt",
        'consumer'::text   AS "userType"
      FROM "users" u
      LEFT JOIN latest_consumer_login lcl ON lcl."userId" = u.id
      LEFT JOIN consumer_business      cb  ON cb."userId"  = u.id

      UNION ALL

      -- Business Users
      SELECT
        bu.id,
        CONCAT(COALESCE(bu."firstName", ''), ' ', COALESCE(bu."lastName", '')) AS name,
        bu.email,
        bu.username,
        bu."phoneNumber",
        lbl."lastLogin"    AS "lastLoginAt",
        lbl.device         AS "lastLoginDevice",
        lbl."ipAddress"    AS "lastLoginIp",
        bub.business_name  AS "businessName",
        bu."createdAt",
        'business'::text   AS "userType"
      FROM "businessUsers" bu
      LEFT JOIN latest_business_login  lbl ON lbl."businessUserId" = bu.id
      LEFT JOIN business_user_business bub ON bub."businessUserId" = bu.id

      UNION ALL

      -- Influencers
      SELECT
        i.id,
        i.name,
        i.email,
        i.username,
        i."phoneNumber",
        lil."lastLogin"    AS "lastLoginAt",
        lil.device         AS "lastLoginDevice",
        lil."ipAddress"    AS "lastLoginIp",
        NULL               AS "businessName",
        i."createdAt",
        'influencer'::text AS "userType"
      FROM "influencers" i
      LEFT JOIN latest_influencer_login lil ON lil."influencerId" = i.id
    )

    SELECT *
    FROM recent_activities
    -- Users who have never logged in appear last; among those, newest accounts first
    ORDER BY "lastLoginAt" DESC NULLS LAST, "createdAt" DESC
    LIMIT ${limit}
  `;

    return recentUsers;
  }
}
