// admin-business.module.ts (or admin.module.ts)
import { Module } from '@nestjs/common';
import { BusinessUsersController } from './business-users.controller.js';
import { BusinessUsersService } from './business-users.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
// import { StripeModule } from '../../stripe/stripe.module.js'; // Add this

@Module({
  imports: [PrismaModule],
  // StripeModule],
  controllers: [BusinessUsersController],
  providers: [BusinessUsersService],
})
export class BusinessUsersModule {}
