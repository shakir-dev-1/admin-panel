import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

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
        totalUsers -
        activeConsumers +
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
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({
        where: { isVerified: true },
      }),
      this.prisma.business.count({
        where: {
          subscription: {
            some: {
              status: 'ACTIVE',
            },
          },
        },
      }),
      // Fix: For one-to-many relations, use 'some' with a condition
      this.prisma.business.count({
        where: {
          payoutInfo: {
            some: {}, // At least one payout info exists
          },
        },
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
}
