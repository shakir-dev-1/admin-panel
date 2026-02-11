import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { APP_GUARD } from '@nestjs/core';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersModule } from './users/users.module.js';
// import { BusinessController } from './business/business.controller.js';
// import { BusinessService } from './business/business.service.js';
import { BusinessUsersModule } from './business-users/business-users.module.js';
import { InfluencersModule } from './influencers/influencers.module.js';

@Module({
  imports: [UsersModule, BusinessUsersModule, InfluencersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
    AdminService,
    PrismaService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
