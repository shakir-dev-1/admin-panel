import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
// import { APP_GUARD } from '@nestjs/core';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessController } from './business/business.controller.js';
import { BusinessService } from './business/business.service.js';
import { BusinessModule } from './business/business.module.js';

@Module({
  imports: [BusinessModule],

  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: AdminGuard,
    // },
    AdminService,
    PrismaService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
