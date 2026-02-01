import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import Stripe from 'stripe';

// Define the type for our mock with proper Generics
type StripeMock = {
  subscriptions: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
    cancel: jest.Mock<() => Promise<{ id: string; status: string }>>;
  };
  paymentIntents: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
  };
  customers?: any; // Add other Stripe properties if needed
};

describe('Admin Business Features (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let businessId: string;
  let stripeMock: StripeMock;
  let prisma: PrismaService;

  beforeAll(async () => {
    stripeMock = {
      subscriptions: {
        list: jest.fn<() => Promise<{ data: any[] }>>().mockResolvedValue({
          data: [
            {
              id: 'sub_test_123',
              status: 'active',
              plan: { product: { name: 'Mock Product' } },
            },
          ],
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
              amount: 1000,
              currency: 'usd',
              status: 'succeeded',
              customer: 'cus_test_123', // Add customer field to match real Stripe response
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

    // apply global interceptors same as other tests
    const auditInterceptor = app.get(AuditInterceptor);
    app.useGlobalInterceptors(auditInterceptor);

    await app.init();

    // 💡 GET PRISMA SERVICE INSTANCE
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

    /**
     * 💡 CRITICAL: Update the business to have stripeCustomerId
     * Otherwise, all Stripe endpoints will return 404
     */
    const res = await request(app.getHttpServer())
      .get('/admin/business/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    businessId = res.body[0].id;

    // Update the business to have stripeCustomerId so Stripe endpoints work
    await prisma.business.update({
      where: { id: businessId },
      data: {
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
      },
    });

    console.log(`Using business ID for tests: ${businessId}`);
    console.log(`Added stripeCustomerId: cus_test_123`);
    console.log(`Added stripeSubscriptionId: sub_test_123`);
  });

  /**
   * 1️⃣ Get business profile - should show Stripe IDs
   */
  it('fetches business profile with Stripe IDs', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/business/${businessId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body).toHaveProperty('stripeCustomerId', 'cus_test_123');
    expect(res.body).toHaveProperty('stripeSubscriptionId', 'sub_test_123');
  });

  /**
   * 2️⃣ Get subscription list - SHOULD WORK NOW with stripeCustomerId
   */
  it('returns subscription list successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/business/${businessId}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); // Should return 200 now

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id', 'sub_test_123');
    expect(res.body[0]).toHaveProperty('status', 'active');
  });

  /**
   * 3️⃣ Get payments list - SHOULD WORK NOW with stripeCustomerId
   */
  it('returns payments list successfully', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/business/${businessId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); // Should return 200 now

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id', 'pi_test_123');
    expect(res.body[0]).toHaveProperty('amount', 1000);
  });

  /**
   * 4️⃣ Cancel subscription - SHOULD WORK NOW with stripeSubscriptionId
   */
  it('cancels a subscription successfully and updates DB', async () => {
    const cancelRes = await request(app.getHttpServer())
      .patch(`/admin/business/${businessId}/cancel-subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); // Should return 200 now

    expect(cancelRes.body).toHaveProperty('success', true);
    expect(cancelRes.body).toHaveProperty('status', 'canceled');

    // Verify the mock was called with correct subscription ID
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_test_123');

    // After cancellation, DB field should be null
    const updatedBiz = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!updatedBiz) throw new Error('Business not found after cancellation');
    expect(updatedBiz.stripeSubscriptionId).toBeNull();
    expect(updatedBiz.subscriptionStatus).toBe('canceled');
  });

  /**
   * 5️⃣ Verify Stripe mock was called
   */
  it('should call stripe API for subscription list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/business/${businessId}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); // Should return 200

    expect(stripeMock.subscriptions.list).toHaveBeenCalled();
    expect(stripeMock.subscriptions.list).toHaveBeenCalledWith({
      customer: 'cus_test_123',
      status: 'all',
      expand: ['data.plan.product'],
    });
  });

  /**
   * 6️⃣ Test business WITHOUT Stripe IDs (404 case)
   */
  it('returns 404 for business without Stripe customer ID', async () => {
    // Create a new business WITHOUT Stripe IDs
    const businessWithoutStripe = await prisma.business.create({
      data: {
        name: 'No Stripe Business Test',
        user: {
          create: {
            email: `no-stripe-${Date.now()}@example.com`,
            password: 'hashed_password', // You should hash this in real code
            userType: 'BUSINESS',
            status: 'ACTIVE',
            name: 'No Stripe Owner',
          },
        },
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/admin/business/${businessWithoutStripe.id}/subscription`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Stripe customer not linked/);

    // Clean up
    await prisma.business.delete({
      where: { id: businessWithoutStripe.id },
    });
  });

  afterAll(async () => {
    // Clean up: Remove stripeSubscriptionId we added for testing
    await prisma.business.update({
      where: { id: businessId },
      data: {
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
      },
    });

    await app.close();
  });
});