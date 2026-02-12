import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { MetricsService, LoginAnalyticsResponse } from './metrics.service.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { RecentUserDto } from '../dto/recent-user.dto.js';

@UseGuards(AdminGuard)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getUserStats() {
    return this.metricsService.getUserMetrics();
  }

  @Get('business')
  getBusinessMetrics() {
    return this.metricsService.getBusinessMetrics();
  }

  @Get('logins')
  getLoginAnalytics(
    @Query('days') days?: string,
  ): Promise<LoginAnalyticsResponse> {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.metricsService.getLoginAnalytics(daysNumber);
  }

  @Get('all')
  async getAllMetrics() {
    const [userMetrics, businessMetrics] = await Promise.all([
      this.metricsService.getUserMetrics(),
      this.metricsService.getBusinessMetrics(),
    ]);

    return {
      ...userMetrics,
      business: businessMetrics,
    };
  }

  @Get('users/recent')
  getRecentUsersAllTypes(
    @Query('limit') limit?: string,
  ): Promise<RecentUserDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.metricsService.getRecentUsersAllTypes(parsedLimit);
  }
}
