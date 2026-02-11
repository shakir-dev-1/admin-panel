import { Module } from '@nestjs/common';
import { InfluencersService } from './influencers.service.js';
import { InfluencersController } from './influencers.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Module({
  providers: [InfluencersService, PrismaService],
  controllers: [InfluencersController],
})
export class InfluencersModule {}
