// admin-service.integration-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

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

    // Apply audit interceptor globally
    const auditInterceptor = app.get(AuditInterceptor);
    app.useGlobalInterceptors(auditInterceptor);

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

    /**
     * Create or find a test user for user-specific operations
     */
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User for Admin',
        email: 'testuser@admin.test',
        phone: '+1234567890',
        password: await bcrypt.hash('testpassword', 10), // Required field
        userType: 'USER', // Changed from 'CONSUMER' to match schema
        status: 'ACTIVE',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await prisma.user.deleteMany({
        where: { 
          OR: [
            { email: 'testuser@admin.test' },
            { email: 'updated-email@admin.test' }
          ]
        },
      });
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });
    }
    
    await prisma.admin.deleteMany({
      where: { email: 'testadmin@test.com' },
    });
    
    await app.close();
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
        expect(res.body[0]).toHaveProperty('userType'); // From getRecentUsers
        expect(res.body[0]).toHaveProperty('lastLoginAt');
      }
    });

    /**
     * 2. Get users with filtering/sorting/pagination
     */
    it('GET /admin/users - should get users with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=10&sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 10);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');

      if (res.body.data.length > 0) {
        const user = res.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('userType');
        expect(user).toHaveProperty('status');
      }
    });

    it('GET /admin/users - should filter by search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      // Should find our test user
      const foundUser = res.body.data.find((u: any) => 
        u.name && u.name.includes('Test')
      );
      expect(foundUser).toBeDefined();
    });

    it('GET /admin/users - should filter by user type', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users?type=USER') // Changed from CONSUMER to USER
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      if (res.body.data.length > 0) {
        res.body.data.forEach((user: any) => {
          expect(user.userType).toBe('USER');
        });
      }
    });

    /**
     * 3. Search users (existing endpoint)
     */
    it('GET /admin/users/search - should search users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users/search?q=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    /**
     * 4. Get user by ID
     */
    it('GET /admin/users/:userId - should get user by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUserId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('userType');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('business');
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
     * 5. Force password reset
     */
    it('POST /admin/users/:userId/reset-password - should force password reset', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201); // Changed to 201 since POST usually returns 201

      expect(res.body).toHaveProperty('success', true);
      
      // Verify password reset token was created
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });
      expect(resetToken).toBeDefined();
      expect(resetToken?.expiresAt).toBeInstanceOf(Date);
    });

    /**
     * 6. Change user email
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
    });

    /**
     * 7. Change user phone
     */
    it('PATCH /admin/users/:userId/phone - should change user phone', async () => {
      const newPhone = '+9876543210';

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/phone`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: newPhone })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify phone was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.phone).toBe(newPhone);
    });

    /**
     * 8. Change user status
     */
    it('PATCH /admin/users/:userId/status - should change user status to DISABLED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DISABLED' })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify status was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.status).toBe('DISABLED');
    });

    it('PATCH /admin/users/:userId/status - should reject invalid status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(res.body.message).toContain('Invalid status');
    });
  });

  describe('Authorization & Validation', () => {
    it('should reject unauthenticated access to protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401);

      await request(app.getHttpServer())
        .get('/admin/users/recent')
        .expect(401);

      await request(app.getHttpServer())
        .get(`/admin/users/${testUserId}`)
        .expect(401);
    });

    it('should validate query parameters for /admin/users', async () => {
      // Test invalid page number - your controller should handle this
      const res = await request(app.getHttpServer())
        .get('/admin/users?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Your controller should handle this gracefully

      expect(res.body.pagination.page).toBe(1); // Should default to 1
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
        .get(`/admin/${testAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testAdminId);
      expect(res.body).toHaveProperty('email', 'testadmin@test.com');
    });

    it('GET /admin/:id - should return 404 for non-existent admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});