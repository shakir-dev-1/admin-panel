// meetrics.module.ts
import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';
// import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [/*PrismaModule*/],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}