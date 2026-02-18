/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// prisma/seed-payments.ts
import 'dotenv/config';
import {
  PrismaClient,
  Subscription,
  Business,
  Prisma,
} from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

interface BusinessWithRelations extends Business {
  clients: any[];
  members: any[];
}

async function seedPayments() {
  console.log('🌱 Starting payment data seeding...');

  try {
    // Get all businesses
    const businesses = (await prisma.business.findMany({
      include: {
        clients: true,
        members: true,
      },
    })) as BusinessWithRelations[];

    if (businesses.length === 0) {
      console.log('No businesses found. Please seed businesses first.');
      return;
    }

    console.log(
      `Found ${businesses.length} businesses to seed payment data for`,
    );

    // 1. Create or get subscriptions
    console.log('\n📦 Creating subscription plans...');
    const subscriptionPlans = await createSubscriptionPlans();
    console.log(`Created ${subscriptionPlans.length} subscription plans`);

    // 2. Create business subscriptions
    console.log('\n💳 Creating business subscriptions...');
    await createBusinessSubscriptions(businesses, subscriptionPlans);

    // 3. Create clients, appointments, invoices, and transactions for each business
    console.log('\n🧑 Creating clients and payment data...');
    for (const business of businesses) {
      await createBusinessPaymentData(business);
    }

    // 4. Create some refunded transactions
    console.log('\n↩️ Creating refunded transactions...');
    await createRefundedTransactions(businesses);

    // 5. Create failed transactions
    console.log('\n❌ Creating failed transactions...');
    await createFailedTransactions(businesses);

    // 6. Create business add-ons
    console.log('\n➕ Creating business add-ons...');
    await createBusinessAddOns(businesses);

    console.log('\n✅ Payment data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding payment data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createSubscriptionPlans(): Promise<Subscription[]> {
  const plans: Prisma.SubscriptionCreateInput[] = [
    {
      title: 'Basic Plan',
      prices: [
        { amount: 29.99, currency: 'USD', interval: 'month' },
        { amount: 299.99, currency: 'USD', interval: 'year' },
      ],
      features: [
        'Up to 50 appointments/month',
        'Basic analytics',
        'Email support',
        '1 location',
      ],
      country: 'US',
      trialPeriodDays: 14,
    },
    {
      title: 'Professional Plan',
      prices: [
        { amount: 79.99, currency: 'USD', interval: 'month' },
        { amount: 799.99, currency: 'USD', interval: 'year' },
      ],
      features: [
        'Unlimited appointments',
        'Advanced analytics',
        'Priority support',
        '5 locations',
        'Staff management',
        'Marketing tools',
      ],
      country: 'US',
      trialPeriodDays: 14,
    },
    {
      title: 'Enterprise Plan',
      prices: [
        { amount: 199.99, currency: 'USD', interval: 'month' },
        { amount: 1999.99, currency: 'USD', interval: 'year' },
      ],
      features: [
        'Everything in Professional',
        'Unlimited locations',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
      ],
      country: 'US',
      trialPeriodDays: 30,
    },
  ];

  const createdPlans: Subscription[] = [];
  for (const plan of plans) {
    const existing = await prisma.subscription.findUnique({
      where: { title: plan.title },
    });

    if (!existing) {
      const created = await prisma.subscription.create({
        data: {
          title: plan.title,
          prices: plan.prices as Prisma.InputJsonValue,
          features: plan.features as Prisma.InputJsonValue,
          country: plan.country,
          trialPeriodDays: plan.trialPeriodDays,
        },
      });
      createdPlans.push(created);
      console.log(`  Created plan: ${plan.title}`);
    } else {
      createdPlans.push(existing);
      console.log(`  Plan already exists: ${plan.title}`);
    }
  }

  return createdPlans;
}

async function createBusinessSubscriptions(
  businesses: BusinessWithRelations[],
  plans: Subscription[],
) {
  const statuses = ['ACTIVE', 'TRIAL', 'CANCELLED', 'INACTIVE'] as const;
  const billingCycles = ['MONTH', 'YEAR'] as const;

  for (const business of businesses) {
    // 70% chance of having a subscription
    if (Math.random() > 0.3) {
      const plan = plans[Math.floor(Math.random() * plans.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const billingCycle =
        billingCycles[Math.floor(Math.random() * billingCycles.length)];

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6)); // Random start in last 6 months

      const endDate = new Date(startDate);
      if (billingCycle === 'MONTH') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const existingSub = await prisma.businessSubscription.findFirst({
        where: { businessId: business.id },
      });

      if (!existingSub) {
        await prisma.businessSubscription.create({
          data: {
            business: {
              connect: { id: business.id },
            },
            subscription: {
              connect: { id: plan.id },
            },
            customerTransactionId: `cus_${Math.random().toString(36).substring(7)}`,
            orderId: `sub_${Math.random().toString(36).substring(7)}`,
            startDate,
            endDate,
            billingCycle,
            status,
            paymentStatus: status === 'ACTIVE' ? 'PAID' : 'UNPAID',
            isTrialUsed: Math.random() > 0.5,
            cancelAtPeriodEnd: status === 'CANCELLED' ? true : false,
            canceledDate: status === 'CANCELLED' ? new Date() : null,
            paymentCheck: Math.random().toString(36).substring(7),
          },
        });
        console.log(
          `  Created subscription for business: ${business.name} (${status})`,
        );
      }
    }
  }
}

async function createBusinessPaymentData(business: BusinessWithRelations) {
  // Create 5-20 clients per business
  const clientCount = Math.floor(Math.random() * 15) + 5;

  for (let i = 0; i < clientCount; i++) {
    // Create client
    const client = await prisma.businessClient.create({
      data: {
        business: {
          connect: { id: business.id },
        },
        fullName: `Test Client ${i + 1} for ${business.name}`,
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `client${i + 1}_${business.id.substring(0, 5)}@example.com`,
        type: Math.random() > 0.3 ? 'CUSTOMER' : 'CLIENT',
        city: business.city || 'New York',
        area: 'Downtown',
        note: 'Test client created by seeding script',
      },
    });

    // Create 1-5 appointments per client
    const appointmentCount = Math.floor(Math.random() * 5) + 1;

    for (let j = 0; j < appointmentCount; j++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 60)); // Random date in last 60 days

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const appointment = await prisma.appointment.create({
        data: {
          business: {
            connect: { id: business.id },
          },
          client: {
            connect: { id: client.id },
          },
          start: startDate,
          end: endDate,
          status: [
            'COMPLETED',
            'COMPLETED',
            'COMPLETED',
            'CANCELLED',
            'NO_SHOW',
          ][Math.floor(Math.random() * 5)] as any,
          note: `Test appointment ${j + 1}`,
          sendReminderEmail: Math.random() > 0.5,
        },
      });

      // Create invoice for appointment (90% chance)
      if (Math.random() > 0.1) {
        const amountDue = Math.floor(Math.random() * 500) + 50; // $50-$550
        const amountPaid = Math.random() > 0.2 ? amountDue : amountDue * 0.5; // 80% paid in full
        const paymentStatus =
          amountPaid >= amountDue
            ? 'PAID'
            : amountPaid > 0
              ? 'PREPAID'
              : 'UNPAID';

        const invoice = await prisma.invoice.create({
          data: {
            appointment: {
              connect: { id: appointment.id },
            },
            business: {
              connect: { id: business.id },
            },
            amountDue,
            amountPaid: amountPaid,
            tip: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : null,
            paymentMethod: Math.random() > 0.3 ? 'ONLINE' : 'CASH',
            paymentStatus: paymentStatus as any,
            stripePaymentIntentId:
              paymentStatus === 'PAID'
                ? `pi_${Math.random().toString(36).substring(7)}`
                : null,
            prePayment: Math.floor(Math.random() * 100),
          },
        });

        // Create transaction for invoice (if paid or prepaid)
        if (paymentStatus !== 'UNPAID') {
          const transactionStatus =
            paymentStatus === 'PAID' ? 'PAID' : 'CREATED';
          const transactionPaymentStatus =
            paymentStatus === 'PAID'
              ? 'PAID'
              : paymentStatus === 'PREPAID'
                ? 'UNPAID'
                : 'UNPAID';

          await prisma.transaction.create({
            data: {
              amountSent: amountPaid,
              amountReceived: 0,
              transactionType: 'PAY_IN',
              business: {
                connect: { id: business.id },
              },
              invoice: {
                connect: { id: invoice.id },
              },
              orderId: `order_${Math.random().toString(36).substring(7)}`,
              transactionStatus: transactionStatus as any,
              paymentStatus: transactionPaymentStatus as any,
            },
          });
        }
      }
    }
  }
  console.log(
    `  Created ${clientCount} clients with appointments for business: ${business.name}`,
  );
}

