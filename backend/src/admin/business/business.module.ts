// admin-business.module.ts (or admin.module.ts)
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller.js';
import { BusinessService } from './business.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { StripeModule } from '../../stripe/stripe.module.js'; // Add this

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}