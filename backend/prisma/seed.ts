/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import { PrismaClient, Roles } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import amenitySeedData from './seeds/amenity.seed.json' with { type: 'json' };
import interestSeedData from './seeds/interest.seed.json' with { type: 'json' };
import languageSeedData from './seeds/language.seed.json' with { type: 'json' };
import serviceSeedData from './seeds/service.seed.json' with { type: 'json' };
import bankSeedData from './seeds/bank.seed.json' with { type: 'json' };
import scopesData from './seeds/scopes.seed.json' with { type: 'json' };
import rolesData from './seeds/roles.seed.json' with { type: 'json' };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

// Function to load subscription data
async function loadSubscriptionData() {
  const frontendUrl = process.env.FRONT_END_URL || '';

  const subFile = frontendUrl.includes('pro')
    ? './seeds/subscriptions-pro.json'
    : frontendUrl.includes('staging')
      ? './seeds/subscriptions-staging.json'
      : './seeds/subscriptions-dev.json';

  try {
    const { default: subscriptionData } = await import(subFile, {
      with: { type: 'json' },
    });
    return subscriptionData;
  } catch (error) {
    console.error('Error loading subscription data:', error);
    // Return empty array as fallback
    return [];
  }
}

async function seedScopes() {
  console.log('Seeding scopes...');
  await Promise.all(
    scopesData.map((scope: { name: string; description: string }) => {
      return prisma.scope.upsert({
        where: { name: scope.name },
        create: { name: scope.name, description: scope.description },
        update: { name: scope.name, description: scope.description },
      });
    }),
  );
  console.log('Scopes seeded successfully');
}

async function seedRoles() {
  console.log('Seeding roles...');
  const scopeRecords = await prisma.scope.findMany({
    select: { id: true, name: true },
  });

  for (const role of rolesData) {
    // Create or update the role
    const createdRole = await prisma.role.upsert({
      where: { name: role.name as Roles },
      create: { name: role.name as Roles, description: role.description },
      update: { name: role.name as Roles, description: role.description },
      select: { id: true, name: true },
    });

    let assignedScopes: { id: string; name: string }[] = [];

    if (role.name === Roles.OWNER || role.name === Roles.ADMIN) {
      assignedScopes = scopeRecords;
    } else if (role.name === Roles.EMPLOYEE) {
      assignedScopes = scopeRecords.filter((s) => {
        const definedScopes = scopesData.find((scope) => scope.name === s.name);
        return definedScopes?.roles.includes(role.name.toLowerCase());
      });
    }

    if (assignedScopes.length > 0) {
      // First, get existing role-scope mappings to avoid duplicates
      const existingRoleScopes = await prisma.roleScope.findMany({
        where: {
          roleId: createdRole.id,
          scopeId: { in: assignedScopes.map((s) => s.id) },
        },
        select: { scopeId: true },
      });

      const existingScopeIds = new Set(
        existingRoleScopes.map((rs) => rs.scopeId),
      );

      // Filter out scopes that are already assigned
      const scopesToAssign = assignedScopes.filter(
        (scope) => !existingScopeIds.has(scope.id),
      );

      if (scopesToAssign.length > 0) {
        // Use createMany for bulk insertion
        await prisma.roleScope.createMany({
          data: scopesToAssign.map((scope) => ({
            roleId: createdRole.id,
            scopeId: scope.id,
          })),
          skipDuplicates: true, // This is important
        });
      }
    }
  }
  console.log('Roles seeded successfully');
}

async function seedInterests() {
  console.log('Seeding interests...');
  await Promise.all(
    interestSeedData.map(
      (interest: {
        interest: string;
        industryTypes: string[];
        categories: string[];
      }) => {
        return prisma.interest.upsert({
          where: { name: interest.interest },
          create: {
            name: interest.interest,
            isApproved: true,
            industryTypes: interest.industryTypes,
            categories: interest.categories,
          },
          update: {
            name: interest.interest,
            isApproved: true,
            industryTypes: interest.industryTypes,
            categories: interest.categories,
          },
        });
      },
    ),
  );
  console.log('Interests seeded successfully');
}

