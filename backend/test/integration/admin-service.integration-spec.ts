// admin-service.integration-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('Admin Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testUserId: string;

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
    // First, create an admin user if it doesn't exist
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

    // Login and get token
    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        email: 'admin@marvalero.com',
        password: 'admin123',
      });

    console.log(`Admin login response status: ${loginRes.status}`);
    console.log(`Admin login response body: ${JSON.stringify(loginRes.body)}`);

    // Based on your console output, the response has accessToken
    adminToken = loginRes.body.accessToken;
    if (!adminToken) {
      console.error('Login response:', loginRes.body);
      throw new Error('Admin login failed, no token received');
    }

    console.log(
      `Admin logged in, token received: ${adminToken.slice(0, 20)}...`,
    );

    /**
     * Create a test regular user
     */
    console.log(`creating a test user`);

    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@admin.test',
        phoneNumber: '+1234567890',
        password: await bcrypt.hash('testpassword', 10),
        isAgreementAccepted: true,
        isEmailConfirmed: true,
        clerkUserId: `test-clerk-user-${uuidv4()}`, // REQUIRED FIELD - add unique clerkUserId
      },
    });
    testUserId = testUser.id;
    console.log(`Test user created with ID: ${testUserId}`);
  }, 10000);

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await prisma.user.deleteMany({
        where: {
          email: { in: ['testuser@admin.test', 'updated-email@admin.test'] },
        },
      });
    }

    await prisma.admin.deleteMany({
      where: { email: 'testadmin@test.com' },
    });

    await app.close();
  });

  describe('Admin Authentication', () => {
    it('POST /admin/auth/login - should login admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({
          email: 'admin@marvalero.com',
          password: 'admin123',
        })
        .expect(201); // Keep 201 as your login returns 201

      expect(res.body).toHaveProperty('accessToken');
    });

    it('POST /admin/auth/login - should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({
          email: 'admin@marvalero.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Admin Dashboard', () => {
    it('should access admin ping endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/ping')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Admin authenticated');
      expect(res.body).toHaveProperty('adminId');
    });

    it('should access admin dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Admin dashboard');
    });
  });

  describe('User Management - List/Search', () => {
    /**
     * 1. Get recent users
     */
    it('GET /admin/users/recent - should get recent users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users/recent?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('email');
        expect(res.body[0]).toHaveProperty('name'); // Combined firstName + lastName
        expect(res.body[0]).toHaveProperty('status'); // 'ACTIVE' or 'BANNED'
        expect(res.body[0]).toHaveProperty('businessName');
      }
    });

    /**
     * 1. Get users with pagination
     */
    it('GET /admin/users - should get users with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .query({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Validate the top-level structure defined in your PaginatedResult interface
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);

      // Validate pagination object
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      if (res.body.data.length > 0) {
        const user = res.body.data[0];
        // These match the mapping in your UsersService.getUsers()
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name'); // Combined firstName + lastName
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('phoneNumber');
        expect(user).toHaveProperty('status'); // 'ACTIVE' or 'BANNED'
        expect(user).toHaveProperty('businessName'); // Flattened from businessClients
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('lastLoginAt'); // Ensure this is present
      }
    });

    /**
     * 2. Search users
     */
    it('GET /admin/users - should filter by search term', async () => {
      const searchTerm = 'Test';
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);

      // If we expect a result, verify the logic
      if (res.body.data.length > 0) {
        const foundUser = res.body.data.some(
          (u: any) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        expect(foundUser).toBe(true);
      }
    });

    it('GET /admin/users/:userId - should return 404 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).toBe('User not found');
    });
  });

  describe('User Management - Actions', () => {
    /**
     * Force password reset
     */
    it('POST /admin/users/:userId/reset-password - should force password reset', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });

    /**
     * Change user email
     */
    it('PATCH /admin/users/:userId/email - should change user email', async () => {
      const newEmail = 'updated-email@admin.test';

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify email was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.email).toBe(newEmail);
      expect(updatedUser?.isEmailConfirmed).toBe(false); // Should reset confirmation
    });

    /**
     * Change user phone
     */
    it('PATCH /admin/users/:userId/phone - should change user phone', async () => {
      const newPhone = '+9876543210';

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/phone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phoneNumber: newPhone })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify phone was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.phoneNumber).toBe(newPhone);
      expect(updatedUser?.isPhoneConfirmed).toBe(false); // Should reset confirmation
    });

    /**
     * Change user status (ban/unban)
     * Note: Your controller expects { status: 'ACTIVE' | 'DISABLED' }
     * but your service expects { isBanned: boolean }
     * Let's try both ways
     */
    it('PATCH /admin/users/:userId/status - should ban user', async () => {
      // Try with isBanned first
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: true })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify status was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.isBanned).toBe(true);
      expect(updatedUser?.banDate).toBeInstanceOf(Date);
    });

    it('PATCH /admin/users/:userId/status - should unban user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: false })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify status was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.isBanned).toBe(false);
      expect(updatedUser?.banDate).toBeNull();
    });
  });

  describe('Business User Management', () => {
    /**
     * Get all business users
     */
    it('GET /admin/business/users - should get all business users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/business/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('email');
        expect(res.body[0]).toHaveProperty('fullName');
        expect(res.body[0]).toHaveProperty('userType'); // businessUserType
        expect(res.body[0]).toHaveProperty('status'); // 'ACTIVE' or 'PENDING_VERIFICATION'
        expect(res.body[0]).toHaveProperty('businesses');
      }
    });
  });

  describe('Authorization & Validation', () => {
    it('should reject unauthenticated access to protected endpoints', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);

      await request(app.getHttpServer()).get('/admin/users/recent').expect(401);

      await request(app.getHttpServer())
        .get(`/admin/users/${testUserId}`)
        .expect(401);
    });

    it('should validate query parameters for /admin/users', async () => {
      // Test invalid page number - should default to 1
      const res = await request(app.getHttpServer())
        .get('/admin/users?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Admin User Management', () => {
    let testAdminId: string;

    beforeAll(async () => {
      // Create a test admin for these tests
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      const testAdmin = await prisma.admin.create({
        data: {
          email: 'testadmin@test.com',
          password: hashedPassword,
          isActive: true,
        },
      });
      testAdminId = testAdmin.id;
    });

    afterAll(async () => {
      // Clean up test admin
      await prisma.admin.deleteMany({
        where: { email: 'testadmin@test.com' },
      });
    });

    it('GET /admin/:id - should get admin by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/admins/${testAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testAdminId);
      expect(res.body).toHaveProperty('email', 'testadmin@test.com');
      expect(res.body).toHaveProperty('isActive', true);
    });

    it('GET /admin/:id - should return 404 for non-existent admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('All Users Endpoints', () => {
    it('GET /admin/users/all - should get all users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('email');
        expect(res.body[0]).toHaveProperty('status');
        expect(res.body[0]).toHaveProperty('businessName');
      }
    });
  });
});
