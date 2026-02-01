// src/stripe/stripe-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.refunded':
          await this.handleRefundCreated(event.data.object as Stripe.Charge);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        // Add more webhook handlers as needed
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook ${event.type}:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    await this.upsertTransaction(paymentIntent);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.upsertTransaction(paymentIntent);
  }

  private async handleRefundCreated(charge: Stripe.Charge) {
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
      const totalRefunded = charge.refunds?.data.reduce((sum, refund) => sum + refund.amount, 0) || 0;
      
      await this.prisma.transaction.upsert({
        where: { stripePaymentId: charge.payment_intent },
        update: {
          status: totalRefunded >= charge.amount ? 'refunded' : 'partially_refunded',
          refundAmount: totalRefunded,
          lastSyncedAt: new Date(),
        },
        create: {
          // If transaction doesn't exist, create it with minimal data
          stripePaymentId: charge.payment_intent,
          amount: charge.amount,
          currency: charge.currency,
          status: totalRefunded >= charge.amount ? 'refunded' : 'partially_refunded',
          refundAmount: totalRefunded,
          metadata: charge.metadata,
          lastSyncedAt: new Date(),
          // You'll need to fetch businessId from somewhere, possibly from metadata
          businessId: charge.metadata?.businessId || 'unknown',
        },
      });
    }
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    if (dispute.payment_intent && typeof dispute.payment_intent === 'string') {
      await this.prisma.transaction.update({
        where: { stripePaymentId: dispute.payment_intent },
        data: {
          status: 'disputed',
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  private async upsertTransaction(paymentIntent: Stripe.PaymentIntent) {
    // Find business by customer ID
    let businessId = 'unknown';
    if (paymentIntent.customer && typeof paymentIntent.customer === 'string') {
      const business = await this.prisma.business.findFirst({
        where: { stripeCustomerId: paymentIntent.customer },
      });
      if (business) {
        businessId = business.id;
      }
    }

    await this.prisma.transaction.upsert({
      where: { stripePaymentId: paymentIntent.id },
      update: {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        lastSyncedAt: new Date(),
        syncedFromStripe: true,
      },
      create: {
        stripePaymentId: paymentIntent.id,
        businessId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        userEmail: paymentIntent.receipt_email,
        userName: paymentIntent.metadata?.userName,
        lastSyncedAt: new Date(),
        syncedFromStripe: true,
      },
    });
  }
}