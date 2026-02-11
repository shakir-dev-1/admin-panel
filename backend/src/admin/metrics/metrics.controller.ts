import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { MetricsService, LoginAnalyticsResponse } from './metrics.service.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';

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
}
