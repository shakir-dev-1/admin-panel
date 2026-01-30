import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Fixed Import
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { MetricsModule } from './admin/metrics/metrics.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AuditModule } from './audit/audit.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AdminService } from './admin/admin.service.js';
import { TestModule } from './test/test.module.js';
import { StripeModule } from './stripe/stripe.module.js';

@Module({
  imports: [
    // 1. Initialize Config first so it's available to other modules
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Async Throttler setup to read from .env in production
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') || 60000,
          limit: config.get<number>('THROTTLE_LIMIT') || 60,
        },
      ],
    }),
    
    StripeModule,
    AuthModule,
    MetricsModule,
    AdminModule,
    AuditModule,    
    TestModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService, 
    AdminService, 
    {
      provide: APP_GUARD,    
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}