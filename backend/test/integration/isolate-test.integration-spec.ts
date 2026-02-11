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

    console.log(`Admin login route called: ${loginRes.request.url}`);
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
  }, 30000);

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

 
});