async function createRefundedTransactions(businesses: BusinessWithRelations[]) {
  for (const business of businesses) {
    // Get some paid invoices to refund
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        businessId: business.id,
        paymentStatus: 'PAID',
      },
      take: 2, // Refund up to 2 invoices per business
    });

    for (const invoice of paidInvoices) {
      if (Math.random() > 0.7) {
        // 30% chance of refund
        const refundAmount =
          invoice.amountDue * (Math.random() > 0.5 ? 1 : 0.5); // Full or partial refund

        await prisma.transaction.create({
          data: {
            amountSent: 0,
            amountReceived: refundAmount,
            transactionType: 'PAY_OUT',
            business: {
              connect: { id: business.id },
            },
            invoice: {
              connect: { id: invoice.id },
            },
            orderId: `refund_${Math.random().toString(36).substring(7)}`,
            transactionStatus: 'PAID',
            paymentStatus: 'REFUNDED',
          },
        });

        // Update invoice status
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentStatus: 'REFUNDED',
          },
        });

        console.log(
          `  Created refund for business: ${business.name}, amount: $${refundAmount}`,
        );
      }
    }
  }
}

async function createFailedTransactions(businesses: BusinessWithRelations[]) {
  for (const business of businesses) {
    // Create 1-3 failed transactions per business
    const failedCount = Math.floor(Math.random() * 3);

    for (let i = 0; i < failedCount; i++) {
      // Create a failed invoice first
      const client = await prisma.businessClient.findFirst({
        where: { businessId: business.id },
      });

      if (client) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));

        const appointment = await prisma.appointment.create({
          data: {
            business: {
              connect: { id: business.id },
            },
            client: {
              connect: { id: client.id },
            },
            start: startDate,
            end: new Date(startDate.getTime() + 60 * 60 * 1000),
            status: 'CANCELLED',
            note: 'Failed payment appointment',
          },
        });

        const invoice = await prisma.invoice.create({
          data: {
            appointment: {
              connect: { id: appointment.id },
            },
            business: {
              connect: { id: business.id },
            },
            amountDue: Math.floor(Math.random() * 300) + 100,
            amountPaid: 0,
            paymentMethod: 'ONLINE',
            paymentStatus: 'FAILED',
            stripePaymentIntentId: `pi_failed_${Math.random().toString(36).substring(7)}`,
          },
        });

        await prisma.transaction.create({
          data: {
            amountSent: 0,
            amountReceived: 0,
            transactionType: 'PAY_IN',
            business: {
              connect: { id: business.id },
            },
            invoice: {
              connect: { id: invoice.id },
            },
            orderId: `failed_${Math.random().toString(36).substring(7)}`,
            transactionStatus: 'FAILED',
            paymentStatus: 'UNPAID',
          },
        });
      }
    }
  }
  console.log(`  Created failed transactions`);
}

