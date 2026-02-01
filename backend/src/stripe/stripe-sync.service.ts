// src/admin/business/stripe-sync.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';

// Type helper for transaction status
type TransactionStatus =
  | 'succeeded'
  | 'requires_payment_method'
  | 'canceled'
  | 'processing'
  | 'requires_action'
  | 'requires_capture'
  | 'disputed'
  | 'refunded'
  | 'partially_refunded';

type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

@Injectable()
export class StripeSyncService {
  private readonly logger = new Logger(StripeSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  async syncRecentTransactions(days = 30, force = false) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

    let hasMore = true;
    let startingAfter: string | undefined;
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    try {
      while (hasMore) {
        // Fetch Charges instead of PaymentIntents for better refund data
        const params: Stripe.ChargeListParams = {
          limit: 100,
          created: { gte: cutoffTimestamp },
          expand: ['data.payment_intent', 'data.refunds.data'],
        };

        if (startingAfter) {
          params.starting_after = startingAfter;
        }

        const charges = await this.stripe.charges.list(params);

        console.log('Fetched charges data:', charges.data);

        for (const charge of charges.data) {
          const paymentIntentId =
            typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : charge.payment_intent?.id || charge.id;

          // ALWAYS process transactions when syncing (remove the skip logic)
          // The upsert will update if needed, create if new

          // Find business (optional)
          let businessId: string | null = null;
          if (charge.customer && typeof charge.customer === 'string') {
            const business = await this.prisma.business.findFirst({
              where: { stripeCustomerId: charge.customer },
            });
            if (business) {
              businessId = business.id;
            }
          }

          // Determine status from Charge and Refunds
          let displayStatus: TransactionStatus;
          let refundAmount = 0;

          // Check for refunds FIRST
          if (charge.refunded && charge.refunds?.data) {
            refundAmount = charge.refunds.data.reduce(
              (sum, refund) => sum + refund.amount,
              0,
            );
            if (refundAmount >= charge.amount) {
              displayStatus = 'refunded';
            } else if (refundAmount > 0) {
              displayStatus = 'partially_refunded';
            } else {
              displayStatus = charge.status as TransactionStatus;
            }
          }
          // Check for disputes
          else if (charge.disputed) {
            displayStatus = 'disputed';
          }
          // Use the charge status as a fallback
          else {
            displayStatus = charge.status as TransactionStatus;
          }

          // Prepare data
          const updateData: any = {
            status: displayStatus,
            amount: charge.amount,
            refundAmount,
            currency: charge.currency,
            description: charge.description || null,
            metadata: charge.metadata || null,
            lastSyncedAt: new Date(),
            syncedFromStripe: true,
          };

          const createData: any = {
            stripePaymentId: paymentIntentId, // Use the extracted ID
            amount: charge.amount,
            refundAmount,
            currency: charge.currency,
            status: displayStatus,
            description: charge.description || null,
            metadata: charge.metadata || null,
            userEmail: charge.receipt_email || null,
            userName:
              charge.billing_details?.name || charge.metadata?.userName || null,
            lastSyncedAt: new Date(),
            syncedFromStripe: true,
          };

          // Add business relation if found
          if (businessId) {
            updateData.business = { connect: { id: businessId } };
            createData.business = { connect: { id: businessId } };
          }

          // Upsert transaction
          try {
            const result = await this.prisma.transaction.upsert({
              where: { stripePaymentId: paymentIntentId }, // Use the extracted ID
              update: updateData,
              create: createData,
            });

            // Check if it was created or updated
            const timeDifference = Math.abs(
              result.createdAt.getTime() - result.updatedAt.getTime(),
            );
            if (timeDifference < 1000) {
              createdCount++;
            } else {
              updatedCount++;
            }

            syncedCount++;
          } catch (upsertError: any) {
            this.logger.error(
              `Error upserting transaction ${charge.id}:`,
              upsertError.message,
            );
            // Continue with next transaction
          }
        }

        hasMore = charges.has_more;
        if (charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id;
        }
      }

      await this.syncActiveSubscriptions();

      return {
        success: true,
        message: `Synced ${syncedCount} transactions and updated subscriptions (${createdCount} created, ${updatedCount} updated)`,
        syncedCount,
        createdCount,
        updatedCount,
      };
    } catch (error: any) {
      this.logger.error('Error syncing Stripe transactions:', error.message);
      throw error;
    }
  }

