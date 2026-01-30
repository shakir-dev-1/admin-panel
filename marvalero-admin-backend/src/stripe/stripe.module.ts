// stripe/stripe.module.ts (if you're keeping it separate)
import { Module, Global } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeSyncController } from './strip-sync.controller.js';
import { StripeSyncService } from './stripe-sync.service.js';


@Global() // Make it global so all modules can use it
@Module({
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      useFactory: () => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
        }
        return new Stripe(stripeKey, {
          apiVersion: '2025-12-15.clover', // Or '2023-10-16'
        });
      },
    },
    StripeSyncService,
  ],
  controllers: [StripeSyncController],
  exports: ['STRIPE_CLIENT'],
})
export class StripeModule {}