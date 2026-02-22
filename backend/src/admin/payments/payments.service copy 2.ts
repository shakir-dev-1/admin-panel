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
  PaymentStatus,
  SubscriptionStatus,
  BillingCycle,
} from '../../generated/prisma/client.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  // ─── Businesses ────────────────────────────────────────────────────────────

  async getBusinesses() {
    const businesses = await this.prisma.business.findMany({
      include: {
        subscription: {
          include: { subscription: true },
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
          include: { subscription: true },
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

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async getSubscription(businessId: string) {
    const businessSub = await this.prisma.businessSubscription.findFirst({
      where: { businessId },
      include: {
        subscription: true,
        history: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!businessSub)
      throw new NotFoundException('No subscription found for this business');

    let stripeSubscription: Stripe.Response<Stripe.Subscription> | null = null;
    if (businessSub.orderId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          businessSub.orderId,
          { expand: ['plan.product'] },
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe subscription: ${error.message}`,
        );
      }
    }

    return { ...businessSub, stripeSubscription };
  }

  /**
   * Returns all subscription plans with their prices and features.
   */
  async getAllSubscriptionPlans() {
    return this.prisma.subscription.findMany({
      include: {
        businessSubscriptions: {
          select: { id: true, status: true, billingCycle: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Returns all business subscriptions across the platform with optional
   * filtering by status or billing cycle.
   */
  async getAllBusinessSubscriptions(filters?: {
    status?: SubscriptionStatus;
    billingCycle?: BillingCycle;
    limit?: number;
    cursor?: string;
  }) {
    const { status, billingCycle, limit = 50, cursor } = filters ?? {};

    const where: Prisma.BusinessSubscriptionWhereInput = {};
    if (status) where.status = status;
    if (billingCycle) where.billingCycle = billingCycle;

    if (cursor) {
      const cursorRecord = await this.prisma.businessSubscription.findUnique({
        where: { id: cursor },
      });
      if (cursorRecord) {
        where.createdAt = { lt: cursorRecord.createdAt };
      }
    }

    const records = await this.prisma.businessSubscription.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { select: { id: true, title: true } },
        business: { select: { id: true, name: true, stripeAccountId: true } },
        history: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const nextCursor =
      records.length > 0 ? records[records.length - 1].id : undefined;

    return {
      data: records,
      hasMore: records.length === limit,
      nextCursor,
    };
  }

  /**
   * Returns the full subscription history for a given business subscription.
   */
  async getSubscriptionHistory(businessSubscriptionId: string) {
    const record = await this.prisma.businessSubscription.findUnique({
      where: { id: businessSubscriptionId },
      include: {
        subscription: true,
        history: { orderBy: { createdAt: 'desc' } },
        business: { select: { id: true, name: true } },
      },
    });

    if (!record) throw new NotFoundException('Business subscription not found');

    return record;
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
        stripeResult = await this.stripe.subscriptions.cancel(
          businessSub.orderId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cancel Stripe subscription: ${error.message}`,
        );
      }
    }

    const updatedSubscription = await this.prisma.businessSubscription.update({
      where: { id: businessSub.id },
      data: {
        status: 'CANCELLED',
        canceledDate: new Date(),
        cancelAtPeriodEnd: true,
        history: {
          create: {
            eventType: 'CANCELLED',
            subscriptionId: businessSub.orderId || '',
            oldPlanId: businessSub.subscriptionId,
          },
        },
      },
    });

    return { success: true, subscription: updatedSubscription, stripeResult };
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────

  /**
   * Returns all invoices for a given business, including appointment and
   * client details.
   */
  async getBusinessInvoices(
    businessId: string,
    filters?: {
      paymentStatus?: PaymentStatus;
      limit?: number;
      cursor?: string;
    },
  ) {
    const { paymentStatus, limit = 50, cursor } = filters ?? {};

    const where: Prisma.InvoiceWhereInput = { businessId };
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (cursor) {
      const cursorRecord = await this.prisma.invoice.findUnique({
        where: { id: cursor },
      });
      if (cursorRecord) {
        where.createdAt = { lt: cursorRecord.createdAt };
      }
    }

    const invoices = await this.prisma.invoice.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            client: true,
            businessService: true,
            businessPackage: true,
          },
        },
        transactions: true,
      },
    });

    const nextCursor =
      invoices.length > 0 ? invoices[invoices.length - 1].id : undefined;

    return {
      data: invoices,
      hasMore: invoices.length === limit,
      nextCursor,
    };
  }

  /**
   * Returns a single invoice by ID with full relational details.
   */
  async getInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        appointment: {
          include: { client: true, employee: true, business: true },
        },
        transactions: true,
        business: { select: { id: true, name: true, stripeAccountId: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return invoice;
  }

  /**
   * Returns aggregate invoice stats per business: total due, total paid, unpaid
   * count, etc.
   */
  async getInvoiceStats(businessId?: string) {
    const where: Prisma.InvoiceWhereInput = {};
    if (businessId) where.businessId = businessId;

    const [totalDue, totalPaid, byStatus] = await Promise.all([
      this.prisma.invoice.aggregate({
        where,
        _sum: { amountDue: true, amountPaid: true, tip: true },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.PAID },
        _sum: { amountPaid: true },
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
        _sum: { amountDue: true },
      }),
    ]);

    return {
      totalInvoices: totalDue._count.id,
      totalAmountDue: totalDue._sum.amountDue ?? 0,
      totalAmountPaid: totalDue._sum.amountPaid ?? 0,
      totalTips: totalDue._sum.tip ?? 0,
      paidCount: totalPaid._count.id,
      paidAmount: totalPaid._sum.amountPaid ?? 0,
      byStatus,
    };
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  async getPayments(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    const transactions = await this.prisma.transaction.findMany({
      where: { businessId },
      include: {
        invoice: { include: { appointment: true } },
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

    return { transactions, stripePayments };
  }

  async getFailedPayments(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    const failedTransactions = await this.prisma.transaction.findMany({
      where: { businessId, transactionStatus: TransactionStatus.FAILED },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });

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

    return { failedTransactions, stripeFailedPayments };
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
        business: { select: { id: true, name: true, stripeAccountId: true } },
        invoice: {
          include: {
            appointment: { include: { client: true } },
          },
        },
      },
    });

    const formattedData = transactions.map((t) => ({
      id: t.id,
      amount: t.amountSent,
      refundAmount: t.amountReceived,
      currency: 'USD',
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
        business: { select: { id: true, name: true } },
        invoice: {
          include: {
            appointment: { include: { client: true } },
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
      error: 'Payment failed',
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
        business: { select: { id: true, name: true } },
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

  async refundPayment(transactionId: string) {
    this.logger.log(`Starting refund for transaction: ${transactionId}`);

    return this.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { business: true },
      });

      if (!transaction) throw new NotFoundException('Transaction not found');

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

      let refundResult: Stripe.Response<Stripe.Refund>;
      try {
        refundResult = await this.stripe.refunds.create({
          payment_intent: invoice.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
      } catch (error: any) {
        this.logger.error(`Failed to create Stripe refund: ${error.message}`);

        if (error.type === 'StripeInvalidRequestError') {
          if (error.code === 'resource_missing') {
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

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          transactionStatus: TransactionStatus.FAILED,
          paymentStatus: TransactionPaymentStatus.REFUNDED,
        },
      });

      this.logger.log(
        `Successfully refunded transaction ${transactionId}, refund ID: ${refundResult.id}`,
      );

      return refundResult;
    });
  }

  // ─── Payout Info ───────────────────────────────────────────────────────────

  /**
   * Returns the payout bank account info for a business, masking sensitive
   * fields (CNIC, MSISDN, account number) since they are stored encrypted.
   */
  async getBusinessPayoutInfo(businessId: string) {
    const info = await this.prisma.businessPayoutInfo.findUnique({
      where: { businessId },
      include: { bank: true },
    });

    if (!info) throw new NotFoundException('Payout info not found');

    return {
      id: info.id,
      businessId: info.businessId,
      bank: info.bank,
      accountTitle: info.accountTitle,
      countryCode: info.countryCode,
      // Encrypted fields are returned as-is for admin; decryption happens in
      // dedicated secure endpoints, not here.
      msisdn: info.msisdn,
      cnic: info.cnic,
      accountNumber: info.accountNumber,
    };
  }

  /**
   * Returns all payout info records across the platform with bank details.
   */
  async getAllPayoutInfo(limit = 50, cursor?: string) {
    const where: Prisma.BusinessPayoutInfoWhereInput = {};

    if (cursor) {
      const cursorRecord = await this.prisma.businessPayoutInfo.findUnique({
        where: { id: cursor },
      });
      if (cursorRecord) {
        where.id = { gt: cursorRecord.id };
      }
    }

    const records = await this.prisma.businessPayoutInfo.findMany({
      take: limit,
      where,
      include: {
        bank: true,
        business: { select: { id: true, name: true } },
      },
    });

    const nextCursor =
      records.length > 0 ? records[records.length - 1].id : undefined;

    return {
      data: records,
      hasMore: records.length === limit,
      nextCursor,
    };
  }

  /**
   * Returns all banks available for payout configuration.
   */
  async getBanks() {
    return this.prisma.bank.findMany({ orderBy: { bankName: 'asc' } });
  }

  // ─── Add-Ons ───────────────────────────────────────────────────────────────

  /**
   * Returns all business add-ons (e.g. EMPLOYEE, LOCATION) across the platform.
   */
  async getAllAddOns(limit = 50, cursor?: string) {
    const where: Prisma.BusinessAddOnWhereInput = {};

    if (cursor) {
      const cursorRecord = await this.prisma.businessAddOn.findUnique({
        where: { id: cursor },
      });
      if (cursorRecord) {
        where.createdAt = { lt: cursorRecord.createdAt };
      }
    }

    const addOns = await this.prisma.businessAddOn.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        purchaseBy: {
          include: {
            businessUser: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
    });

    const nextCursor =
      addOns.length > 0 ? addOns[addOns.length - 1].id : undefined;

    return {
      data: addOns,
      hasMore: addOns.length === limit,
      nextCursor,
    };
  }

  /**
   * Returns add-ons for a specific business.
   */
  async getBusinessAddOns(businessId: string) {
    return this.prisma.businessAddOn.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseBy: {
          include: {
            businessUser: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
    });
  }

  // ─── Disputes ──────────────────────────────────────────────────────────────

  async getDisputes(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    if (!business.stripeAccountId) return [];

    try {
      const disputes = await this.stripe.disputes.list({ limit: 100 });
      return disputes.data;
    } catch (error) {
      this.logger.error(`Failed to retrieve disputes: ${error.message}`);
      return [];
    }
  }

  async getAllDisputes(limit = 50, starting_after?: string) {
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

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getGlobalPaymentStats() {
    const [
      stats,
      succeededTotal,
      refundedTotal,
      failedCount,
      subscriptions,
      addOnStats,
      invoiceStats,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amountSent: true, amountReceived: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: { transactionStatus: TransactionStatus.PAID },
        _sum: { amountSent: true },
      }),
      this.prisma.transaction.aggregate({
        where: { paymentStatus: TransactionPaymentStatus.REFUNDED },
        _sum: { amountReceived: true },
      }),
      this.prisma.transaction.count({
        where: { transactionStatus: TransactionStatus.FAILED },
      }),
      this.prisma.businessSubscription.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Add-on revenue
      this.prisma.businessAddOn.groupBy({
        by: ['status'],
        _count: true,
        _sum: { price: true },
      }),
      // Invoice payment method breakdown
      this.prisma.invoice.groupBy({
        by: ['paymentMethod'],
        _count: true,
        _sum: { amountDue: true, amountPaid: true },
      }),
    ]);

    return {
      totalTransactions: stats._count.id,
      completedRevenue: (succeededTotal._sum.amountSent ?? 0) / 100,
      totalVolume: (stats._sum.amountSent ?? 0) / 100,
      totalRefunded: (refundedTotal._sum.amountReceived ?? 0) / 100,
      failedTransactions: failedCount,
      subscriptionStats: subscriptions,
      addOnStats,
      invoiceStats,
    };
  }

  // ─── Clients ───────────────────────────────────────────────────────────────

  async getBusinessClients(businessId: string) {
    const clients = await this.prisma.businessClient.findMany({
      where: { businessId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return clients;
  }

  // ─── Payment Intent (test / admin) ─────────────────────────────────────────

  async createPaymentIntent(
    businessId: string,
    amount: number,
    invoiceId: string,
    clientId?: string,
  ) {
    this.logger.log(
      `Creating test payment for business: ${businessId}, amount: ${amount}`,
    );

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException('Business not found');

    return this.prisma.$transaction(async (prisma) => {
      let client;

      if (clientId) {
        client = await prisma.businessClient.findFirst({
          where: { id: clientId, businessId },
        });
        if (!client) throw new Error('Client not found for this business');
      } else {
        client = await prisma.businessClient.findFirst({
          where: { businessId },
        });

        if (!client) {
          client = await prisma.businessClient.create({
            data: {
              businessId,
              fullName: 'Test Client',
              phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
              email: `test.client.${Date.now()}@example.com`,
              type: 'CLIENT',
            },
          });
          this.logger.log(`Created test client: ${client.id}`);
        }
      }

      const appointment = await prisma.appointment.create({
        data: {
          start: new Date(),
          end: new Date(Date.now() + 3600000),
          clientId: client.id,
          businessId,
          status: 'CREATED',
        },
      });
      this.logger.log(`Created test appointment: ${appointment.id}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: {
          businessId,
          invoiceId,
          appointmentId: appointment.id,
          clientId: client.id,
          clientName: client.fullName,
        },
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      this.logger.log(`Payment intent status: ${paymentIntent.status}`);

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
      this.logger.log(`Created invoice: ${invoice.id}`);

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
      this.logger.log(
        `Created transaction: ${transaction.id} with status: ${transaction.transactionStatus}`,
      );

      return {
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id,
        invoiceId: invoice.id,
        appointmentId: appointment.id,
        clientId: client.id,
        clientName: client.fullName,
        status: paymentIntent.status,
      };
    });
  }
}
