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
  log: ['error', 'warn'], // Removed 'query' log to reduce noise
});

interface BusinessWithRelations extends Business {
  clients: any[];
  members: any[];
}

async function seedPayments() {
  console.log('🌱 Starting payment data seeding (LIMITED to 2 businesses)...');

  try {
    // Get ONLY 2 businesses
    const businesses = (await prisma.business.findMany({
      take: 2, // LIMIT TO 2 BUSINESSES
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

    // 1. Create or get subscriptions (keeping this as is)
    console.log('\n📦 Creating subscription plans...');
    const subscriptionPlans = await createSubscriptionPlans();
    console.log(`Created ${subscriptionPlans.length} subscription plans`);

    // 2. Create business subscriptions for the 2 businesses
    console.log('\n💳 Creating business subscriptions...');
    await createBusinessSubscriptions(businesses, subscriptionPlans);

    // 3. Create limited clients, appointments, invoices, and transactions
    console.log('\n🧑 Creating limited clients and payment data...');
    for (const business of businesses) {
      await createBusinessPaymentData(business);
    }

    // 4. Create limited refunded transactions
    console.log('\n↩️ Creating limited refunded transactions...');
    await createRefundedTransactions(businesses);

    // 5. Create limited failed transactions
    console.log('\n❌ Creating limited failed transactions...');
    await createFailedTransactions(businesses);

    // 6. Create limited business add-ons
    console.log('\n➕ Creating limited business add-ons...');
    await createBusinessAddOns(businesses);

    console.log('\n✅ Payment data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding payment data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createSubscriptionPlans(): Promise<Subscription[]> {
  // Reduced to just 2 plans
  const plans: Prisma.SubscriptionCreateInput[] = [
    {
      title: 'Basic Plan',
      prices: [{ amount: 29.99, currency: 'USD', interval: 'month' }],
      features: [
        'Up to 50 appointments/month',
        'Basic analytics',
        'Email support',
      ],
      country: 'US',
      trialPeriodDays: 14,
    },
    {
      title: 'Professional Plan',
      prices: [{ amount: 79.99, currency: 'USD', interval: 'month' }],
      features: [
        'Unlimited appointments',
        'Advanced analytics',
        'Priority support',
      ],
      country: 'US',
      trialPeriodDays: 14,
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
  const statuses = ['ACTIVE', 'TRIAL'] as const; // Removed CANCELLED and INACTIVE
  const billingCycles = ['MONTH'] as const; // Only MONTH for simplicity

  for (const business of businesses) {
    // 90% chance of having a subscription (higher chance for limited data)
    if (Math.random() > 0.1) {
      const plan = plans[Math.floor(Math.random() * plans.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const billingCycle = 'MONTH';

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 3)); // Last 3 months max

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

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
            isTrialUsed: status === 'TRIAL' ? true : false,
            cancelAtPeriodEnd: false,
            canceledDate: null,
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
  // REDUCED: Create only 2-5 clients per business (was 5-20)
  const clientCount = Math.floor(Math.random() * 4) + 2;

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
        type: 'CUSTOMER', // Simplified to just CUSTOMER
        city: business.city || 'New York',
        area: 'Downtown',
        note: 'Test client',
      },
    });

    // REDUCED: Create only 1-2 appointments per client (was 1-5)
    const appointmentCount = Math.floor(Math.random() * 2) + 1;

    for (let j = 0; j < appointmentCount; j++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Last 30 days only

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
          status: ['COMPLETED', 'COMPLETED', 'CANCELLED'][
            Math.floor(Math.random() * 3)
          ] as any, // Simplified statuses
          note: `Test appointment`,
          sendReminderEmail: false,
        },
      });

      // Create invoice for appointment (90% chance)
      if (Math.random() > 0.1) {
        const amountDue = Math.floor(Math.random() * 200) + 50; // Reduced max to $250
        const amountPaid = Math.random() > 0.2 ? amountDue : amountDue * 0.5;
        const paymentStatus = amountPaid >= amountDue ? 'PAID' : 'PREPAID';

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
            tip: null, // No tips for simplicity
            paymentMethod: Math.random() > 0.3 ? 'ONLINE' : 'CASH',
            paymentStatus: paymentStatus as any,
            stripePaymentIntentId:
              paymentStatus === 'PAID'
                ? `pi_${Math.random().toString(36).substring(7)}`
                : null,
            prePayment: paymentStatus === 'PREPAID' ? amountPaid : 0,
          },
        });

        // Create transaction for invoice (if paid or prepaid)
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
            transactionStatus: paymentStatus === 'PAID' ? 'PAID' : 'CREATED',
            paymentStatus: paymentStatus === 'PAID' ? 'PAID' : 'UNPAID',
          },
        });
      }
    }
  }
  console.log(
    `  Created ${clientCount} clients with appointments for business: ${business.name}`,
  );
}

async function createRefundedTransactions(businesses: BusinessWithRelations[]) {
  for (const business of businesses) {
    // Get just 1 paid invoice to potentially refund
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        businessId: business.id,
        paymentStatus: 'PAID',
      },
      take: 1, // Just 1 invoice
    });

    for (const invoice of paidInvoices) {
      if (Math.random() > 0.5) {
        // 50% chance
        const refundAmount = invoice.amountDue; // Full refund only for simplicity

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
    // Create just 1 failed transaction per business max
    if (Math.random() > 0.5) {
      // 50% chance
      const client = await prisma.businessClient.findFirst({
        where: { businessId: business.id },
      });

      if (client) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 15));

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
            note: 'Failed payment',
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
            amountDue: Math.floor(Math.random() * 200) + 50,
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

        console.log(
          `  Created failed transaction for business: ${business.name}`,
        );
      }
    }
  }
}

async function createBusinessAddOns(businesses: BusinessWithRelations[]) {
  const addOnTypes = ['EMPLOYEE'] as const; // Just EMPLOYEE type
  const statuses = ['SUCCESS'] as const; // Just SUCCESS status

  for (const business of businesses) {
    // 50% chance of having an add-on
    if (Math.random() > 0.5) {
      const member = await prisma.businessMember.findFirst({
        where: { businessId: business.id },
      });

      if (member) {
        // Just 1 add-on per business
        await prisma.businessAddOn.create({
          data: {
            business: {
              connect: { id: business.id },
            },
            purchaseBy: {
              connect: { id: member.id },
            },
            type: 'EMPLOYEE',
            status: 'SUCCESS',
            price: Math.floor(Math.random() * 300) + 100,
            currency: 'USD',
            resourceId: `res_${Math.random().toString(36).substring(7)}`,
            transactionId: `txn_${Math.random().toString(36).substring(7)}`,
          },
        });
        console.log(`  Created add-on for business: ${business.name}`);
      }
    }
  }
}

// Run the seed function
seedPayments().catch((e) => {
  console.error('Error in seed script:', e);
  process.exit(1);
});