 async syncActiveSubscriptions() {
  try {
    let hasMore = true;
    let startingAfter: string | undefined;
    let updatedBusinesses = 0;

    this.logger.log('Starting subscription status sync...');

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        limit: 100,
        status: 'all',
        expand: ['data.customer'], // Only expand customer, not product
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const subscriptions = await this.stripe.subscriptions.list(params);

      for (const subscription of subscriptions.data) {
        // Get customer ID from expanded subscription
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) continue;

        // Find business by Stripe customer ID
        const business = await this.prisma.business.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!business) continue;

        // Get the first item (there should be at least one)
        const firstItem = subscription.items.data[0];
        let subscriptionPlan = 'Unknown Plan';

        if (firstItem?.plan) {
          // Use nickname if available
          if (firstItem.plan.nickname) {
            subscriptionPlan = firstItem.plan.nickname;
          } 
          // Otherwise, fetch the product to get its name
          else if (typeof firstItem.plan.product === 'string') {
            try {
              const product = await this.stripe.products.retrieve(
                firstItem.plan.product
              );
              subscriptionPlan = product.name;
            } catch (error) {
              this.logger.warn(
                `Could not fetch product ${firstItem.plan.product}: ${error.message}`
              );
              subscriptionPlan = firstItem.plan.id;
            }
          }
        }

        // Update business subscription status
        await this.prisma.business.update({
          where: { id: business.id },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionPlan,
          },
        });

        updatedBusinesses++;
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    this.logger.log(
      `Updated subscription status for ${updatedBusinesses} businesses`,
    );
    return { success: true, updatedBusinesses };
  } catch (error: any) {
    this.logger.error('Error syncing subscriptions:', error.message);
    throw error;
  }
}

async syncBusinessSubscription(businessId: string) {
  try {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business?.stripeCustomerId) {
      throw new Error('Business or Stripe customer ID not found');
    }

    // Get latest subscription for this customer
    const subscriptions = await this.stripe.subscriptions.list({
      customer: business.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription
      await this.prisma.business.update({
        where: { id: businessId },
        data: {
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          subscriptionPlan: null,
        },
      });
      return { success: true, status: 'no_subscription' };
    }

    const subscription = subscriptions.data[0];
    let subscriptionPlan = 'Unknown Plan';

    // Get the first item
    const firstItem = subscription.items.data[0];
    if (firstItem?.plan) {
      // Use nickname if available
      if (firstItem.plan.nickname) {
        subscriptionPlan = firstItem.plan.nickname;
      } 
      // Otherwise, fetch the product to get its name
      else if (typeof firstItem.plan.product === 'string') {
        try {
          const product = await this.stripe.products.retrieve(
            firstItem.plan.product
          );
          subscriptionPlan = product.name;
        } catch (error) {
          this.logger.warn(
            `Could not fetch product ${firstItem.plan.product}: ${error.message}`
          );
          subscriptionPlan = firstItem.plan.id;
        }
      }
    }

    // Update business with subscription info
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionPlan,
      },
    });

    return {
      success: true,
      status: subscription.status,
      plan: subscriptionPlan,
    };
  } catch (error: any) {
    this.logger.error(
      `Error syncing subscription for business ${businessId}:`,
      error.message,
    );
    throw error;
  }
}



  async fixStaleTransactions(hours = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    // Fix: Use correct Prisma syntax for null check
    const staleTransactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ lastSyncedAt: { lt: cutoffDate } }, { lastSyncedAt: undefined }],
      },
      take: 100,
    });

    const results = {
      checked: staleTransactions.length,
      updated: 0,
      errors: 0,
    };

    for (const transaction of staleTransactions) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          transaction.stripePaymentId,
        );

        let refundAmount = 0;
        let displayStatus: TransactionStatus =
          paymentIntent.status as TransactionStatus;

        if (paymentIntent.status === 'succeeded') {
          const refunds = await this.stripe.refunds.list({
            payment_intent: paymentIntent.id,
            limit: 10,
          });

          if (refunds.data.length > 0) {
            refundAmount = refunds.data.reduce(
              (sum, refund) => sum + refund.amount,
              0,
            );
            if (refundAmount >= paymentIntent.amount) {
              displayStatus = 'refunded';
            } else if (refundAmount > 0) {
              displayStatus = 'partially_refunded';
            }
          }
        }

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: displayStatus,
            amount: paymentIntent.amount,
            refundAmount,
            lastSyncedAt: new Date(),
          },
        });

        results.updated++;
      } catch (error: any) {
        this.logger.error(
          `Error fixing stale transaction ${transaction.stripePaymentId}:`,
          error.message,
        );
        results.errors++;
      }
    }

    await this.fixStaleSubscriptions(hours);

    return results;
  }

  async fixStaleSubscriptions(hours = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    // Find businesses with subscription status that hasn't been updated recently
    const staleBusinesses = await this.prisma.business.findMany({
      where: {
        AND: [
          { stripeCustomerId: { not: null } },
          { stripeSubscriptionId: { not: null } },
          {
            OR: [
              { subscriptionStatus: null },
            ],
          },
        ],
      },
      take: 50, // Limit to prevent rate limiting
    });

    const results = {
      checked: staleBusinesses.length,
      updated: 0,
      errors: 0,
    };

    for (const business of staleBusinesses) {
      try {
        await this.syncBusinessSubscription(business.id);
        results.updated++;
      } catch (error: any) {
        this.logger.error(
          `Error fixing stale subscription for business ${business.id}:`,
          error.message,
        );
        results.errors++;
      }
    }

    return results;
  }
}
