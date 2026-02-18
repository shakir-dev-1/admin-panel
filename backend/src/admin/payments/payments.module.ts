// admin-business.module.ts (or admin.module.ts)
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
// import { StripeModule } from '../../stripe/stripe.module.js'; // Add this

@Module({
  imports: [PrismaModule],
  // StripeModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
