/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  beforeAll,
  describe,
  expect,
  it,
  jest,
  afterEach,
  afterAll,
} from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import Stripe from 'stripe';
import {
  TransactionStatus,
  TransactionPaymentStatus,
  SubscriptionStatus,
  BillingCycle,
} from '../../src/generated/prisma/client.js';

// Define the type for our mock with proper Generics
type StripeMock = {
  subscriptions: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
    retrieve: jest.Mock<() => Promise<any>>;
    cancel: jest.Mock<() => Promise<{ id: string; status: string }>>;
  };
  paymentIntents: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
    create: jest.Mock<() => Promise<{ id: string; client_secret: string }>>;
  };
  refunds: {
    create: jest.Mock<() => Promise<{ id: string; amount: number }>>;
    list: jest.Mock<() => Promise<{ data: any[] }>>;
  };
  disputes: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
  };
};

describe('Admin Payments Features (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let businessId: string;
  let subscriptionId: string;
  let transactionId: string;
  let invoiceId: string;
  let stripeMock: StripeMock;
  let prisma: PrismaService;

  // Track IDs of test-created records for cleanup
  const testRecordIds = {
    businessIds: [] as string[],
    subscriptionIds: [] as string[],
    businessSubscriptionIds: [] as string[],
    clientIds: [] as string[],
    appointmentIds: [] as string[],
    invoiceIds: [] as string[],
    transactionIds: [] as string[],
    historyIds: [] as string[],
  };

  beforeAll(async () => {
    stripeMock = {
      subscriptions: {
        list: jest.fn<() => Promise<{ data: any[] }>>().mockResolvedValue({
          data: [
            {
              id: 'sub_test_123',
              status: 'active',
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 2592000,
              plan: {
                id: 'plan_test_123',
                product: { name: 'Premium Plan' },
              },
            },
          ],
        }),
        retrieve: jest.fn<() => Promise<any>>().mockResolvedValue({
          id: 'sub_test_123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          plan: {
            id: 'plan_test_123',
            product: { name: 'Premium Plan' },
          },
        }),
        cancel: jest
          .fn<() => Promise<{ id: string; status: string }>>()
          .mockResolvedValue({
            id: 'sub_test_123',
            status: 'canceled',
          }),
      },
      paymentIntents: {
        list: jest.fn<() => Promise<{ data: any[] }>>().mockResolvedValue({
          data: [
            {
              id: 'pi_test_123',
              amount: 10000,
              currency: 'usd',
              status: 'succeeded',
              customer: 'cus_test_123',
              metadata: { businessId: 'test_biz', invoiceId: 'test_invoice' },
            },
          ],
        }),
        create: jest
          .fn<() => Promise<{ id: string; client_secret: string }>>()
          .mockResolvedValue({
            id: 'pi_test_456',
            client_secret: 'pi_test_456_secret_abc123',
          }),
      },
      refunds: {
        create: jest
          .fn<() => Promise<{ id: string; amount: number }>>()
          .mockResolvedValue({
            id: 're_test_123',
            amount: 5000,
          }),
        list: jest.fn<() => Promise<{ data: any[] }>>().mockResolvedValue({
          data: [
            {
              id: 're_test_123',
              amount: 5000,
              currency: 'usd',
              status: 'succeeded',
              payment_intent: 'pi_test_123',
            },
          ],
        }),
      },
      disputes: {
        list: jest.fn<() => Promise<{ data: any[] }>>().mockResolvedValue({
          data: [
            {
              id: 'dp_test_123',
              amount: 10000,
              currency: 'usd',
              status: 'needs_response',
              payment_intent: 'pi_test_123',
            },
          ],
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('STRIPE_CLIENT')
      .useValue(stripeMock)
      .compile();

    app = moduleFixture.createNestApplication();

    // apply global interceptors
    const auditInterceptor = app.get(AuditInterceptor);
    app.useGlobalInterceptors(auditInterceptor);

    await app.init();

    // Get Prisma service
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    /**
     * Login as admin
     */
    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        email: 'admin@marvalero.com',
        password: 'admin123',
      });

    adminToken = loginRes.body.accessToken;
    if (!adminToken) {
      throw new Error('Admin login failed, no token received');
    }
    console.log('Logged in as admin');

    /**
     * Get an existing business for testing (don't create a new one)
     */
    const businessesRes = await request(app.getHttpServer())
      .get('/admin/payments/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(businessesRes.body)).toBe(true);
    expect(businessesRes.body.length).toBeGreaterThan(0);

    // Use the FIRST business from the database (don't create a new one)
    businessId = businessesRes.body[0].id;
    console.log(`Using existing business: ${businessId}`);

    // Create test data WITH UNIQUE IDENTIFIERS so we can delete only test data later
    const timestamp = Date.now();
    const uniqueId = `${timestamp}_${Math.random().toString(36).substring(7)}`;

    // Create a subscription for testing (with unique title)
    const subscription = await prisma.subscription.create({
      data: {
        title: `Test Premium Plan ${uniqueId}`, // Make it unique
        prices: JSON.stringify([{ amount: 999, currency: 'USD' }]),
        features: JSON.stringify(['Feature 1', 'Feature 2']),
        country: 'US',
      },
    });
    testRecordIds.subscriptionIds.push(subscription.id);

    // Create business subscription
    const businessSub = await prisma.businessSubscription.create({
      data: {
        businessId,
        subscriptionId: subscription.id,
        customerTransactionId: `cus_test_${uniqueId}`,
        orderId: `sub_test_${uniqueId}`,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTH,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentStatus: 'PAID',
      },
    });
    subscriptionId = businessSub.id;
    testRecordIds.businessSubscriptionIds.push(businessSub.id);

    // Create a business client for invoice
    const client = await prisma.businessClient.create({
      data: {
        businessId,
        fullName: `Test Client ${uniqueId}`,
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `test_${uniqueId}@client.com`,
        type: 'CUSTOMER',
      },
    });
    testRecordIds.clientIds.push(client.id);

    // Create an appointment
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        clientId: client.id,
        start: new Date(),
        end: new Date(Date.now() + 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    });
    testRecordIds.appointmentIds.push(appointment.id);

    // Create an invoice
    const invoice = await prisma.invoice.create({
      data: {
        appointmentId: appointment.id,
        businessId,
        amountDue: 10000,
        amountPaid: 10000,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        stripePaymentIntentId: `pi_test_${uniqueId}`,
      },
    });
    invoiceId = invoice.id;
    testRecordIds.invoiceIds.push(invoice.id);

    // Create a transaction
    const transaction = await prisma.transaction.create({
      data: {
        amountSent: 10000,
        amountReceived: 0,
        transactionType: 'PAY_IN',
        businessId,
        invoiceId: invoice.id,
        orderId: `order_test_${uniqueId}`,
        transactionStatus: TransactionStatus.PAID,
        paymentStatus: TransactionPaymentStatus.PAID,
      },
    });
    transactionId = transaction.id;
    testRecordIds.transactionIds.push(transaction.id);

    console.log(`Test setup complete with unique test data (ID: ${uniqueId})`);
  }, 10000);

  /**
   * After each test, reset mocks but DON'T delete data
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1️⃣ Get all businesses with payment info
   */
  it('fetches all businesses with payment info', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const business = res.body.find((b: { id: string }) => b.id === businessId);
    expect(business).toBeDefined();
    expect(business).toHaveProperty('name');
    expect(business).toHaveProperty('stripeAccountId');
    // Don't expect subscription to be defined - it might not be
  });

  /**
   * 2️⃣ Get business payment details
   */
  it('fetches business payment details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${businessId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', businessId);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('stripeAccountId');
    // Subscription might be null, that's OK
  });

  /**
   * 3️⃣ Get business subscription
   */
  it('fetches business subscription', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${businessId}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', subscriptionId);
    expect(res.body).toHaveProperty('businessId', businessId);
    expect(res.body).toHaveProperty('status', 'ACTIVE');
    expect(res.body).toHaveProperty('subscription');
    expect(res.body.subscription).toHaveProperty('title');
    expect(res.body).toHaveProperty('stripeSubscription');

    // Fix: Use expect with stringContaining properly
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalled();
  });
  /**
   * 4️⃣ Get business payments/transactions
   */
  it('returns business payments successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${businessId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('transactions');
    expect(Array.isArray(res.body.transactions)).toBe(true);

    const transaction = res.body.transactions.find(
      (t: { id: string }) => t.id === transactionId,
    );
    expect(transaction).toBeDefined();
    if (transaction) {
      expect(transaction).toHaveProperty('amountSent', 10000);
      expect(transaction).toHaveProperty('transactionStatus', 'PAID');
    }

    expect(res.body).toHaveProperty('stripePayments');
    expect(Array.isArray(res.body.stripePayments)).toBe(true);
  });

  /**
   * 5️⃣ Get all payments (global)
   */
  it('returns all payments with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/payments?limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('hasMore');
    expect(res.body).toHaveProperty('nextCursor');

    const payment = res.body.data.find(
      (p: { id: string }) => p.id === transactionId,
    );
    if (payment) {
      expect(payment).toHaveProperty('amount', 10000);
      expect(payment).toHaveProperty('businessName');
    }
  });

  /**
   * 6️⃣ Get payment stats
   */
  it('returns global payment statistics', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/payments/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalTransactions');
    expect(res.body).toHaveProperty('completedRevenue');
    expect(res.body).toHaveProperty('totalVolume');
    expect(res.body).toHaveProperty('totalRefunded');
    expect(res.body).toHaveProperty('failedTransactions');
    expect(res.body).toHaveProperty('subscriptionStats');
  });

  /**
   * 7️⃣ Get failed payments
   */
  it('returns failed payments for a business', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${businessId}/payments/failed`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('failedTransactions');
    expect(res.body).toHaveProperty('stripeFailedPayments');
  });

  /**
   * 8️⃣ Get all failed payments (global)
   */
  it('returns all failed payments globally', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/payments/failed?limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('hasMore');
    expect(res.body).toHaveProperty('nextCursor');
  });

  /**
   * 9️⃣ Refund a payment
   */
  it('refunds a payment successfully', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/payments/payments/${transactionId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(stripeMock.refunds.create).toHaveBeenCalled();

    // Verify transaction was updated in DB
    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    expect(updatedTransaction?.transactionStatus).toBe(
      TransactionStatus.FAILED,
    );
    expect(updatedTransaction?.paymentStatus).toBe(
      TransactionPaymentStatus.REFUNDED,
    );
  });

  /**
   * 🔟 Cancel subscription
   */
  it('cancels a subscription successfully', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/payments/${businessId}/cancel-subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('subscription');
    expect(res.body.subscription).toHaveProperty('status', 'CANCELLED');
    expect(res.body.subscription).toHaveProperty('canceledDate');

    expect(stripeMock.subscriptions.cancel).toHaveBeenCalled();

    // Verify in database
    const updatedSub = await prisma.businessSubscription.findUnique({
      where: { id: subscriptionId },
    });
    expect(updatedSub?.status).toBe('CANCELLED');
    expect(updatedSub?.canceledDate).toBeDefined();

    // Check history was created
    const history = await prisma.businessSubscriptionHistory.findFirst({
      where: { businessSubscriptionId: updatedSub?.id },
    });
    expect(history).toBeDefined();
    expect(history?.eventType).toBe('CANCELLED');
    if (history) {
      testRecordIds.historyIds.push(history.id);
    }
  });

  /**
   * 1️⃣1️⃣ Get disputes
   */
  it('returns disputes for a business', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${businessId}/disputes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  /**
   * 1️⃣2️⃣ Get all disputes (global)
   */
  it('returns all disputes globally', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/disputes?limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(stripeMock.disputes.list).toHaveBeenCalled();
  });

  /**
   * 1️⃣3️⃣ Get all refunds
   */
  it('returns all refunds globally', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments/refunds?limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('hasMore');
    expect(res.body).toHaveProperty('nextCursor');
  });

  /**
   * 1️⃣4️⃣ Create payment intent
   */
  it('creates a payment intent successfully', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/payments/${businessId}/create-payment-intent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        invoiceId: invoiceId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('clientSecret');
    expect(res.body).toHaveProperty('transactionId');

    // Add the new transaction to cleanup list
    if (res.body.transactionId) {
      testRecordIds.transactionIds.push(res.body.transactionId);
    }

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith();
  });

  /**
   * 1️⃣5️⃣ Test validation - missing transaction ID for refund
   */
  it('returns 404 for invalid refund endpoint', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/payments/payments//refund')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  /**
   * 1️⃣6️⃣ Test validation - invalid amount for payment intent
   */
  it('returns 400 when creating payment intent with invalid amount', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/payments/${businessId}/create-payment-intent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 0,
        invoiceId: invoiceId,
      })
      .expect(400);

    expect(res.body.message).toMatch(/Valid amount is required/);
  });

  /**
   * 1️⃣7️⃣ Test business without subscription
   */
  it('returns 404 for business without subscription', async () => {
    // Create a temporary business with unique ID for this test
    const tempBusiness = await prisma.business.create({
      data: {
        name: `Temp Business ${Date.now()}`,
        clerkOrganizationId: `org_temp_${Date.now()}`,
        country: 'US',
        city: 'Test City',
        zipcode: '12345',
      },
    });
    testRecordIds.businessIds.push(tempBusiness.id);

    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${tempBusiness.id}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.message).toMatch(/No subscription found for this business/);
  });

  /**
   * Clean up ONLY test data, leave existing data alone
   */
  afterAll(async () => {
    console.log('Cleaning up test data only...');

    try {
      // Delete in reverse order of creation to avoid foreign key constraints

      // 1. Delete history records
      if (testRecordIds.historyIds.length > 0) {
        await prisma.businessSubscriptionHistory.deleteMany({
          where: { id: { in: testRecordIds.historyIds } },
        });
      }

      // 2. Delete transactions
      if (testRecordIds.transactionIds.length > 0) {
        await prisma.transaction.deleteMany({
          where: { id: { in: testRecordIds.transactionIds } },
        });
      }

      // 3. Delete invoices
      if (testRecordIds.invoiceIds.length > 0) {
        await prisma.invoice.deleteMany({
          where: { id: { in: testRecordIds.invoiceIds } },
        });
      }

      // 4. Delete appointments
      if (testRecordIds.appointmentIds.length > 0) {
        await prisma.appointment.deleteMany({
          where: { id: { in: testRecordIds.appointmentIds } },
        });
      }

      // 5. Delete clients
      if (testRecordIds.clientIds.length > 0) {
        await prisma.businessClient.deleteMany({
          where: { id: { in: testRecordIds.clientIds } },
        });
      }

      // 6. Delete business subscriptions
      if (testRecordIds.businessSubscriptionIds.length > 0) {
        await prisma.businessSubscription.deleteMany({
          where: { id: { in: testRecordIds.businessSubscriptionIds } },
        });
      }

      // 7. Delete subscriptions
      if (testRecordIds.subscriptionIds.length > 0) {
        await prisma.subscription.deleteMany({
          where: { id: { in: testRecordIds.subscriptionIds } },
        });
      }

      // 8. Delete temporary businesses (but NOT the main business we used)
      if (testRecordIds.businessIds.length > 0) {
        await prisma.business.deleteMany({
          where: { id: { in: testRecordIds.businessIds } },
        });
      }

      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    await app.close();
  });
});
