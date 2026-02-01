// Use your custom generated client, not @prisma/client
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Create adapter for PostgreSQL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

// Create Prisma client WITH the adapter
const prisma = new PrismaClient({ adapter });

// Updated test-prisma.ts
async function testConnection() {
  console.log('🔧 Testing Prisma Client...');

  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to database');

    // Try to list ALL tables to see what exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    console.log('📋 Existing tables:', tables);

    // Try a simple query on ANY existing table
    // Check if 'users' table exists instead of 'admin'
    try {
      const userCount = await prisma.user.count();
      console.log(`📊 Total users: ${userCount}`);
    } catch {
      console.log("ℹ️ User table also doesn't exist yet");
    }
  } catch (error: any) {
    console.error('❌ Connection error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnection();
