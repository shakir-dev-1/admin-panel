// prisma/test-connection.ts
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    const result = await prisma.$queryRaw`SELECT 1+1 as result`;
    console.log('Query result:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
