import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';

@UseGuards(AdminGuard)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getUserStats() {
    return this.metricsService.getUserMetrics();
  }
}