async function seedBanks() {
  console.log('Seeding banks...');
  await Promise.all(
    bankSeedData.map((bank: { name: string; code: string }) => {
      return prisma.bank.upsert({
        where: { bankCode: bank.code },
        create: { bankName: bank.name, bankCode: bank.code },
        update: { bankName: bank.name, bankCode: bank.code },
      });
    }),
  );
  console.log('Banks seeded successfully');
}

async function seedAmenities() {
  console.log('Seeding amenities...');
  await Promise.all(
    amenitySeedData.map((amenity: string) => {
      return prisma.amenity.upsert({
        where: { name: amenity },
        create: { name: amenity },
        update: { name: amenity },
      });
    }),
  );
  console.log('Amenities seeded successfully');
}

async function seedLanguages() {
  console.log('Seeding languages...');
  await Promise.all(
    languageSeedData.map((language: string) => {
      return prisma.language.upsert({
        where: { name: language },
        create: { name: language },
        update: { name: language },
      });
    }),
  );
  console.log('Languages seeded successfully');
}

async function seedSubscriptions(): Promise<void> {
  console.log('Seeding subscriptions...');
  const subscriptionData = await loadSubscriptionData();

  await Promise.all(
    subscriptionData.map((subscription: any) => {
      return prisma.subscription.upsert({
        where: { title: subscription.title },
        create: subscription,
        update: subscription,
      });
    }),
  );
  console.log('Subscriptions seeded successfully');
}

async function seedServices() {
  console.log('Seeding service categories...');

  // First, seed all categories
  const categories = await Promise.all(
    serviceSeedData.map((service: { category: string }) => {
      return prisma.serviceCategory.upsert({
        where: { title: service.category },
        create: { title: service.category, isApproved: true },
        update: { title: service.category, isApproved: true },
      });
    }),
  );

  console.log('Seeding services sequentially...');

  let count = 0;
  const allServicesToCreate: Array<{
    title: string;
    categoryId: string;
    isApproved: boolean;
  }> = [];

  // First, collect all services data
  for (const serviceData of serviceSeedData) {
    const category = categories.find(
      (cat) => cat.title === serviceData.category,
    );

    if (!category) {
      console.warn(
        `Category ${serviceData.category} not found, skipping services`,
      );
      continue;
    }

    for (const serviceName of serviceData.services) {
      allServicesToCreate.push({
        title: serviceName,
        categoryId: category.id,
        isApproved: true,
      });
    }
  }

  // Use createMany with skipDuplicates for bulk insertion
  if (allServicesToCreate.length > 0) {
    try {
      const result = await prisma.service.createMany({
        data: allServicesToCreate,
        skipDuplicates: true, // Skip duplicates based on unique constraints
      });
      count = result.count;
      console.log(`Created ${count} services (duplicates skipped)`);
    } catch (error) {
      console.error(
        'Bulk service creation failed, falling back to individual upserts...',
        error,
      );

      // Fallback to individual upserts if bulk creation fails
      for (const service of allServicesToCreate) {
        try {
          await prisma.service.upsert({
            where: {
              categoryId_title: {
                title: service.title,
                categoryId: service.categoryId,
              },
            },
            create: service,
            update: { isApproved: true },
          });
          count++;

          if (count % 10 === 0) {
            console.log(`Seeded ${count} services...`);
          }
        } catch (upsertError) {
          console.error(
            `Failed to seed service "${service.title}":`,
            upsertError,
          );
        }
      }
    }
  }

  console.log(`Seeded ${count} services successfully`);
}

async function processingAllSeeds() {
  console.log('Starting foundational data seeding...');

  try {
    await prisma.$connect();

    // Run sequentially instead of in parallel
    await seedScopes();
    await seedRoles();
    await seedInterests();
    await seedAmenities();
    await seedLanguages();
    await seedBanks();
    await seedSubscriptions();
    await seedServices();

    console.log('✅ Foundational data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during foundational seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

processingAllSeeds()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
