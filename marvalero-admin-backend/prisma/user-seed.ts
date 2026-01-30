import { PrismaClient } from "../src/generated/prisma/client.js";
// import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";

dotenv.config();

console.log("Seeding started...");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding database...');

  /**
   * Clear existing data (dev only)
   */
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // /**
  //  * Admin user - using the email from your test: admin@marvalero.com
  //  */
  // const adminPassword = await hashPassword('admin123');
  // const admin = await prisma.admin.upsert({
  //   data: {
  //     email: 'admin@marvalero.com', // Changed to match your test
  //     password: adminPassword,
  //     isActive: true,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //   },
  // });

  /**
   * Regular users with hashed passwords
   */
  const johnPassword = await hashPassword('john123');
  const janePassword = await hashPassword('jane123');
  
  const users = await prisma.user.createMany({
    data: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+123456789',
        password: johnPassword,
        userType: 'CONSUMER',
        status: 'ACTIVE',
        lastLoginAt: new Date('2026-01-10'),
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+987654321',
        password: janePassword,
        userType: 'CONSUMER',
        status: 'DISABLED',
        lastLoginAt: new Date('2025-12-20'),
      },
    ],
  });

  /**
   * Business users with linked businesses and Stripe IDs
   * For testing Stripe endpoints
   */
  const business1Password = await hashPassword('business123');
  const business2Password = await hashPassword('business456');
  
  const businessUsers = await Promise.all([
    // Business 1: With Stripe IDs for testing Stripe endpoints
    prisma.user.create({
      data: {
        name: 'Ahmed Ali',
        email: 'ahmed@acme.com',
        phone: '+966500000001',
        password: business1Password,
        userType: 'BUSINESS',
        status: 'ACTIVE',
        lastLoginAt: new Date('2026-01-12'),
        business: {
          create: {
            name: 'Acme Trading LLC',
            stripeCustomerId: 'cus_test_123', // Added for Stripe testing
            stripeSubscriptionId: 'sub_test_123', // Added for Stripe testing
            subscriptionPlan: 'premium',
            subscriptionStatus: 'active',
          },
        },
      },
    }),
    // Business 2: WITHOUT Stripe IDs for testing 404 scenarios
    prisma.user.create({
      data: {
        name: 'Sarah Khan',
        email: 'sarah@techflow.io',
        phone: '+971500000002',
        password: business2Password,
        userType: 'BUSINESS',
        status: 'ACTIVE',
        lastLoginAt: new Date('2026-01-14'),
        business: {
          create: {
            name: 'TechFlow Solutions',
            // No Stripe IDs - for testing "Stripe customer not linked"
            subscriptionPlan: 'basic',
            subscriptionStatus: 'pending',
          },
        },
      },
    }),
    // Business 3: Another business with Stripe IDs
    prisma.user.create({
      data: {
        name: 'Michael Chen',
        email: 'michael@globaltech.com',
        phone: '+865500000003',
        password: await hashPassword('business789'),
        userType: 'BUSINESS',
        status: 'ACTIVE',
        lastLoginAt: new Date('2026-01-15'),
        business: {
          create: {
            name: 'Global Tech Inc.',
            stripeCustomerId: 'cus_test_456',
            stripeSubscriptionId: 'sub_test_456',
            subscriptionPlan: 'enterprise',
            subscriptionStatus: 'active',
          },
        },
      },
    }),
  ]);

  console.log('✅ Seed completed successfully');
  console.log('📊 Seed Summary:');
  // console.log(`   - Admin: ${admin.email} (password: admin123)`);
  console.log(`   - Business with Stripe IDs: ${businessUsers[0].email}`);
  console.log(`   - Business without Stripe IDs: ${businessUsers[1].email}`);
  console.log(`   - Total businesses created: ${businessUsers.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });