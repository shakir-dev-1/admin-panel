import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserMetrics() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // FIRST, check what enum values you actually have
    console.log('Checking database state...');

    const [
      totalUsers,
      businessUsers,
      consumerUsers,
      influencerUsers,
      activeUsers,
      inactiveUsers,
      dailyLogins,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.count({
        where: { userType: 'BUSINESS' },
      }),
      this.prisma.user.count({
        where: { userType: 'CONSUMER' },
      }),
      this.prisma.user.count({
        where: { userType: 'INFLUENCER' },
      }),

      this.prisma.user.count({
        where: { status: 'ACTIVE' },
      }),

      this.prisma.user.count({
        where: { status: { not: 'ACTIVE' } },
      }),

      this.prisma.user.count({
        where: { lastLoginAt: { gte: startOfDay } },
      }),
    ]);

    // Get user type distribution dynamically
    const userTypes = await this.prisma.user.groupBy({
      by: ['userType'],
      _count: true,
    });

    console.log('Current user types in DB:', userTypes);

    return {
      totalUsers,
      businessUsers,
      consumerUsers, 
      influencerUsers, 
      activeUsers,
      inactiveUsers,
      dailyLogins,
      userTypeDistribution: userTypes,
    };
  }
}
