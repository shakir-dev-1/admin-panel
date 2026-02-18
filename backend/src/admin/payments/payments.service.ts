/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  Prisma,
  TransactionStatus,
  TransactionPaymentStatus,
} from '../../generated/prisma/client.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  async getBusinesses() {
    const businesses = await this.prisma.business.findMany({
      include: {
        subscription: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!businesses.length) throw new NotFoundException('No businesses found');

    return businesses.map((business) => ({
      id: business.id,
      name: business.name,
      stripeAccountId: business.stripeAccountId,
      subscription: business.subscription[0]
        ? {
            id: business.subscription[0].id,
            orderId: business.subscription[0].orderId,
            status: business.subscription[0].status,
            billingCycle: business.subscription[0].billingCycle,
            startDate: business.subscription[0].startDate,
            endDate: business.subscription[0].endDate,
            plan: business.subscription[0].subscription?.title,
            paymentStatus: business.subscription[0].paymentStatus,
          }
        : null,
    }));
  }

  async getBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    return {
      id: business.id,
      name: business.name,
      stripeAccountId: business.stripeAccountId,
      subscription: business.subscription[0]
        ? {
            id: business.subscription[0].id,
            orderId: business.subscription[0].orderId,
            status: business.subscription[0].status,
            billingCycle: business.subscription[0].billingCycle,
            startDate: business.subscription[0].startDate,
            endDate: business.subscription[0].endDate,
            plan: business.subscription[0].subscription?.title,
            paymentStatus: business.subscription[0].paymentStatus,
            customerTransactionId:
              business.subscription[0].customerTransactionId,
          }
        : null,
    };
  }

  async getSubscription(businessId: string) {
    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: { businessId },
      include: {
        subscription: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!businessSub)
      throw new NotFoundException('No subscription found for this business');

    // If there's a Stripe subscription ID, get additional data from Stripe
    let stripeSubscription: Stripe.Response<Stripe.Subscription> | null = null;
    if (businessSub.orderId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          businessSub.orderId,
          {
            expand: ['plan.product'],
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe subscription: ${error.message}`,
        );
      }
    }

    return {
      ...businessSub,
      stripeSubscription,
    };
  }

  async getPayments(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    const transactions = await this.prisma.transaction.findMany({
      where: { businessId },
      include: {
        invoice: {
          include: {
            appointment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let stripePayments: Stripe.PaymentIntent[] = [];

    if (business.stripeAccountId) {
      try {
        const result = await this.stripe.paymentIntents.list(
          { limit: 100 },
          { stripeAccount: business.stripeAccountId },
        );

        stripePayments = result.data;
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe payments: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      transactions,
      stripePayments,
    };
  }

  async getFailedPayments(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Get failed transactions from database
    const failedTransactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        transactionStatus: TransactionStatus.FAILED,
      },
      include: {
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get failed payments from Stripe if applicable
    let stripeFailedPayments: Stripe.PaymentIntent[] = [];
    if (business.stripeAccountId) {
      try {
        const allPayments = await this.stripe.paymentIntents.list({
          limit: 100,
        });
        stripeFailedPayments = allPayments.data.filter(
          (pi) =>
            pi.status === 'requires_payment_method' || pi.status === 'canceled',
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe payments: ${error.message}`,
        );
      }
    }

    return {
      failedTransactions,
      stripeFailedPayments,
    };
  }

  async cancelSubscription(businessId: string) {
    this.logger.log(`Canceling subscription for business ID: ${businessId}`);

    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: { businessId },
    });

    if (!businessSub) throw new NotFoundException('Subscription not found');

    let stripeResult: Stripe.Response<Stripe.Subscription> | null = null;
    if (businessSub.orderId) {
      try {
        // Cancel in Stripe
        stripeResult = await this.stripe.subscriptions.cancel(
          businessSub.orderId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cancel Stripe subscription: ${error.message}`,
        );
        // Continue with database update even if Stripe fails
      }
    }

    // Update database
    const updatedSubscription = await this.prisma.businessSubscription.update({
      where: { id: businessSub.id },
      data: {
        status: 'CANCELLED',
        canceledDate: new Date(),
        cancelAtPeriodEnd: true,
        // Create history record
        history: {
          create: {
            eventType: 'CANCELLED',
            subscriptionId: businessSub.orderId || '',
            oldPlanId: businessSub.subscriptionId,
          },
        },
      },
    });

    return {
      success: true,
      subscription: updatedSubscription,
      stripeResult,
    };
  }

  async refundPayment(transactionId: string) {
    console.log(
      `[refundPayment] Starting refund for transaction: ${transactionId}`,
    );

    return this.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { business: true },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.transactionStatus !== TransactionStatus.PAID) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'INVALID_STATUS',
            message: `Cannot refund: transaction status is ${transaction.transactionStatus}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!transaction.invoiceId) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'NO_INVOICE',
            message: 'No invoice associated with this transaction',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: transaction.invoiceId },
      });

      if (!invoice?.stripePaymentIntentId) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'NO_PAYMENT_INTENT',
            message: 'No Stripe payment intent ID found for this transaction',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Process Stripe refund
      let refundResult: Stripe.Response<Stripe.Refund>;
      try {
        refundResult = await this.stripe.refunds.create({
          payment_intent: invoice.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
      } catch (error: any) {
        this.logger.error(`Failed to create Stripe refund: ${error.message}`);

        // Check for specific Stripe error types
        if (error.type === 'StripeInvalidRequestError') {
          if (error.code === 'resource_missing') {
            // This is the "No such payment_intent" error
            throw new HttpException(
              {
                statusCode: HttpStatus.BAD_REQUEST,
                error: 'PAYMENT_INTENT_NOT_FOUND',
                message:
                  'Payment intent not found in Stripe. The payment may have been processed in a different environment or deleted.',
                stripeMessage: error.message,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        // Check for other specific error codes
        if (error.code === 'charge_already_refunded') {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              error: 'ALREADY_REFUNDED',
              message: 'This payment has already been refunded.',
              stripeMessage: error.message,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        if (error.code === 'refund_amount_invalid') {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              error: 'INVALID_AMOUNT',
              message: 'The refund amount is invalid.',
              stripeMessage: error.message,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'STRIPE_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // If Stripe succeeded, update database
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          transactionStatus: TransactionStatus.FAILED,
          paymentStatus: TransactionPaymentStatus.REFUNDED,
          // stripeRefundId: refundResult.id,
        },
      });

      console.log(`[refundPayment] Successfully refunded transaction:`, {
        transactionId,
        refundId: refundResult.id,
      });

      return refundResult;
    });
  }

  async getDisputes(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Stripe doesn't store disputes in your DB, so we fetch from Stripe
    if (!business.stripeAccountId) {
      return [];
    }

    try {
      const disputes = await this.stripe.disputes.list({
        limit: 100,
      });
      return disputes.data;
    } catch (error) {
      this.logger.error(`Failed to retrieve disputes: ${error.message}`);
      return [];
    }
  }

  async getAllPayments(limit = 50, cursor?: string) {
    const where: Prisma.TransactionWhereInput = {};

    if (cursor) {
      const cursorTransaction = await this.prisma.transaction.findUnique({
        where: { id: cursor },
      });

      if (cursorTransaction) {
        where.createdAt = { lt: cursorTransaction.createdAt };
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            stripeAccountId: true,
          },
        },
        invoice: {
          include: {
            appointment: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    });

    // Format for frontend
    const formattedData = transactions.map((t) => ({
      id: t.id,
      amount: t.amountSent,
      refundAmount: t.amountReceived,
      currency: 'USD', // You might want to store currency in the transaction model
      status: t.transactionStatus,
      paymentStatus: t.paymentStatus,
      type: t.transactionType,
      businessId: t.businessId,
      businessName: t.business?.name,
      invoiceId: t.invoiceId,
      clientName: t.invoice?.appointment?.client?.fullName,
      clientPhone: t.invoice?.appointment?.client?.phoneNumber,
      createdAt: t.createdAt.toISOString(),
    }));

    const nextCursor =
      transactions.length > 0
        ? transactions[transactions.length - 1].id
        : undefined;

    return {
      data: formattedData,
      hasMore: transactions.length === limit,
      nextCursor,
    };
  }

  async getAllFailedPayments(limit = 50, cursor?: string) {
    const where: Prisma.TransactionWhereInput = {
      transactionStatus: TransactionStatus.FAILED,
    };

    if (cursor) {
      const cursorTransaction = await this.prisma.transaction.findUnique({
        where: { id: cursor },
      });

      if (cursorTransaction) {
        where.createdAt = { lt: cursorTransaction.createdAt };
      }
    }

    const failedTransactions = await this.prisma.transaction.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          include: {
            appointment: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    });

    const formattedData = failedTransactions.map((t) => ({
      id: t.id,
      amount: t.amountSent,
      businessId: t.businessId,
      businessName: t.business?.name,
      invoiceId: t.invoiceId,
      clientName: t.invoice?.appointment?.client?.fullName,
      error: 'Payment failed', // You might want to store error details
      createdAt: t.createdAt.toISOString(),
    }));

    const nextCursor =
      failedTransactions.length > 0
        ? failedTransactions[failedTransactions.length - 1].id
        : undefined;

    return {
      data: formattedData,
      hasMore: failedTransactions.length === limit,
      nextCursor,
    };
  }

  async getAllDisputes(limit = 50, starting_after?: string) {
    // Since disputes aren't stored in your DB, we fetch from Stripe
    try {
      const disputes = await this.stripe.disputes.list({
        limit,
        starting_after,
      });
      return disputes.data;
    } catch (error: any) {
      this.logger.error(`Failed to retrieve disputes: ${error.message}`);
      return [];
    }
  }

  async getAllRefunds(limit = 50, cursor?: string) {
    const where: Prisma.TransactionWhereInput = {
      paymentStatus: TransactionPaymentStatus.REFUNDED,
    };

    if (cursor) {
      const cursorTransaction = await this.prisma.transaction.findUnique({
        where: { id: cursor },
      });

      if (cursorTransaction) {
        where.createdAt = { lt: cursorTransaction.createdAt };
      }
    }

    const refundedTransactions = await this.prisma.transaction.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedData = refundedTransactions.map((t) => ({
      id: t.id,
      amount: t.amountSent,
      refundAmount: t.amountReceived,
      businessId: t.businessId,
      businessName: t.business?.name,
      status: t.transactionStatus,
      createdAt: t.createdAt.toISOString(),
    }));

    const nextCursor =
      refundedTransactions.length > 0
        ? refundedTransactions[refundedTransactions.length - 1].id
        : undefined;

    return {
      data: formattedData,
      hasMore: refundedTransactions.length === limit,
      nextCursor,
    };
  }

  async getGlobalPaymentStats() {
    const stats = await this.prisma.transaction.aggregate({
      _sum: {
        amountSent: true,
        amountReceived: true,
      },
      _count: {
        id: true,
      },
    });

    const succeededTotal = await this.prisma.transaction.aggregate({
      where: { transactionStatus: TransactionStatus.PAID },
      _sum: { amountSent: true },
    });

    const refundedTotal = await this.prisma.transaction.aggregate({
      where: { paymentStatus: TransactionPaymentStatus.REFUNDED },
      _sum: { amountReceived: true },
    });

    const failedCount = await this.prisma.transaction.count({
      where: { transactionStatus: TransactionStatus.FAILED },
    });

    const subscriptions = await this.prisma.businessSubscription.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      totalTransactions: stats._count.id,
      completedRevenue: (succeededTotal._sum.amountSent || 0) / 100, // Assuming cents
      totalVolume: (stats._sum.amountSent || 0) / 100,
      totalRefunded: (refundedTotal._sum.amountReceived || 0) / 100,
      failedTransactions: failedCount,
      subscriptionStats: subscriptions,
    };
  }

  async createPaymentIntent(
    businessId: string,
    amount: number,
    invoiceId: string,
  ) {
    console.log(
      `[createPaymentIntent] Creating test payment for business: ${businessId}, amount: ${amount}`,
    );

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Use a transaction to ensure all records are created or none
    return this.prisma.$transaction(async (prisma) => {
      // 1. Find or create a test client
      let client = await prisma.businessClient.findFirst({
        where: { businessId },
      });

      if (!client) {
        // Create a test client if none exists
        client = await prisma.businessClient.create({
          data: {
            businessId,
            fullName: 'Test Client',
            phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
            email: `test.client.${Date.now()}@example.com`,
            type: 'CLIENT',
          },
        });
        console.log(`[createPaymentIntent] Created test client: ${client.id}`);
      }

      // 2. Create a test appointment
      const appointment = await prisma.appointment.create({
        data: {
          start: new Date(),
          end: new Date(Date.now() + 3600000), // 1 hour later
          clientId: client.id,
          businessId,
          status: 'CREATED',
        },
      });
      console.log(
        `[createPaymentIntent] Created test appointment: ${appointment.id}`,
      );

      // 3. Create Stripe PaymentIntent with automatic confirmation methods
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          businessId,
          invoiceId,
          appointmentId: appointment.id,
        },
        // Add these for testing
        payment_method: 'pm_card_visa', // Stripe test payment method
        confirm: true, // Automatically confirm the payment
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Avoid redirects in test
        },
      });

      console.log(
        `[createPaymentIntent] Payment intent status: ${paymentIntent.status}`,
      );

      // 4. Create invoice with the appointment
      const invoice = await prisma.invoice.create({
        data: {
          id: invoiceId,
          appointmentId: appointment.id,
          businessId,
          amountDue: amount,
          amountPaid: paymentIntent.status === 'succeeded' ? amount : null,
          paymentMethod: 'ONLINE',
          paymentStatus:
            paymentIntent.status === 'succeeded' ? 'PAID' : 'UNPAID',
          prePayment: 0,
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      console.log(`[createPaymentIntent] Created invoice: ${invoice.id}`);

      // 5. Create transaction record with PAID status if successful
      const transaction = await prisma.transaction.create({
        data: {
          amountSent: amount,
          transactionType: 'PAY_IN',
          businessId,
          invoiceId: invoice.id,
          transactionStatus:
            paymentIntent.status === 'succeeded'
              ? TransactionStatus.PAID
              : TransactionStatus.CREATED,
          paymentStatus:
            paymentIntent.status === 'succeeded'
              ? TransactionPaymentStatus.PAID
              : TransactionPaymentStatus.UNPAID,
        },
      });
      console.log(
        `[createPaymentIntent] Created transaction: ${transaction.id} with status: ${transaction.transactionStatus}`,
      );

      return {
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id,
        invoiceId: invoice.id,
        appointmentId: appointment.id,
        status: paymentIntent.status,
      };
    });
  }
}
