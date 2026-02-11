// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

async function seedLogins() {
  console.log('Seeding login records...');

  // Get all users with their associated data
  const users = await prisma.user.findMany({
    include: {
      refreshTokens: true,
    },
  });

  const businessUsers = await prisma.businessUser.findMany({
    include: {
      refreshTokens: true,
    },
  });

  const influencers = await prisma.influencer.findMany({
    include: {
      refreshTokens: true,
    },
  });

  // Create login records for regular Users
  for (const user of users.slice(0, 20)) {
    // Seed for first 20 users
    // Multiple logins per user from different devices/dates
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          lastLogin: new Date('2026-02-10T14:30:00Z'),
          ipAddress: '192.168.1.105',
          country: 'United States',
          city: 'New York',
          latitude: 40.7128,
          longitude: -74.006,
          countryCode: 'US',
          regionName: 'New York',
          timezone: 'America/New_York',
          device: 'Desktop',
          userId: user.id,
          createdAt: new Date('2026-02-10T14:30:00Z'),
          updatedAt: new Date('2026-02-10T14:30:00Z'),
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          lastLogin: new Date('2026-02-09T09:15:00Z'),
          ipAddress: '192.168.1.120',
          country: 'United States',
          city: 'New York',
          latitude: 40.7128,
          longitude: -74.006,
          countryCode: 'US',
          regionName: 'New York',
          timezone: 'America/New_York',
          device: 'Mobile',
          deviceToken: `expo-${user.id.slice(0, 8)}-device-token`,
          userId: user.id,
          createdAt: new Date('2026-02-09T09:15:00Z'),
          updatedAt: new Date('2026-02-09T09:15:00Z'),
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          lastLogin: new Date('2026-02-08T19:45:00Z'),
          ipAddress: '192.168.1.150',
          country: 'United States',
          city: 'New York',
          latitude: 40.7128,
          longitude: -74.006,
          countryCode: 'US',
          regionName: 'New York',
          timezone: 'America/New_York',
          device: 'Laptop',
          userId: user.id,
          createdAt: new Date('2026-02-08T19:45:00Z'),
          updatedAt: new Date('2026-02-08T19:45:00Z'),
        },
      ],
      skipDuplicates: true, // Skip if user+userAgent combo already exists
    });
  }

  // Create login records for BusinessUsers
  for (const businessUser of businessUsers.slice(0, 15)) {
    // Business users typically log in during business hours
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          lastLogin: new Date('2026-02-11T08:30:00Z'),
          ipAddress: '203.0.113.45',
          country: 'Pakistan',
          city: 'Karachi',
          latitude: 24.8607,
          longitude: 67.0011,
          countryCode: 'PK',
          regionName: 'Sindh',
          timezone: 'Asia/Karachi',
          device: 'Desktop',
          deviceToken: `business-${businessUser.id.slice(0, 8)}-device`,
          businessUserId: businessUser.id,
          createdAt: new Date('2026-02-11T08:30:00Z'),
          updatedAt: new Date('2026-02-11T08:30:00Z'),
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          lastLogin: new Date('2026-02-10T22:15:00Z'),
          ipAddress: '203.0.113.78',
          country: 'Pakistan',
          city: 'Karachi',
          latitude: 24.8607,
          longitude: 67.0011,
          countryCode: 'PK',
          regionName: 'Sindh',
          timezone: 'Asia/Karachi',
          device: 'Tablet',
          businessUserId: businessUser.id,
          createdAt: new Date('2026-02-10T22:15:00Z'),
          updatedAt: new Date('2026-02-10T22:15:00Z'),
        },
      ],
      skipDuplicates: true,
    });
  }

  // Create login records for Influencers
  for (const influencer of influencers.slice(0, 10)) {
    // Influencers log in at various times, often from mobile devices
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          lastLogin: new Date('2026-02-11T12:45:00Z'),
          ipAddress: '198.51.100.23',
          country: 'United Arab Emirates',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          countryCode: 'AE',
          regionName: 'Dubai',
          timezone: 'Asia/Dubai',
          device: 'Mobile',
          deviceToken: `influencer-${influencer.id.slice(0, 8)}-token`,
          influencerId: influencer.id,
          createdAt: new Date('2026-02-11T12:45:00Z'),
          updatedAt: new Date('2026-02-11T12:45:00Z'),
        },
        {
          token: generateToken(),
          userAgent: 'Instagram 269.0.0.18.301 (iPhone; iOS 17_3; en_US)',
          lastLogin: new Date('2026-02-10T18:30:00Z'),
          ipAddress: '198.51.100.67',
          country: 'United Arab Emirates',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          countryCode: 'AE',
          regionName: 'Dubai',
          timezone: 'Asia/Dubai',
          device: 'Mobile App',
          influencerId: influencer.id,
          createdAt: new Date('2026-02-10T18:30:00Z'),
          updatedAt: new Date('2026-02-10T18:30:00Z'),
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          lastLogin: new Date('2026-02-09T21:00:00Z'),
          ipAddress: '198.51.100.89',
          country: 'United Arab Emirates',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          countryCode: 'AE',
          regionName: 'Dubai',
          timezone: 'Asia/Dubai',
          device: 'Laptop',
          influencerId: influencer.id,
          createdAt: new Date('2026-02-09T21:00:00Z'),
          updatedAt: new Date('2026-02-09T21:00:00Z'),
        },
      ],
      skipDuplicates: true,
    });
  }

  // Create login records for specific scenarios

  // 1. Multi-location business owner logging in from different cities
  const multiLocationOwner = businessUsers[0];
  if (multiLocationOwner) {
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          lastLogin: new Date('2026-02-11T09:00:00Z'),
          ipAddress: '203.0.113.100',
          country: 'Pakistan',
          city: 'Lahore',
          latitude: 31.5204,
          longitude: 74.3587,
          countryCode: 'PK',
          regionName: 'Punjab',
          timezone: 'Asia/Karachi',
          device: 'Desktop',
          businessUserId: multiLocationOwner.id,
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          lastLogin: new Date('2026-02-10T10:30:00Z'),
          ipAddress: '203.0.113.156',
          country: 'Pakistan',
          city: 'Islamabad',
          latitude: 33.6844,
          longitude: 73.0479,
          countryCode: 'PK',
          regionName: 'Islamabad',
          timezone: 'Asia/Karachi',
          device: 'Desktop',
          businessUserId: multiLocationOwner.id,
        },
      ],
      skipDuplicates: true,
    });
  }

  // 2. User with multiple active sessions (different devices)
  const powerUser = users[0];
  if (powerUser) {
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          lastLogin: new Date('2026-02-11T15:20:00Z'),
          ipAddress: '192.168.1.200',
          country: 'United States',
          city: 'Los Angeles',
          latitude: 34.0522,
          longitude: -118.2437,
          countryCode: 'US',
          regionName: 'California',
          timezone: 'America/Los_Angeles',
          device: 'Desktop',
          userId: powerUser.id,
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
          lastLogin: new Date('2026-02-11T08:45:00Z'),
          ipAddress: '192.168.1.201',
          country: 'United States',
          city: 'Los Angeles',
          latitude: 34.0522,
          longitude: -118.2437,
          countryCode: 'US',
          regionName: 'California',
          timezone: 'America/Los_Angeles',
          device: 'Mobile',
          deviceToken: `power-user-${powerUser.id.slice(0, 8)}-mobile`,
          userId: powerUser.id,
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
          lastLogin: new Date('2026-02-10T22:10:00Z'),
          ipAddress: '192.168.1.202',
          country: 'United States',
          city: 'Los Angeles',
          latitude: 34.0522,
          longitude: -118.2437,
          countryCode: 'US',
          regionName: 'California',
          timezone: 'America/Los_Angeles',
          device: 'Tablet',
          userId: powerUser.id,
        },
      ],
      skipDuplicates: true,
    });
  }

  // 3. Influencer traveling across countries
  const travelInfluencer = influencers[0];
  if (travelInfluencer) {
    await prisma.refreshToken.createMany({
      data: [
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
          lastLogin: new Date('2026-02-11T07:30:00Z'),
          ipAddress: '176.31.98.45',
          country: 'United Kingdom',
          city: 'London',
          latitude: 51.5074,
          longitude: -0.1278,
          countryCode: 'GB',
          regionName: 'London',
          timezone: 'Europe/London',
          device: 'Mobile',
          influencerId: travelInfluencer.id,
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
          lastLogin: new Date('2026-02-09T14:15:00Z'),
          ipAddress: '87.250.250.32',
          country: 'France',
          city: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          countryCode: 'FR',
          regionName: 'Île-de-France',
          timezone: 'Europe/Paris',
          device: 'Mobile',
          influencerId: travelInfluencer.id,
        },
        {
          token: generateToken(),
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
          lastLogin: new Date('2026-02-07T20:45:00Z'),
          ipAddress: '151.101.1.69',
          country: 'Italy',
          city: 'Milan',
          latitude: 45.4642,
          longitude: 9.19,
          countryCode: 'IT',
          regionName: 'Lombardy',
          timezone: 'Europe/Rome',
          device: 'Mobile',
          influencerId: travelInfluencer.id,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Login records seeded successfully');
}

// Helper function to generate a mock refresh token
function generateToken(): string {
  return `refresh_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
}

async function main() {
  try {
    await seedLogins();
  } catch (error) {
    console.error('Error seeding logins:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
