// Check what's in @prisma/client
import * as PrismaModule from '@prisma/client';
console.log('Exported keys:', Object.keys(PrismaModule));
console.log('PrismaClient type:', typeof PrismaModule.PrismaClient);

async function runTests() {
  try {
    // Method 1: Direct with options
    const client1 = new PrismaModule.PrismaClient({});
    console.log('✅ Method 1 worked - client created');
    await client1.$connect();
    console.log('✅ Connected successfully');
    await client1.$disconnect();
    console.log('✅ Disconnected');
  } catch (error: any) {
    console.error('❌ Method 1 failed:', error.message);
  }

  try {
    // Method 2: Check if there's a default export
    const client2 = new (PrismaModule as any).default({});
    console.log('✅ Method 2 worked');
  } catch (error: any) {
    console.error('❌ Method 2 failed:', error.message);
  }
}

// Run the async function
runTests().catch(console.error);