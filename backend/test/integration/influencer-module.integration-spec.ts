// admin-service.integration-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CampaignOfferStatus } from '../../src/generated/prisma/client.js';

describe('Admin Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInfluencerId: string;
  let testBusinessId: string;
  let testCampaignId: string;
  let testCampaignOfferId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    /**
     * 🔐 Login as admin
     */
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.admin.upsert({
      where: { email: 'admin@marvalero.com' },
      update: {},
      create: {
        email: 'admin@marvalero.com',
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log(`Admin user ensured: ${admin.email}`);

    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        email: 'admin@marvalero.com',
        password: 'admin123',
      });

    adminToken = loginRes.body.accessToken;
    if (!adminToken) {
      console.error('Login response:', loginRes.body);
      throw new Error('Admin login failed, no token received');
    }

    console.log(
      `Admin logged in, token received: ${adminToken.slice(0, 20)}...`,
    );

    /**
     * Create test business for campaign offers
     */
    const testBusiness = await prisma.business.create({
      data: {
        clerkOrganizationId: `test-org-${uuidv4()}`,
        name: 'Test Business for Influencers',
        city: 'Test City',
        country: 'US',
        isVerified: true,
        zipcode: '12345',
      },
    });
    testBusinessId = testBusiness.id;
    console.log(`Test business created with ID: ${testBusinessId}`);

    /**
     * Create test campaign
     */
    const testCampaign = await prisma.collabCampaign.create({
      data: {
        name: 'Test Campaign',
        businessId: testBusinessId,
      },
    });
    testCampaignId = testCampaign.id;
    console.log(`Test campaign created with ID: ${testCampaignId}`);

    /**
     * Create test influencer
     */
    const testInfluencer = await prisma.influencer.create({
      data: {
        name: 'Test Influencer',
        email: 'testinfluencer@admin.test',
        username: 'testinfluencer',
        phoneNumber: '+12345678901',
        password: await bcrypt.hash('testpassword', 10),
        isEmailConfirmed: true,
      },
    });
    testInfluencerId = testInfluencer.id;
    console.log(`Test influencer created with ID: ${testInfluencerId}`);

    /**
     * Create test campaign offer
     */
    const testCampaignOffer = await prisma.campaignOffer.create({
      data: {
        influencerId: testInfluencerId,
        businessId: testBusinessId,
        campaignId: testCampaignId,
        status: CampaignOfferStatus.PENDING,
      },
    });
    testCampaignOfferId = testCampaignOffer.id;
    console.log(`Test campaign offer created with ID: ${testCampaignOfferId}`);

    /**
     * Create test refresh token for login history
     */
    await prisma.refreshToken.create({
      data: {
        token: `test-token-${uuidv4()}`,
        userAgent: 'Test Browser',
        ipAddress: '192.168.1.1',
        city: 'Test City',
        country: 'Test Country',
        device: 'Test Device',
        influencerId: testInfluencerId,
      },
    });
    console.log(`Test refresh token created for influencer`);
  }, 30000);

  afterAll(async () => {
    // Clean up test data in reverse order
    if (testCampaignOfferId) {
      await prisma.campaignOffer.deleteMany({
        where: {
          id: testCampaignOfferId,
        },
      });
    }

    if (testCampaignId) {
      await prisma.collabCampaign.deleteMany({
        where: {
          id: testCampaignId,
        },
      });
    }

    if (testBusinessId) {
      await prisma.business.deleteMany({
        where: {
          id: testBusinessId,
        },
      });
    }

    if (testInfluencerId) {
      await prisma.refreshToken.deleteMany({
        where: { influencerId: testInfluencerId },
      });
      await prisma.influencer.deleteMany({
        where: {
          id: testInfluencerId,
        },
      });
    }

    await prisma.admin.deleteMany({
      where: { email: 'testadmin@test.com' },
    });

    await app.close();
  });

  describe('Influencers Endpoints', () => {
    describe('GET /admin/influencers', () => {
      it('should return paginated influencers', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 10);
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('totalPages');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter influencers by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers?status=ACTIVE')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // All returned influencers should have ACTIVE status
        response.body.data.forEach((influencer: any) => {
          expect(influencer.status).toBe('ACTIVE');
        });
      });

      it('should search influencers by name', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers?search=Test')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Should find our test influencer
        const found = response.body.data.some((influencer: any) =>
          influencer.name.includes('Test'),
        );
        expect(found).toBe(true);
      });

      it('should sort influencers by createdAt', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers?sortBy=createdAt&sortOrder=desc')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Should have data sorted by createdAt desc
        if (response.body.data.length > 1) {
          const dates = response.body.data.map((i: any) =>
            new Date(i.createdAt).getTime(),
          );
          for (let i = 1; i < dates.length; i++) {
            expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
          }
        }
      });
    });

    describe('GET /admin/influencers/all', () => {
      it('should return all influencers', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        const influencer = response.body.find(
          (i: any) => i.id === testInfluencerId,
        );
        expect(influencer).toBeDefined();
        expect(influencer.name).toBe('Test Influencer');
        expect(influencer.email).toBe('testinfluencer@admin.test');
      });
    });

    describe('GET /admin/influencers/recent', () => {
      it('should return recent influencers', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers/recent?limit=3')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(3);

        // Should have our test influencer (most recent)
        const influencer = response.body.find(
          (i: any) => i.id === testInfluencerId,
        );
        expect(influencer).toBeDefined();
      });
    });

    describe('GET /admin/influencers/:influencerId', () => {
      it('should return influencer by ID', async () => {
        const response = await request(app.getHttpServer())
          .get(`/admin/influencers/${testInfluencerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.id).toBe(testInfluencerId);
        expect(response.body.name).toBe('Test Influencer');
        expect(response.body.email).toBe('testinfluencer@admin.test');
        expect(response.body.userType).toBe('influencer');
        expect(response.body).toHaveProperty('campaignStats');
        expect(response.body).toHaveProperty('recentLoginSessions');
        expect(Array.isArray(response.body.campaignOffers)).toBe(true);
      });

      it('should return 404 for non-existent influencer', async () => {
        await request(app.getHttpServer())
          .get(`/admin/influencers/${uuidv4()}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('GET /admin/influencers/:influencerId/login-history', () => {
      it('should return influencer login history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/admin/influencers/${testInfluencerId}/login-history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        const session = response.body[0];
        expect(session).toHaveProperty('device', 'Test Device');
        expect(session).toHaveProperty('ipAddress', '192.168.1.1');
        expect(session).toHaveProperty('location', 'Test City, Test Country');
      });

      it('should limit results based on query parameter', async () => {
        const response = await request(app.getHttpServer())
          .get(`/admin/influencers/${testInfluencerId}/login-history?limit=1`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /admin/influencers/:influencerId/campaign-offers', () => {
      it('should return influencer campaign offers', async () => {
        const response = await request(app.getHttpServer())
          .get(`/admin/influencers/${testInfluencerId}/campaign-offers`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const offer = response.body.data.find(
          (o: any) => o.id === testCampaignOfferId,
        );
        expect(offer).toBeDefined();
        expect(offer.status).toBe('PENDING');
        expect(offer.business).toBeDefined();
        expect(offer.business.name).toBe('Test Business for Influencers');
        expect(offer.campaign).toBeDefined();
        expect(offer.campaign.name).toBe('Test Campaign');
      });

      it('should filter campaign offers by status', async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/admin/influencers/${testInfluencerId}/campaign-offers?status=PENDING`,
          )
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        response.body.data.forEach((offer: any) => {
          expect(offer.status).toBe('PENDING');
        });
      });
    });

    describe('POST /admin/influencers/:influencerId/reset-password', () => {
      it('should force password reset', async () => {
        const response = await request(app.getHttpServer())
          .post(`/admin/influencers/${testInfluencerId}/reset-password`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
      });

      it('should return 404 for non-existent influencer', async () => {
        await request(app.getHttpServer())
          .post(`/admin/influencers/${uuidv4()}/reset-password`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('PATCH /admin/influencers/:influencerId/email', () => {
      it('should change influencer email', async () => {
        const newEmail = 'updated-influencer@admin.test';
        const response = await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/email`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ email: newEmail })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);

        // Verify the change in database
        const updatedInfluencer = await prisma.influencer.findUnique({
          where: { id: testInfluencerId },
        });
        expect(updatedInfluencer?.email).toBe(newEmail);
        expect(updatedInfluencer?.isEmailConfirmed).toBe(false); // Should reset confirmation
      });

      it('should return 400 for duplicate email', async () => {
        // Create another influencer with different email
        const anotherInfluencer = await prisma.influencer.create({
          data: {
            name: 'Another Influencer',
            email: 'another@admin.test',
            username: 'anotherinfluencer',
            password: await bcrypt.hash('testpassword', 10),
            isEmailConfirmed: true,
          },
        });

        // Try to change first influencer to same email
        await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/email`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ email: 'another@admin.test' })
          .expect(400);

        // Clean up
        await prisma.influencer.delete({
          where: { id: anotherInfluencer.id },
        });
      });
    });

    describe('PATCH /admin/influencers/:influencerId/phone', () => {
      it('should change influencer phone number', async () => {
        const newPhone = '+19876543210';
        const response = await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/phone`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ phoneNumber: newPhone })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);

        // Verify the change in database
        const updatedInfluencer = await prisma.influencer.findUnique({
          where: { id: testInfluencerId },
        });
        expect(updatedInfluencer?.phoneNumber).toBe(newPhone);
      });

      it('should return 400 for duplicate phone number', async () => {
        // Create another influencer with different phone
        const anotherInfluencer = await prisma.influencer.create({
          data: {
            name: 'Duplicate Phone Influencer',
            email: 'duplicatephone@admin.test',
            username: 'duplicatephone',
            phoneNumber: '+1122334455',
            password: await bcrypt.hash('testpassword', 10),
            isEmailConfirmed: true,
          },
        });

        // Try to change first influencer to same phone
        await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/phone`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ phoneNumber: '+1122334455' })
          .expect(400);

        // Clean up
        await prisma.influencer.delete({
          where: { id: anotherInfluencer.id },
        });
      });
    });

    describe('PATCH /admin/influencers/:influencerId/status', () => {
      it('should activate influencer', async () => {
        // First deactivate the influencer
        await prisma.influencer.update({
          where: { id: testInfluencerId },
          data: { isEmailConfirmed: false },
        });

        const response = await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isActive: true })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);

        const updatedInfluencer = await prisma.influencer.findUnique({
          where: { id: testInfluencerId },
        });
        expect(updatedInfluencer?.isEmailConfirmed).toBe(true);
      });

      it('should deactivate influencer', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/admin/influencers/${testInfluencerId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isActive: false })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);

        const updatedInfluencer = await prisma.influencer.findUnique({
          where: { id: testInfluencerId },
        });
        expect(updatedInfluencer?.isEmailConfirmed).toBe(false);
      });

      it('should return 404 for non-existent influencer', async () => {
        await request(app.getHttpServer())
          .patch(`/admin/influencers/${uuidv4()}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isActive: true })
          .expect(404);
      });
    });

    describe('GET /admin/influencers/search/advanced', () => {
      it('should search influencers with multiple filters', async () => {
        const response = await request(app.getHttpServer())
          .get(
            '/admin/influencers/search/advanced?search=Test&status=ACTIVE&sortBy=name&sortOrder=asc',
          )
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should search by email', async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/admin/influencers/search/advanced?email=${encodeURIComponent('testinfluencer@admin.test')}`,
          )
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach((influencer: any) => {
          expect(influencer.email).toContain('testinfluencer@admin.test');
        });
      });

      it('should search by username', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/influencers/search/advanced?username=testinfluencer')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        const influencer = response.body.data.find(
          (i: any) => i.username === 'testinfluencer',
        );
        expect(influencer).toBeDefined();
      });
    });

    describe('Authentication', () => {
      it('should return 401 without authentication token', async () => {
        await request(app.getHttpServer())
          .get('/admin/influencers')
          .expect(401);
      });

      it('should return 401 with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/admin/influencers')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });
});
