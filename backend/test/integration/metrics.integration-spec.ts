import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import Stripe from 'stripe';

// Define the type for our mock
// Define the type for our mock with proper Generics
type StripeMock = {
  subscriptions: {
    // jest.fn<ReturnType, ParameterTypes>
    list: jest.Mock<() => Promise<{ data: any[] }>>;
    cancel: jest.Mock<() => Promise<{ id: string; status: string }>>;
  };
  paymentIntents: {
    list: jest.Mock<() => Promise<{ data: any[] }>>;
  };
};

describe('Metrics integration test', () => {
  let app: INestApplication;
  let adminToken: string;
  let businessId: string;
  let stripeMock: StripeMock; // ✅ Type annotation added
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      .post('/admin/auth/login') // Adjust this based on your actual auth endpoint
      .send({
        email: 'admin@marvalero.com',
        password: 'admin123',
      });

    adminToken = loginRes.body.accessToken || loginRes.body.token;
    if (!adminToken) {
      throw new Error('Admin login failed, no token received');
    }
    expect(adminToken).toBeDefined();
  });

  it('returns user metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('activeUsers'); // Changed from 'active'
    expect(res.body).toHaveProperty('dailyLogins'); // Changed from 'loggedInToday'
  });

  it('rejects unauthenticated admin actions', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/metrics')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
