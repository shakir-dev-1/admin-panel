/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
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

import { CreateSubscriptionDto } from '../dto/create-subscription.dto.js';

// Define interfaces for the price structure
export interface SubscriptionPrice {
  amount: number;
  currency: string;
  interval: 'month' | 'year' | 'MONTH' | 'YEAR';
  price?: number; // Some might use 'price' instead of 'amount'
  [key: string]: any; // Allow additional fields
}

// Add this interface before the PaymentsService class
export interface CreateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    businessId: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: BillingCycle;
    startDate: Date | null;
    endDate: Date | null;
    stripeSubscriptionId: string | null;
    amount: number;
    currency: string;
  };
  stripeData: Stripe.Response<Stripe.Subscription> | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  private formatPrice(price: SubscriptionPrice | null | undefined): string {
    if (!price) return 'N/A';

    const amount = (price.amount || price.price || 0) / 100;
    const currency = price.currency || 'USD';
    const interval = price.interval || 'month';

    // Format based on interval
    if (interval === 'year' || interval === 'YEAR') {
      return `${currency} ${amount}/year (${currency} ${(amount / 12).toFixed(2)}/month)`;
    }

    return `${currency} ${amount}/${interval}`;
  }

  private parsePrices(pricesJson: Prisma.JsonValue): SubscriptionPrice[] {
    if (!pricesJson) return [];

    try {
      // Handle both stringified JSON and parsed JSON
      const prices =
        typeof pricesJson === 'string' ? JSON.parse(pricesJson) : pricesJson;

      if (Array.isArray(prices)) {
        return prices as SubscriptionPrice[];
      }

      // If it's a single price object, wrap in array
      if (prices && typeof prices === 'object') {
        return [prices as SubscriptionPrice];
      }

      return [];
    } catch (e) {
      this.logger.error(`Failed to parse prices: ${e.message}`);
      return [];
    }
  }

  private findPriceByBillingCycle(
    prices: SubscriptionPrice[],
    billingCycle?: BillingCycle | null,
  ): SubscriptionPrice | null {
    if (!prices.length || !billingCycle) return prices[0] || null;

    const cycle = billingCycle.toString().toLowerCase();

    const matchedPrice = prices.find(
      (p) => p.interval?.toLowerCase() === cycle,
    );

    return matchedPrice || prices[0] || null;
  }

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
            customerTransactionId:
              business.subscription[0].customerTransactionId,
            // Add parsed prices
            prices: this.parsePrices(
              business.subscription[0].subscription?.prices,
            ),
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
            // Add parsed prices
            prices: this.parsePrices(
              business.subscription[0].subscription?.prices,
            ),
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
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!businessSub)
      throw new NotFoundException('No subscription found for this business');

    // Parse subscription prices
    const prices = this.parsePrices(businessSub.subscription?.prices);
    const currentPrice = this.findPriceByBillingCycle(
      prices,
      businessSub.billingCycle,
    );

    let stripeSubscription: Stripe.Response<Stripe.Subscription> | null = null;
    if (businessSub.orderId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          businessSub.orderId,
          { expand: ['plan.product', 'items.data.price'] },
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve Stripe subscription: ${error.message}`,
        );
      }
    }

    return {
      ...businessSub,
      subscription: businessSub.subscription
        ? {
            ...businessSub.subscription,
            prices, // All available prices
            currentPrice, // The price matching current billing cycle
          }
        : null,
      stripeSubscription,
      // Add calculated fields
      monthlyPrice:
        prices.find((p) => p.interval?.toLowerCase() === 'month')?.amount ||
        prices.find((p) => p.interval?.toLowerCase() === 'month')?.price,
      yearlyPrice:
        prices.find((p) => p.interval?.toLowerCase() === 'year')?.amount ||
        prices.find((p) => p.interval?.toLowerCase() === 'year')?.price,
    };
  }

  async getAllSubscriptionPlans() {
    const plans = await this.prisma.subscription.findMany({
      include: {
        businessSubscriptions: {
          select: {
            id: true,
            status: true,
            billingCycle: true,
            businessId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Parse and format prices for each plan
    return plans.map((plan) => {
      const prices = this.parsePrices(plan.prices);

      return {
        ...plan,
        prices: prices.map((price) => ({
          ...price,
          // Ensure price is in a consistent format
          amount: price.amount || price.price,
          currency: price.currency || 'USD',
          interval: price.interval || 'month',
        })),
        // Also provide formatted display strings
        displayPrices: prices.map((p) => this.formatPrice(p)),
      };
    });
  }

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
        subscription: {
          select: {
            id: true,
            title: true,
            prices: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            stripeAccountId: true,
            email: true,
            members: {
              where: { role: { name: 'OWNER' } },
              take: 1,
              select: {
                businessUser: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Enhance each record with price information
    const enhancedRecords = records.map((record) => {
      const prices = this.parsePrices(record.subscription?.prices);
      const currentPrice = this.findPriceByBillingCycle(
        prices,
        record.billingCycle,
      );

      return {
        ...record,
        subscription: record.subscription
          ? {
              ...record.subscription,
              prices, // All prices
            }
          : null,
        currentPrice, // Price for current billing cycle
        priceAmount: currentPrice
          ? currentPrice.amount || currentPrice.price || 0
          : null,
        priceCurrency: currentPrice?.currency || 'USD',
        priceInterval:
          currentPrice?.interval || record.billingCycle?.toLowerCase(),
        formattedPrice: currentPrice ? this.formatPrice(currentPrice) : null,
      };
    });

    const nextCursor =
      records.length > 0 ? records[records.length - 1].id : undefined;

    return {
      data: enhancedRecords,
      hasMore: records.length === limit,
      nextCursor,
    };
  }

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

    // Add price information
    const prices = this.parsePrices(record.subscription?.prices);
    const currentPrice = this.findPriceByBillingCycle(
      prices,
      record.billingCycle,
    );

    return {
      ...record,
      prices,
      currentPrice,
      formattedPrice: currentPrice ? this.formatPrice(currentPrice) : null,
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

  // ─── Consumer Payments (User → Business via Appointment) ───────────────────

  async getConsumerPayments(limit = 50, cursor?: string) {
    this.logger.log(
      `Fetching consumer payments with limit: ${limit}, cursor: ${cursor}`,
    );

    // Pagination setup — same as before
    const where: Prisma.TransactionWhereInput = {};

    if (cursor) {
      const cur = await this.prisma.transaction.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cur) {
        where.createdAt = { lt: cur.createdAt };
      }
    }

    // Fetch transactions
    const transactions = await this.prisma.transaction.findMany({
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        invoice: {
          select: {
            id: true,
            stripePaymentIntentId: true, // ← Stripe ID added here
            appointment: {
              include: {
                client: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        username: true,
                      },
                    },
                  },
                },
                businessService: {
                  select: {
                    id: true,
                    price: true,
                    service: { select: { title: true } },
                  },
                },
                businessPackage: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Found ${transactions.length} transactions`);

    const filteredTransactions = transactions.filter(
      (t) => t.invoice?.appointment?.client != null,
    );

    this.logger.log(
      `Filtered transactions with client data: ${filteredTransactions.length}`,
    );

    const data = filteredTransactions.map((t) => {
      const client = t.invoice?.appointment?.client;
      const user = client?.user;

      return {
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
        stripePaymentIntentId: t.invoice?.stripePaymentIntentId ?? null, // ← included
        userId: user?.id ?? client?.userId ?? null,
        consumerEmail: user?.email ?? client?.email ?? null,
        consumerName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            client?.fullName
          : (client?.fullName ?? null),
        consumerPhone: user?.phoneNumber ?? client?.phoneNumber ?? null,
        consumerUsername: user?.username ?? null,
        serviceName:
          t.invoice?.appointment?.businessService?.service?.title ?? null,
        packageName: t.invoice?.appointment?.businessPackage?.title ?? null,
        appointmentStart: t.invoice?.appointment?.start?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      };
    });

    const nextCursor =
      transactions.length > 0
        ? transactions[transactions.length - 1].id
        : undefined;

    return {
      data,
      hasMore: transactions.length === limit,
      nextCursor,
    };
  }

  async getConsumerPaymentStats() {
    // Define the base condition for consumer payments
    const consumerPaymentCondition = {
      invoice: {
        appointment: {
          client: {
            isNot: undefined,
          },
        },
      },
    };

    const [
      total,
      completed,
      refundedTransactions,
      failed,
      byPaymentStatus,
      byMethod,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: consumerPaymentCondition,
        _count: { id: true },
        _sum: { amountSent: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...consumerPaymentCondition,
          transactionStatus: TransactionStatus.PAID,
        },
        _sum: { amountSent: true },
        _count: { id: true },
      }),
      // Get all refunded transactions to calculate actual refund amount
      this.prisma.transaction.findMany({
        where: {
          ...consumerPaymentCondition,
          paymentStatus: TransactionPaymentStatus.REFUNDED,
        },
        select: {
          amountSent: true,
          amountReceived: true,
        },
      }),
      this.prisma.transaction.count({
        where: {
          ...consumerPaymentCondition,
          transactionStatus: TransactionStatus.FAILED,
        },
      }),
      this.prisma.transaction.groupBy({
        by: ['paymentStatus'],
        where: consumerPaymentCondition,
        _count: true,
        _sum: { amountSent: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['paymentMethod'],
        where: {
          appointment: {
            client: {
              isNot: undefined,
            },
          },
        },
        _count: true,
        _sum: { amountDue: true, amountPaid: true },
      }),
    ]);

    // Calculate total refunded amount (amountSent - amountReceived)
    const totalRefunded = refundedTransactions.reduce(
      (sum, t) => sum + (t.amountSent - t.amountReceived),
      0,
    );

    return {
      totalTransactions: total._count.id,
      totalVolume: total._sum.amountSent ?? 0,
      completedRevenue: completed._sum.amountSent ?? 0,
      completedCount: completed._count.id,
      totalRefunded: totalRefunded,
      refundedCount: refundedTransactions.length,
      failedTransactions: failed,
      byPaymentStatus,
      byMethod,
    };
  }

  // ─── BusinessUser Payments (Business → Platform) ───────────────────────────

  async getBusinessUserPayments(
    limit = 50,
    cursor?: string,
    type: 'all' | 'subscription' | 'addon' = 'all',
  ) {
    // Fetch subscriptions and/or add-ons in parallel, then merge & sort
    const [subs, addons] = await Promise.all([
      type !== 'addon'
        ? this.prisma.businessSubscription.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
              subscription: { select: { id: true, title: true, prices: true } },
              business: {
                select: {
                  id: true,
                  name: true,
                  members: {
                    include: {
                      businessUser: {
                        select: {
                          id: true,
                          email: true,
                          fullName: true,
                          phoneNumber: true,
                        },
                      },
                    },
                  },
                },
              },
              history: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          })
        : Promise.resolve([]),

      type !== 'subscription'
        ? this.prisma.businessAddOn.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  members: {
                    include: {
                      businessUser: {
                        select: {
                          id: true,
                          email: true,
                          fullName: true,
                          phoneNumber: true,
                        },
                      },
                    },
                  },
                },
              },
              purchaseBy: {
                include: {
                  businessUser: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      phoneNumber: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    // Helper function to get the first business user from members
    const getFirstBusinessUser = (business: any) => {
      if (business?.members && business.members.length > 0) {
        return business.members[0]?.businessUser || null;
      }
      return null;
    };

    // Normalise to a unified shape
    type UnifiedEntry = {
      id: string;
      entryType: 'subscription' | 'addon';
      businessId: string;
      businessName: string;
      businessUserEmail: string | null;
      businessUserName: string | null;
      businessUserPhone: string | null;
      businessUserId: string | null;
      description: string;
      amount: number | null;
      currency: string;
      status: string;
      billingCycle?: string;
      paymentStatus?: string | null;
      createdAt: string;
      priceInfo?: any; // Add price info for subscriptions
    };

    const unified: UnifiedEntry[] = [
      ...subs.map((s) => {
        const businessUser = getFirstBusinessUser(s.business);
        const prices = this.parsePrices(s.subscription?.prices);
        const currentPrice = this.findPriceByBillingCycle(
          prices,
          s.billingCycle,
        );

        return {
          id: s.id,
          entryType: 'subscription' as const,
          businessId: s.businessId,
          businessName: s.business?.name ?? '—',
          businessUserEmail: businessUser?.email ?? null,
          businessUserName: businessUser?.fullName ?? null,
          businessUserPhone: businessUser?.phoneNumber ?? null,
          businessUserId: businessUser?.id ?? null,
          description: s.subscription?.title ?? 'Subscription',
          amount: currentPrice
            ? currentPrice.amount || currentPrice.price || 0
            : null,
          currency: currentPrice?.currency || 'USD',
          status: s.status,
          billingCycle: s.billingCycle,
          paymentStatus: s.paymentStatus,
          createdAt: s.createdAt.toISOString(),
          priceInfo: currentPrice,
        };
      }),
      ...addons.map((a) => {
        const businessUser =
          a.purchaseBy?.businessUser || getFirstBusinessUser(a.business);
        return {
          id: a.id,
          entryType: 'addon' as const,
          businessId: a.businessId,
          businessName: a.business?.name ?? '—',
          businessUserEmail: businessUser?.email ?? null,
          businessUserName: businessUser?.fullName ?? null,
          businessUserPhone: businessUser?.phoneNumber ?? null,
          businessUserId: businessUser?.id ?? null,
          description: `${a.type} Add-On`,
          amount: a.price,
          currency: a.currency,
          status: a.status,
          billingCycle: undefined,
          paymentStatus: undefined,
          createdAt: a.createdAt.toISOString(),
        };
      }),
    ];

    // Sort merged list by createdAt desc
    unified.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    let startIdx = 0;
    if (cursor) {
      const idx = unified.findIndex((e) => e.id === cursor);
      if (idx !== -1) startIdx = idx + 1;
    }

    const page = unified.slice(startIdx, startIdx + limit);
    const nextCursor =
      page.length === limit ? page[page.length - 1].id : undefined;

    return {
      data: page,
      hasMore: page.length === limit,
      nextCursor,
    };
  }

  async getBusinessUserPaymentStats() {
    const [subByStatus, subTotal, addonByStatus, addonByType, addonTotal] =
      await Promise.all([
        this.prisma.businessSubscription.groupBy({
          by: ['status'],
          _count: true,
        }),
        this.prisma.businessSubscription.count(),
        this.prisma.businessAddOn.groupBy({
          by: ['status'],
          _count: true,
          _sum: { price: true },
        }),
        this.prisma.businessAddOn.groupBy({
          by: ['type'],
          _count: true,
          _sum: { price: true },
        }),
        this.prisma.businessAddOn.aggregate({
          _sum: { price: true },
          _count: { id: true },
        }),
      ]);

    // Get subscription revenue by plan
    const subscriptions = await this.prisma.businessSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        subscription: { select: { id: true, title: true, prices: true } },
      },
    });

    let monthlyRecurringRevenue = 0;
    subscriptions.forEach((sub) => {
      const prices = this.parsePrices(sub.subscription?.prices);
      const price = this.findPriceByBillingCycle(prices, sub.billingCycle);
      if (price) {
        const amount = price.amount || price.price || 0;
        if (sub.billingCycle === 'YEAR') {
          monthlyRecurringRevenue += amount / 12;
        } else {
          monthlyRecurringRevenue += amount;
        }
      }
    });

    return {
      subscriptions: {
        total: subTotal,
        byStatus: subByStatus,
        monthlyRecurringRevenue:
          Math.round(monthlyRecurringRevenue * 100) / 100,
      },
      addOns: {
        total: addonTotal._count.id,
        totalRevenue: addonTotal._sum.price ?? 0,
        byStatus: addonByStatus,
        byType: addonByType,
      },
    };
  }

  // ─── Legacy global transaction methods ─────────────────────────────────────

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
        invoice: {
          include: {
            appointment: {
              include: {
                client: {
                  include: { user: { select: { id: true, email: true } } },
                },
              },
            },
          },
        },
      },
    });

    const formattedData = refundedTransactions.map((t) => {
      const client = t.invoice?.appointment?.client;
      const isConsumer = !!client?.userId;
      const actualRefundedAmount = t.amountSent - t.amountReceived; // Calculate this

      return {
        id: t.id,
        amount: t.amountSent,
        refundAmount: actualRefundedAmount, // Now shows the actual refunded amount
        businessId: t.businessId,
        businessName: t.business?.name,
        status: t.transactionStatus,
        payerType: isConsumer ? ('consumer' as const) : ('walk_in' as const),
        clientName: client?.fullName ?? null,
        consumerEmail: isConsumer
          ? (client?.user?.email ?? client?.email)
          : null,
        createdAt: t.createdAt.toISOString(),
      };
    });

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
        include: { invoice: true },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.paymentStatus === TransactionPaymentStatus.REFUNDED) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'ALREADY_REFUNDED',
            message: 'This transaction has already been refunded',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!transaction.invoice) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'NO_INVOICE',
            message: 'No invoice associated with this transaction',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoice = transaction.invoice;

      if (!invoice.stripePaymentIntentId) {
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

        if (
          error.type === 'StripeInvalidRequestError' &&
          error.code === 'resource_missing'
        ) {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              error: 'PAYMENT_INTENT_NOT_FOUND',
              message: 'Payment intent not found in Stripe.',
              stripeMessage: error.message,
            },
            HttpStatus.BAD_REQUEST,
          );
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

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'STRIPE_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 1) Update the transaction
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          transactionStatus: TransactionStatus.PAID, // keep paid because refund is separate
          paymentStatus: TransactionPaymentStatus.REFUNDED,
        },
      });

      this.logger.log(`Updated transaction ${transactionId} to REFUNDED`);

      // 2) Update the invoice
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          // Optionally reset amountPaid to 0
          amountPaid: 0,
        },
      });

      this.logger.log(`Updated invoice ${invoice.id} to REFUNDED`);

      this.logger.log(
        `Successfully refunded transaction ${transactionId}, refund ID: ${refundResult.id}`,
      );

      return refundResult;
    });
  }

  // ─── Payout Info ───────────────────────────────────────────────────────────

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
      // Mask sensitive data
      msisdn: info.msisdn ? '••••' + info.msisdn.slice(-4) : null,
      cnic: info.cnic ? '••••' + info.cnic.slice(-4) : null,
      accountNumber: info.accountNumber
        ? '••••' + info.accountNumber.slice(-4)
        : null,
    };
  }

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

  async getBanks() {
    return this.prisma.bank.findMany({ orderBy: { bankName: 'asc' } });
  }

  // ─── Add-Ons ───────────────────────────────────────────────────────────────

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
      const disputes = await this.stripe.disputes.list({
        limit: 100,
        expand: ['data.charge', 'data.payment_intent'],
      });
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
        expand: ['data.charge', 'data.payment_intent'],
      });
      return {
        data: disputes.data,
        hasMore: disputes.has_more,
        nextCursor:
          disputes.data.length > 0
            ? disputes.data[disputes.data.length - 1].id
            : undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to retrieve disputes: ${error.message}`);
      return { data: [], hasMore: false, nextCursor: undefined };
    }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getGlobalPaymentStats() {
    const [
      stats,
      succeededTotal,
      refundedTransactions,
      failedCount,
      subscriptions,
      addOnStats,
      invoiceStats,
      subscriptionPlans,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amountSent: true, amountReceived: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: { transactionStatus: TransactionStatus.PAID },
        _sum: { amountSent: true },
      }),
      // Get all refunded transactions to calculate actual refund amount
      this.prisma.transaction.findMany({
        where: { paymentStatus: TransactionPaymentStatus.REFUNDED },
        select: {
          amountSent: true,
          amountReceived: true,
        },
      }),
      this.prisma.transaction.count({
        where: { transactionStatus: TransactionStatus.FAILED },
      }),
      this.prisma.businessSubscription.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.businessAddOn.groupBy({
        by: ['status'],
        _count: true,
        _sum: { price: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['paymentMethod'],
        _count: true,
        _sum: { amountDue: true, amountPaid: true },
      }),
      this.prisma.subscription.findMany({
        select: {
          id: true,
          title: true,
          prices: true,
          businessSubscriptions: {
            where: { status: 'ACTIVE' },
            select: {
              billingCycle: true,
            },
          },
        },
      }),
    ]);

    // Calculate total refunded amount (amountSent - amountReceived)
    const totalRefunded = refundedTransactions.reduce(
      (sum, t) => sum + (t.amountSent - t.amountReceived),
      0,
    );

    // Calculate MRR (Monthly Recurring Revenue) from subscriptions
    let mrr = 0;
    const planDistribution = subscriptionPlans.map((plan) => {
      const prices = this.parsePrices(plan.prices);
      const activeCount = plan.businessSubscriptions.length;

      let planMrr = 0;
      plan.businessSubscriptions.forEach((sub) => {
        const price = this.findPriceByBillingCycle(prices, sub.billingCycle);
        if (price) {
          const amount = price.amount || price.price || 0;
          if (sub.billingCycle === 'YEAR') {
            planMrr += amount / 12;
          } else {
            planMrr += amount;
          }
        }
      });

      mrr += planMrr;

      return {
        planId: plan.id,
        planName: plan.title,
        count: activeCount,
        mrr: Math.round(planMrr * 100) / 100,
        priceRange: prices.map((p) => ({
          interval: p.interval,
          amount: (p.amount || p.price || 0) / 100,
          currency: p.currency || 'USD',
          formatted: this.formatPrice(p),
        })),
      };
    });

    return {
      totalTransactions: stats._count.id,
      completedRevenue: succeededTotal._sum.amountSent ?? 0,
      totalVolume: stats._sum.amountSent ?? 0,
      totalRefunded: totalRefunded,
      failedTransactions: failedCount,
      subscriptionStats: subscriptions,
      addOnStats,
      invoiceStats,
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptionsByPlan: planDistribution,
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

  /**
   * Create a new subscription for a business
   */
  async createSubscription(
    createDto: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResponse> {
    this.logger.log(
      `Creating subscription for business: ${createDto.businessId}`,
    );

    const {
      businessId,
      subscriptionId,
      billingCycle,
      startDate,
      trialPeriodDays,
      stripeCustomerId,
      // stripePaymentMethodId,
    } = createDto;

    // 1. Verify business exists (outside transaction)
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found`);
    }

    // 2. Verify subscription plan exists (outside transaction)
    const subscriptionPlan = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscriptionPlan) {
      throw new NotFoundException(
        `Subscription plan with ID ${subscriptionId} not found`,
      );
    }

    // 3. Check if business already has an active subscription (outside transaction)
    const existingActiveSub = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    });

    if (existingActiveSub) {
      throw new BadRequestException(
        `Business already has an active subscription. Please cancel it first.`,
      );
    }

    // 4. Parse prices to find the correct price for the billing cycle
    const prices = this.parsePrices(subscriptionPlan.prices);
    const selectedPrice = this.findPriceByBillingCycle(prices, billingCycle);

    if (!selectedPrice) {
      throw new BadRequestException(
        `No price found for billing cycle: ${billingCycle}`,
      );
    }

    const amount = (selectedPrice.amount || selectedPrice.price || 0) / 100;
    const currency = selectedPrice.currency || 'USD';

    // 5. Calculate dates
    const now = new Date();
    const subStartDate = startDate ? new Date(startDate) : now;
    let subEndDate: Date | null = null;

    if (billingCycle === BillingCycle.MONTH) {
      subEndDate = new Date(subStartDate);
      subEndDate.setMonth(subEndDate.getMonth() + 1);
    } else if (billingCycle === BillingCycle.YEAR) {
      subEndDate = new Date(subStartDate);
      subEndDate.setFullYear(subEndDate.getFullYear() + 1);
    }

    // Apply trial if specified
    let trialEndDate: Date | null = null;
    let status = 'ACTIVE';

    if (trialPeriodDays && trialPeriodDays > 0) {
      trialEndDate = new Date(subStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialPeriodDays);
      status = 'TRIAL';
    }

    // 6. Create Stripe subscription (outside transaction - this is the slow part)
    let stripeSubscription: Stripe.Response<Stripe.Subscription> | null = null;
    let stripeSubscriptionId: string | null = null;
    let customerTransactionId: string | null = null;

    // Only attempt Stripe if a customer ID is provided
    if (stripeCustomerId) {
      try {
        // Verify the customer exists first
        try {
          await this.stripe.customers.retrieve(stripeCustomerId);
        } catch (error) {
          this.logger.error(`Invalid Stripe customer ID: ${stripeCustomerId}`);
          throw new BadRequestException(
            `Invalid Stripe customer ID: ${stripeCustomerId}. Please provide a valid test customer ID.`,
          );
        }

        // First, create or get a product
        let productId: string;

        // Check if product already exists
        const products = await this.stripe.products.search({
          query: `name:'${subscriptionPlan.title}' AND metadata['subscriptionId']:'${subscriptionId}'`,
        });

        if (products.data.length > 0) {
          productId = products.data[0].id;
        } else {
          // Create a new product
          const product = await this.stripe.products.create({
            name: subscriptionPlan.title,
            metadata: {
              subscriptionId,
              businessId,
            },
          });
          productId = product.id;
        }

        // Create a price for the product
        const price = await this.stripe.prices.create({
          product: productId,
          unit_amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          recurring: {
            interval: billingCycle.toLowerCase() as 'month' | 'year',
          },
          metadata: {
            subscriptionId,
            billingCycle,
          },
        });

        const subscriptionData: Stripe.SubscriptionCreateParams = {
          customer: stripeCustomerId,
          items: [
            {
              price: price.id,
            },
          ],
          metadata: {
            businessId,
            subscriptionPlanId: subscriptionId,
            planName: subscriptionPlan.title,
          },
        };

        // Add trial if applicable
        if (trialPeriodDays && trialPeriodDays > 0) {
          subscriptionData.trial_period_days = trialPeriodDays;
        }

        stripeSubscription =
          await this.stripe.subscriptions.create(subscriptionData);
        stripeSubscriptionId = stripeSubscription.id;
        customerTransactionId = stripeCustomerId;

        this.logger.log(`Stripe subscription created: ${stripeSubscriptionId}`);
      } catch (error) {
        this.logger.error(
          `Failed to create Stripe subscription: ${error.message}`,
        );
        throw new BadRequestException(
          `Stripe subscription creation failed: ${error.message}`,
        );
      }
    } else {
      this.logger.log(
        'No Stripe customer ID provided - creating local subscription only',
      );
    }

    // 7. Create database records in a transaction with increased timeout
    const businessSubscription = await this.prisma.$transaction(
      async (prisma) => {
        // Create the subscription in our database
        const subscription = await prisma.businessSubscription.create({
          data: {
            businessId,
            subscriptionId,
            customerTransactionId:
              customerTransactionId ||
              `local_${Math.random().toString(36).substring(7)}`,
            orderId: stripeSubscriptionId,
            startDate: subStartDate,
            endDate: subEndDate,
            billingCycle,
            status: status as SubscriptionStatus,
            paymentStatus: trialPeriodDays ? 'UNPAID' : 'PAID',
            isTrialUsed: status === 'TRIAL',
            cancelAtPeriodEnd: false,
            paymentCheck: trialEndDate?.toISOString() || null,
          },
          include: {
            subscription: true,
          },
        });

        // Create history record
        await prisma.businessSubscriptionHistory.create({
          data: {
            businessSubscriptionId: subscription.id,
            eventType: 'CREATED',
            subscriptionId: stripeSubscriptionId || subscription.id,
            oldPlanId: null,
            newPlanId: subscriptionId,
            amount: Math.round(amount * 100),
            currency,
            startDate: subStartDate,
            endDate: subEndDate,
          },
        });

        return subscription;
      },
      {
        timeout: 15000, // Increase timeout to 15 seconds
        maxWait: 10000, // Max time to wait for a connection
      },
    );

    this.logger.log(
      `Subscription created successfully: ${businessSubscription.id}`,
    );

    // 8. Return formatted response
    return {
      success: true,
      message: `Subscription created successfully${trialPeriodDays ? ` with ${trialPeriodDays} day trial` : ''}`,
      subscription: {
        id: businessSubscription.id,
        businessId: businessSubscription.businessId,
        planId: subscriptionPlan.id,
        planName: subscriptionPlan.title,
        status: businessSubscription.status,
        billingCycle: businessSubscription.billingCycle,
        startDate: businessSubscription.startDate,
        endDate: businessSubscription.endDate,
        stripeSubscriptionId: businessSubscription.orderId,
        amount,
        currency,
      },
      stripeData: stripeSubscription,
    };
  }

  /**
   * Create a subscription with Stripe checkout session (alternative flow)
   */
  async createCheckoutSession(
    businessId: string,
    subscriptionId: string,
    billingCycle: BillingCycle,
    successUrl: string,
    cancelUrl: string,
  ) {
    this.logger.log(`Creating checkout session for business: ${businessId}`);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const subscriptionPlan = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscriptionPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const prices = this.parsePrices(subscriptionPlan.prices);
    const selectedPrice = this.findPriceByBillingCycle(prices, billingCycle);

    if (!selectedPrice) {
      throw new BadRequestException(
        `No price found for billing cycle: ${billingCycle}`,
      );
    }

    const amount = selectedPrice.amount || selectedPrice.price || 0;
    const currency = (selectedPrice.currency || 'USD').toLowerCase();

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: subscriptionPlan.title,
                description: `Subscription plan - ${billingCycle.toLowerCase()}ly billing`,
                metadata: {
                  subscriptionId: subscriptionPlan.id,
                },
              },
              unit_amount: Math.round(amount),
              recurring: {
                interval: billingCycle.toLowerCase() as 'month' | 'year',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          businessId,
          subscriptionId: subscriptionPlan.id,
          billingCycle,
        },
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error.message}`);
      throw new BadRequestException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }

  /**
   * Handle successful subscription from webhook
   */
  async handleSuccessfulSubscription(subscriptionData: any) {
    // This would be called from your Stripe webhook handler
    const {
      metadata,
      id,
      customer,
      current_period_start,
      current_period_end,
      trial_end,
    } = subscriptionData;

    const { businessId, subscriptionId, billingCycle } = metadata;

    if (!businessId || !subscriptionId || !billingCycle) {
      this.logger.error('Missing metadata in subscription data');
      return;
    }

    // Check if subscription already exists
    const existing = await this.prisma.businessSubscription.findFirst({
      where: { orderId: id },
    });

    if (existing) {
      this.logger.log(`Subscription ${id} already exists in database`);
      return;
    }

    const startDate = new Date(current_period_start * 1000);
    const endDate = new Date(current_period_end * 1000);
    const isTrial = !!trial_end && new Date(trial_end * 1000) > new Date();

    await this.prisma.businessSubscription.create({
      data: {
        businessId,
        subscriptionId,
        customerTransactionId: customer,
        orderId: id,
        startDate,
        endDate,
        billingCycle: billingCycle as BillingCycle,
        status: isTrial ? 'TRIAL' : 'ACTIVE',
        paymentStatus: 'PAID',
        isTrialUsed: isTrial,
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Subscription ${id} created from webhook`);
  }
}
