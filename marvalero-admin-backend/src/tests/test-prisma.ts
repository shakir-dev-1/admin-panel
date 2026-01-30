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

async function testConnection() {
  console.log('🔧 Testing Prisma Client...');
  console.log('📝 Using custom generated client from src/generated/prisma/');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database');
    
    // Try to count records
    const adminCount = await prisma.admin.count();
    console.log(`📊 Total admins: ${adminCount}`);
    
    // If table doesn't exist or is empty, create a test record
    if (adminCount === 0) {
      console.log('📝 Creating test admin...');
      const testAdmin = await prisma.admin.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          password: 'temporary_test_hash_' + Date.now(),
        },
      });
      console.log('✅ Test admin created with ID:', testAdmin.id);
    }
    
  } catch (error: any) {
    console.error('❌ Error details:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'P1001') {
      console.log('\n🔧 Check your DATABASE_URL in .env file');
      console.log('🔧 Make sure PostgreSQL is running');
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected');
  }
}

// Run the test
testConnection();