async function createBusinessAddOns(businesses: BusinessWithRelations[]) {
  const addOnTypes = ['EMPLOYEE', 'LOCATION'] as const;
  const statuses = ['PENDING', 'SUCCESS', 'FAILED'] as const;

  for (const business of businesses) {
    // 40% chance of having add-ons
    if (Math.random() > 0.6) {
      const addOnCount = Math.floor(Math.random() * 3) + 1;

      // Get a business member to be the purchaser
      const member = await prisma.businessMember.findFirst({
        where: { businessId: business.id },
      });

      if (member) {
        for (let i = 0; i < addOnCount; i++) {
          const type =
            addOnTypes[Math.floor(Math.random() * addOnTypes.length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          await prisma.businessAddOn.create({
            data: {
              business: {
                connect: { id: business.id },
              },
              purchaseBy: {
                connect: { id: member.id },
              },
              type,
              status,
              price: Math.floor(Math.random() * 500) + 100,
              currency: 'USD',
              resourceId: `res_${Math.random().toString(36).substring(7)}`,
              transactionId: `txn_${Math.random().toString(36).substring(7)}`,
            },
          });
        }
        console.log(
          `  Created ${addOnCount} add-ons for business: ${business.name}`,
        );
      }
    }
  }
}

// Run the seed function
seedPayments().catch((e) => {
  console.error('Error in seed script:', e);
  process.exit(1);
});
