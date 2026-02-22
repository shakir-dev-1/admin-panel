/* eslint-disable @typescript-eslint/no-unused-vars */
// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Starting seed…');

  // ── 1. Scopes ──────────────────────────────────────────────────────────────
  const scopeNames = [
    { name: 'read:business', description: 'View business details' },
    { name: 'write:business', description: 'Create / update business data' },
    { name: 'read:employees', description: 'View employee list' },
    { name: 'write:employees', description: 'Manage employees' },
    { name: 'read:reports', description: 'Access financial reports' },
    { name: 'manage:billing', description: 'Manage subscriptions & billing' },
  ];

  const scopes = await Promise.all(
    scopeNames.map((s) =>
      prisma.scope.upsert({
        where: { name: s.name },
        update: {},
        create: { name: s.name, description: s.description },
      }),
    ),
  );
  console.log(`  ✔  ${scopes.length} scopes`);

  // ── 2. Roles ───────────────────────────────────────────────────────────────
  const roleData = [
    { name: 'OWNER' as const, description: 'Full access' },
    { name: 'ADMIN' as const, description: 'Administrative access' },
    { name: 'EMPLOYEE' as const, description: 'Employee access' },
    { name: 'USER' as const, description: 'Regular user' },
  ];

  const roles = await Promise.all(
    roleData.map((r) =>
      prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: { name: r.name, description: r.description },
      }),
    ),
  );
  console.log(`  ✔  ${roles.length} roles`);

  // ── 3. RoleScopes ──────────────────────────────────────────────────────────
  const ownerRole = roles.find((r) => r.name === 'OWNER')!;
  const adminRole = roles.find((r) => r.name === 'ADMIN')!;
  const employeeRole = roles.find((r) => r.name === 'EMPLOYEE')!;

  // Owner gets all scopes; Admin gets most; Employee gets read scopes only
  const roleScopeMap: { role: typeof ownerRole; scopeNames: string[] }[] = [
    { role: ownerRole, scopeNames: scopes.map((s) => s.name) },
    {
      role: adminRole,
      scopeNames: [
        'read:business',
        'write:business',
        'read:employees',
        'write:employees',
        'read:reports',
      ],
    },
    { role: employeeRole, scopeNames: ['read:business', 'read:employees'] },
  ];

  for (const { role, scopeNames: names } of roleScopeMap) {
    for (const name of names) {
      const scope = scopes.find((s) => s.name === name)!;
      await prisma.roleScope.upsert({
        where: { roleId_scopeId: { roleId: role.id, scopeId: scope.id } },
        update: {},
        create: { roleId: role.id, scopeId: scope.id },
      });
    }
  }
  console.log('  ✔  role-scopes assigned');

  // ── 4. Admin ───────────────────────────────────────────────────────────────
  const admin = await prisma.admin.upsert({
    where: { email: 'superadmin@platform.dev' },
    update: {},
    create: {
      email: 'superadmin@platform.dev',
      password: '$2b$12$hashedPasswordPlaceholder', // replace with real bcrypt hash
      isActive: true,
    },
  });
  console.log('  ✔  admin');

  // ── 5. Service Categories & Services ──────────────────────────────────────
  const categoryData = [
    {
      title: 'Hair',
      services: ['Haircut', 'Hair Color', 'Blowout', 'Keratin Treatment'],
    },
    {
      title: 'Nails',
      services: ['Manicure', 'Pedicure', 'Gel Nails', 'Nail Art'],
    },
    {
      title: 'Skin',
      services: ['Facial', 'Microdermabrasion', 'Chemical Peel'],
    },
    {
      title: 'Massage',
      services: ['Swedish Massage', 'Deep Tissue', 'Hot Stone'],
    },
  ];

  const categories: Record<
    string,
    Awaited<ReturnType<typeof prisma.serviceCategory.upsert>>
  > = {};
  const services: Record<
    string,
    Awaited<ReturnType<typeof prisma.service.upsert>>
  > = {};

  for (const cat of categoryData) {
    const category = await prisma.serviceCategory.upsert({
      where: { title: cat.title },
      update: {},
      create: { title: cat.title, isApproved: true },
    });
    categories[cat.title] = category;

    for (const svcTitle of cat.services) {
      const svc = await prisma.service.upsert({
        where: {
          categoryId_title: { categoryId: category.id, title: svcTitle },
        },
        update: {},
        create: { title: svcTitle, categoryId: category.id, isApproved: true },
      });
      services[svcTitle] = svc;
    }
  }
  console.log(
    `  ✔  ${Object.keys(categories).length} categories / ${Object.keys(services).length} services`,
  );

  // ── 6. Interests ───────────────────────────────────────────────────────────
  const interestData = [
    {
      name: 'Beauty & Wellness',
      industryTypes: ['BEAUTY'],
      categories: ['Hair', 'Nails'],
    },
    { name: 'Skincare', industryTypes: ['BEAUTY'], categories: ['Skin'] },
    {
      name: 'Relaxation',
      industryTypes: ['WELLNESS'],
      categories: ['Massage'],
    },
    { name: 'Fitness', industryTypes: ['FITNESS'], categories: [] },
  ];

  const interests = await Promise.all(
    interestData.map((i) =>
      prisma.interest.upsert({
        where: { name: i.name },
        update: {},
        create: {
          name: i.name,
          industryTypes: i.industryTypes,
          categories: i.categories,
          isApproved: true,
        },
      }),
    ),
  );
  console.log(`  ✔  ${interests.length} interests`);

  // ── 7. Languages & Amenities ───────────────────────────────────────────────
  const languages = await Promise.all(
    ['English', 'Spanish', 'French', 'Urdu'].map((name) =>
      prisma.language.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const amenities = await Promise.all(
    [
      'Free Wi-Fi',
      'Parking',
      'Wheelchair Access',
      'Coffee & Tea',
      'Air Conditioning',
    ].map((name) =>
      prisma.amenity.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  console.log(
    `  ✔  ${languages.length} languages / ${amenities.length} amenities`,
  );

  // ── 8. Subscription Plans ─────────────────────────────────────────────────
  const subscriptionData = [
    {
      title: 'Starter',
      country: 'US',
      prices: [
        { billingCycle: 'MONTH', amount: 29, currency: 'USD' },
        { billingCycle: 'YEAR', amount: 290, currency: 'USD' },
      ],
      features: ['Up to 3 employees', 'Basic booking', 'Email support'],
      trialPeriodDays: 14,
    },
    {
      title: 'Professional',
      country: 'US',
      prices: [
        { billingCycle: 'MONTH', amount: 79, currency: 'USD' },
        { billingCycle: 'YEAR', amount: 790, currency: 'USD' },
      ],
      features: [
        'Up to 10 employees',
        'Advanced booking',
        'Priority support',
        'Analytics',
      ],
      trialPeriodDays: 14,
    },
    {
      title: 'Enterprise',
      country: 'US',
      prices: [
        { billingCycle: 'MONTH', amount: 199, currency: 'USD' },
        { billingCycle: 'YEAR', amount: 1990, currency: 'USD' },
      ],
      features: [
        'Unlimited employees',
        'Full feature access',
        'Dedicated support',
        'Custom integrations',
      ],
      trialPeriodDays: 30,
    },
  ];

  const subscriptions = await Promise.all(
    subscriptionData.map((s) =>
      prisma.subscription.upsert({
        where: { title: s.title },
        update: {},
        create: {
          title: s.title,
          country: s.country,
          prices: s.prices,
          features: s.features,
          trialPeriodDays: s.trialPeriodDays,
        },
      }),
    ),
  );
  console.log(`  ✔  ${subscriptions.length} subscription plans`);

  // ── 9. End Users (Consumer) ────────────────────────────────────────────────
  const usersData = [
    {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      clerkUserId: 'clerk_user_001',
      username: 'alicej',
    },
    {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      clerkUserId: 'clerk_user_002',
      username: 'bsmith',
    },
    {
      firstName: 'Carol',
      lastName: 'White',
      email: 'carol@example.com',
      clerkUserId: 'clerk_user_003',
      username: 'carolw',
    },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          isEmailConfirmed: true,
          isAgreementAccepted: true,
          onboardingCompleted: true,
          hasAcceptedPolicy: true,
          interests: {
            connect: [{ id: interests[0].id }, { id: interests[1].id }],
          },
        },
      }),
    ),
  );
  console.log(`  ✔  ${users.length} end-users`);

  // ── 10. Business Users (Owners / Employees) ────────────────────────────────
  const businessUsersData = [
    {
      email: 'owner1@salon.dev',
      clerkUserId: 'clerk_bu_001',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      referralCode: 'JANE2024',
      username: 'janedoe',
      phoneNumber: '+12025550101',
    },
    {
      email: 'owner2@barbershop.dev',
      clerkUserId: 'clerk_bu_002',
      firstName: 'Mark',
      lastName: 'Taylor',
      fullName: 'Mark Taylor',
      referralCode: 'MARK2024',
      username: 'marktaylor',
      phoneNumber: '+12025550102',
    },
    {
      email: 'employee1@salon.dev',
      clerkUserId: 'clerk_bu_003',
      firstName: 'Sara',
      lastName: 'Lee',
      fullName: 'Sara Lee',
      referralCode: 'SARA2024',
      username: 'saralee',
      phoneNumber: '+12025550103',
    },
    {
      email: 'employee2@salon.dev',
      clerkUserId: 'clerk_bu_004',
      firstName: 'Tom',
      lastName: 'Brown',
      fullName: 'Tom Brown',
      referralCode: 'TOM2024',
      username: 'tombrown',
      phoneNumber: '+12025550104',
    },
  ];

  const businessUsers = await Promise.all(
    businessUsersData.map((bu) =>
      prisma.businessUser.upsert({
        where: { email: bu.email },
        update: {},
        create: {
          ...bu,
          isEmailConfirmed: true,
          isAgreementAccepted: true,
        },
      }),
    ),
  );
  console.log(`  ✔  ${businessUsers.length} business-users`);

  // ── 11. Businesses ─────────────────────────────────────────────────────────
  const business1 = await prisma.business.upsert({
    where: { id: 'bus-seed-001' },
    update: {},
    create: {
      id: 'bus-seed-001',
      clerkOrganizationId: 'clerk_org_001',
      name: 'Glamour Hair Studio',
      description: 'Premium hair salon offering cuts, colors, and treatments.',
      industryType: ['BEAUTY'],
      city: 'New York',
      zipcode: '10001',
      address: '123 Fifth Ave',
      state: 'NY',
      country: 'US',
      phoneNumber: '+12125550199',
      email: 'hello@glamourhair.dev',
      isEmailConfirmed: true,
      isVerified: true,
      website: 'https://glamourhair.dev',
      languages: {
        connect: [{ id: languages[0].id }, { id: languages[1].id }],
      },
      amenities: {
        connect: [{ id: amenities[0].id }, { id: amenities[1].id }],
      },
    },
  });

  const business2 = await prisma.business.upsert({
    where: { id: 'bus-seed-002' },
    update: {},
    create: {
      id: 'bus-seed-002',
      clerkOrganizationId: 'clerk_org_002',
      name: "Mark's Barbershop",
      description: 'Classic cuts and grooming for modern men.',
      industryType: ['BEAUTY', 'GROOMING'],
      city: 'Los Angeles',
      zipcode: '90001',
      address: '456 Sunset Blvd',
      state: 'CA',
      country: 'US',
      phoneNumber: '+13105550299',
      email: 'info@marksbarbershop.dev',
      isEmailConfirmed: true,
      isVerified: true,
      languages: { connect: [{ id: languages[0].id }] },
      amenities: {
        connect: [{ id: amenities[2].id }, { id: amenities[4].id }],
      },
    },
  });

  console.log('  ✔  2 businesses');

  // ── 12. Business Social Media ──────────────────────────────────────────────
  await prisma.businessSocialMedia.upsert({
    where: { businessId: business1.id },
    update: {},
    create: {
      businessId: business1.id,
      instagram: 'https://instagram.com/glamourhair',
      facebook: 'https://facebook.com/glamourhair',
    },
  });

  await prisma.businessSocialMedia.upsert({
    where: { businessId: business2.id },
    update: {},
    create: {
      businessId: business2.id,
      instagram: 'https://instagram.com/marksbarbershop',
    },
  });

  // ── 13. Business Hours ─────────────────────────────────────────────────────
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  for (const business of [business1, business2]) {
    for (const weekday of weekdays) {
      const isClosed = weekday === 'Sunday';
      await prisma.businessHours.upsert({
        where: { businessId_weekday: { businessId: business.id, weekday } },
        update: {},
        create: {
          businessId: business.id, // ← fixed: was bare `businessId` reference
          weekday,
          isClosed,
          openingHour: isClosed ? undefined : 9,
          openingMinute: isClosed ? undefined : 0,
          openingPeriod: isClosed ? undefined : 'AM',
          closingHour: isClosed ? undefined : 7,
          closingMinute: isClosed ? undefined : 0,
          closingPeriod: isClosed ? undefined : 'PM',
        },
      });
    }
  }
  console.log('  ✔  business hours');

  // ── 14. Coordinates ────────────────────────────────────────────────────────
  await prisma.coordinates.upsert({
    where: { businessId: business1.id },
    update: {},
    create: {
      businessId: business1.id,
      latitude: 40.7484,
      longitude: -73.9967,
      timezone: 'America/New_York',
    },
  });

  await prisma.coordinates.upsert({
    where: { businessId: business2.id },
    update: {},
    create: {
      businessId: business2.id,
      latitude: 34.0928,
      longitude: -118.3287,
      timezone: 'America/Los_Angeles',
    },
  });

  // ── 15. Business Members ───────────────────────────────────────────────────
  const [ownerBU1, ownerBU2, empBU1, empBU2] = businessUsers;

  const member1 = await prisma.businessMember.upsert({
    where: { businessUserId: ownerBU1.id },
    update: {},
    create: {
      businessUserId: ownerBU1.id,
      businessId: business1.id,
      roleId: ownerRole.id,
      designation: 'Salon Owner',
      onlineBooking: true,
      walkInBooking: true,
    },
  });

  const member2 = await prisma.businessMember.upsert({
    where: { businessUserId: ownerBU2.id },
    update: {},
    create: {
      businessUserId: ownerBU2.id,
      businessId: business2.id,
      roleId: ownerRole.id,
      designation: 'Barbershop Owner',
      onlineBooking: true,
      walkInBooking: true,
    },
  });

  const member3 = await prisma.businessMember.upsert({
    where: { businessUserId: empBU1.id },
    update: {},
    create: {
      businessUserId: empBU1.id,
      businessId: business1.id,
      roleId: employeeRole.id,
      designation: 'Senior Stylist',
      onlineBooking: true,
      walkInBooking: false,
    },
  });

  const member4 = await prisma.businessMember.upsert({
    where: { businessUserId: empBU2.id },
    update: {},
    create: {
      businessUserId: empBU2.id,
      businessId: business1.id,
      roleId: employeeRole.id,
      designation: 'Nail Technician',
      onlineBooking: true,
      walkInBooking: true,
    },
  });

  console.log('  ✔  4 business-members');

  // ── 16. Business Services ──────────────────────────────────────────────────
  const serviceConfigs = [
    {
      businessId: business1.id,
      serviceTitle: 'Haircut',
      price: 45,
      totalDuration: 45,
    },
    {
      businessId: business1.id,
      serviceTitle: 'Hair Color',
      price: 120,
      totalDuration: 90,
    },
    {
      businessId: business1.id,
      serviceTitle: 'Blowout',
      price: 55,
      totalDuration: 60,
    },
    {
      businessId: business1.id,
      serviceTitle: 'Manicure',
      price: 35,
      totalDuration: 45,
    },
    {
      businessId: business1.id,
      serviceTitle: 'Pedicure',
      price: 45,
      totalDuration: 60,
    },
    {
      businessId: business2.id,
      serviceTitle: 'Haircut',
      price: 30,
      totalDuration: 30,
    },
  ];

  const businessServices: Awaited<
    ReturnType<typeof prisma.businessService.upsert>
  >[] = [];

  for (const cfg of serviceConfigs) {
    const svc = services[cfg.serviceTitle];
    const bs = await prisma.businessService.upsert({
      where: {
        businessId_serviceId: { businessId: cfg.businessId, serviceId: svc.id },
      },
      update: {},
      create: {
        businessId: cfg.businessId,
        serviceId: svc.id,
        price: cfg.price,
        totalDuration: cfg.totalDuration,
        durationMinutes: cfg.totalDuration % 60,
        durationHours: Math.floor(cfg.totalDuration / 60) || undefined,
        enabled: true,
      },
    });
    businessServices.push(bs);
  }
  console.log(`  ✔  ${businessServices.length} business-services`);

  // ── 17. Assign employees to services ──────────────────────────────────────
  // member3 (Sara) → haircut + hair color; member4 (Tom) → manicure + pedicure
  const svcHaircut = businessServices.find(
    (bs) => bs.businessId === business1.id && bs.price === 45,
  );
  const svcHairColor = businessServices.find((bs) => bs.price === 120);
  const svcManicure = businessServices.find((bs) => bs.price === 35);
  const svcPedicure = businessServices.find(
    (bs) => bs.price === 45 && bs.totalDuration === 60,
  );

  for (const { memberId, bsId } of [
    { memberId: member3.id, bsId: svcHaircut?.id },
    { memberId: member3.id, bsId: svcHairColor?.id },
    { memberId: member4.id, bsId: svcManicure?.id },
    { memberId: member4.id, bsId: svcPedicure?.id },
  ]) {
    if (!bsId) continue;
    await prisma.businessMemberToBusinessService.upsert({
      where: {
        businessMemberId_businessServiceId: {
          businessMemberId: memberId,
          businessServiceId: bsId,
        },
      },
      update: {},
      create: { businessMemberId: memberId, businessServiceId: bsId },
    });
  }
  console.log('  ✔  employee-service assignments');

  // ── 18. Packages ───────────────────────────────────────────────────────────
  const pkg1 = await prisma.businessPackage.upsert({
    where: {
      businessId_title: {
        businessId: business1.id,
        title: 'Full Glam Package',
      },
    },
    update: {},
    create: {
      businessId: business1.id,
      title: 'Full Glam Package',
      price: 175,
      totalDuration: 150,
      durationHours: 2,
      durationMinutes: 30,
    },
  });

  // Link services to package
  if (svcHaircut && svcManicure) {
    for (const bsId of [svcHaircut.id, svcManicure.id]) {
      await prisma.businessPackageToService.upsert({
        where: {
          businessPackageId_businessServiceId: {
            businessPackageId: pkg1.id,
            businessServiceId: bsId,
          },
        },
        update: {},
        create: { businessPackageId: pkg1.id, businessServiceId: bsId },
      });
    }
  }
  console.log('  ✔  1 package');

  // ── 19. Promotions ─────────────────────────────────────────────────────────
  if (svcHairColor) {
    await prisma.promotion.upsert({
      where: { businessServiceId: svcHairColor.id },
      update: {},
      create: {
        businessServiceId: svcHairColor.id,
        discountType: 'PERCENTAGE',
        discountAmount: 15,
        enabled: true,
      },
    });
  }
  console.log('  ✔  promotions');

  // ── 20. Business Policy ────────────────────────────────────────────────────
  await prisma.businessPolicy.upsert({
    where: { businessId: business1.id },
    update: {},
    create: {
      businessId: business1.id,
      policy:
        'Cancellations must be made at least 24 hours in advance. Late arrivals may result in a shortened appointment.',
      show: true,
    },
  });

  // ── 21. Business Subscription ──────────────────────────────────────────────
  const proSub = subscriptions.find((s) => s.title === 'Professional')!;

  await prisma.businessSubscription.upsert({
    where: { customerTransactionId: 'cust-txn-seed-001' },
    update: {},
    create: {
      businessId: business1.id,
      subscriptionId: proSub.id,
      customerTransactionId: 'cust-txn-seed-001',
      billingCycle: 'MONTH',
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      isTrialUsed: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  ✔  business subscription');

  // ── 22. Business Clients ───────────────────────────────────────────────────
  const clientsData = [
    {
      businessId: business1.id,
      userId: users[0].id,
      fullName: 'Alice Johnson',
      phoneNumber: '+12125550001',
      email: 'alice@example.com',
      type: 'CLIENT' as const,
    },
    {
      businessId: business1.id,
      userId: users[1].id,
      fullName: 'Bob Smith',
      phoneNumber: '+12125550002',
      email: 'bob@example.com',
      type: 'CLIENT' as const,
    },
    {
      businessId: business1.id,
      userId: null,
      fullName: 'Walk-in Customer',
      phoneNumber: '+12125550003',
      email: 'walkin@example.com',
      type: 'CUSTOMER' as const,
    },
  ];

  const businessClients = await Promise.all(
    clientsData.map((c) =>
      prisma.businessClient.upsert({
        where: {
          businessId_email_phoneNumber: {
            businessId: c.businessId,
            email: c.email,
            phoneNumber: c.phoneNumber,
          },
        },
        update: {},
        create: c,
      }),
    ),
  );
  console.log(`  ✔  ${businessClients.length} business-clients`);

  // ── 23. Appointments ───────────────────────────────────────────────────────
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const appointmentsData = [
    {
      clientId: businessClients[0].id,
      businessId: business1.id,
      employeeId: member3.id,
      businessServiceId: svcHaircut?.id,
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 45 * 60 * 1000),
      status: 'CONFIRMED' as const,
      note: 'Client prefers minimal layers.',
    },
    {
      clientId: businessClients[1].id,
      businessId: business1.id,
      employeeId: member4.id,
      businessServiceId: svcManicure?.id,
      start: nextWeek,
      end: new Date(nextWeek.getTime() + 45 * 60 * 1000),
      status: 'CREATED' as const,
    },
    {
      clientId: businessClients[2].id,
      businessId: business1.id,
      employeeId: member3.id,
      businessServiceId: svcHairColor?.id,
      start: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      status: 'COMPLETED' as const,
    },
  ];

  const appointments = await Promise.all(
    appointmentsData.map((a) => prisma.appointment.create({ data: a })),
  );
  console.log(`  ✔  ${appointments.length} appointments`);

  // ── 24. Invoices & Transactions ────────────────────────────────────────────
  // Only for the completed appointment
  const completedAppt = appointments[2];

  const invoice = await prisma.invoice.create({
    data: {
      appointmentId: completedAppt.id,
      businessId: business1.id,
      amountDue: 102, // 120 * 0.85 after 15% promo
      amountPaid: 102,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    },
  });

  await prisma.transaction.create({
    data: {
      businessId: business1.id,
      invoiceId: invoice.id,
      amountSent: 102,
      amountReceived: 102,
      transactionType: 'PAY_IN',
      transactionStatus: 'PAID',
      paymentStatus: 'PAID',
    },
  });
  console.log('  ✔  invoice & transaction');

  // ── 25. Reviews ────────────────────────────────────────────────────────────
  await prisma.businessReview.upsert({
    where: {
      userId_businessId: { userId: users[0].id, businessId: business1.id },
    },
    update: {},
    create: {
      userId: users[0].id,
      businessId: business1.id,
      businessMemberId: member3.id,
      ratings: 4.5,
      review:
        'Amazing salon! Sara did a fantastic job with my haircut. Will definitely come back.',
      isPublic: true,
    },
  });
  console.log('  ✔  review');

  // ── 26. Influencer ─────────────────────────────────────────────────────────
  const influencer = await prisma.influencer.upsert({
    where: { email: 'glaminfluencer@social.dev' },
    update: {},
    create: {
      name: 'Glam Influencer',
      email: 'glaminfluencer@social.dev',
      username: 'glaminfluencer',
      phoneNumber: '+19175550001',
      isEmailConfirmed: true,
    },
  });

  const campaign = await prisma.collabCampaign.create({
    data: {
      name: 'Summer Glow 2024',
      businessId: business1.id,
    },
  });

  await prisma.campaignOffer.upsert({
    where: {
      campaign_offer_influencer_id_campaign_id_unique_index: {
        influencerId: influencer.id,
        campaignId: campaign.id,
      },
    },
    update: {},
    create: {
      influencerId: influencer.id,
      businessId: business1.id,
      campaignId: campaign.id,
      status: 'PENDING',
    },
  });
  console.log('  ✔  influencer + campaign offer');

  // ── 27. User favorites ─────────────────────────────────────────────────────
  await prisma.user.update({
    where: { id: users[0].id },
    data: { favorites: { connect: { id: business1.id } } },
  });

  // ── 28. User & BusinessUser settings ──────────────────────────────────────
  for (const user of users) {
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  for (const bu of businessUsers) {
    await prisma.businessUserSettings.upsert({
      where: { businessUserId: bu.id },
      update: {},
      create: { businessUserId: bu.id, appointmentNotification: true },
    });
  }
  console.log('  ✔  user & business-user settings');

  // ── 29. Search Entries ─────────────────────────────────────────────────────
  await prisma.searchEntry.upsert({
    where: {
      userId_businessId: { userId: users[0].id, businessId: business1.id },
    },
    update: {},
    create: { userId: users[0].id, businessId: business1.id },
  });

  // ── 30. Contact Us ─────────────────────────────────────────────────────────
  await prisma.contactUsEntry.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      phoneNumber: '+10000000000',
      message: 'I would love to partner with your platform!',
    },
  });

  // ── 31. AdminAuditLog ─────────────────────────────────────────────────────
  await prisma.adminAuditLog.createMany({
    data: [
      {
        adminId: admin.id,
        actionType: 'USER_BANNED',
        targetUserId: users[1].id,
        metadata: { reason: 'Violation of terms of service' },
      },
      {
        adminId: admin.id,
        actionType: 'BUSINESS_VERIFIED',
        metadata: { businessId: business1.id },
      },
      {
        // log with no admin (system-generated)
        actionType: 'SUBSCRIPTION_EXPIRED',
        metadata: { businessId: business2.id },
      },
    ],
  });
  console.log('  ✔  admin audit logs');

  // ── 32. RefreshTokens ─────────────────────────────────────────────────────
  // One per user type so the table is exercised
  await prisma.refreshToken.createMany({
    data: [
      {
        token: 'rt_user_seed_001',
        userAgent: 'Mozilla/5.0 (Macintosh) seed-agent',
        userId: users[0].id,
        ipAddress: '1.2.3.4',
        country: 'United States',
        city: 'New York',
        device: 'desktop',
      },
      {
        token: 'rt_bu_seed_001',
        userAgent: 'Mozilla/5.0 (iPhone) seed-agent',
        businessUserId: businessUsers[0].id,
        ipAddress: '5.6.7.8',
        country: 'United States',
        city: 'Los Angeles',
        device: 'mobile',
      },
      {
        token: 'rt_influencer_seed_001',
        userAgent: 'Mozilla/5.0 (Windows) seed-agent',
        influencerId: influencer.id,
        ipAddress: '9.10.11.12',
        country: 'United States',
        city: 'Chicago',
        device: 'desktop',
      },
    ],
    skipDuplicates: true,
  });
  console.log('  ✔  refresh tokens');

  // ── 33. EmployeeHours ─────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employeeHourDates = [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  });

  for (const member of [member3, member4]) {
    for (const date of employeeHourDates) {
      await prisma.employeeHours.upsert({
        where: { businessMemberId_date: { businessMemberId: member.id, date } },
        update: {},
        create: {
          businessMemberId: member.id,
          businessId: business1.id,
          date,
          isDayOff: false,
          startHour: 9,
          startMinute: 0,
          startPeriod: 'AM',
          endHour: 6,
          endMinute: 0,
          endPeriod: 'PM',
          startShift: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          endShift: new Date(date.getTime() + 18 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log('  ✔  employee hours');

  // ── 34. BusinessHoliday ───────────────────────────────────────────────────
  const christmasDate = new Date('2025-12-25T00:00:00.000Z');
  const newYearDate = new Date('2026-01-01T00:00:00.000Z');

  for (const business of [business1, business2]) {
    await prisma.businessHoliday.upsert({
      where: {
        businessId_date: { businessId: business.id, date: christmasDate },
      },
      update: {},
      create: {
        businessId: business.id,
        date: christmasDate,
        name: 'Christmas Day',
      },
    });
    await prisma.businessHoliday.upsert({
      where: {
        businessId_date: { businessId: business.id, date: newYearDate },
      },
      update: {},
      create: {
        businessId: business.id,
        date: newYearDate,
        name: "New Year's Day",
      },
    });
  }
  console.log('  ✔  business holidays');

  // ── 35. EmployeeClient ────────────────────────────────────────────────────
  // Assign Sara (member3) as the responsible stylist for Alice under the Hair category
  const hairCategory = categories['Hair'];
  await prisma.employeeClient.upsert({
    where: {
      businessMemberId_businessClientId_categoryId: {
        businessMemberId: member3.id,
        businessClientId: businessClients[0].id,
        categoryId: hairCategory.id,
      },
    },
    update: {},
    create: {
      businessMemberId: member3.id,
      businessClientId: businessClients[0].id,
      categoryId: hairCategory.id,
    },
  });

  const nailCategory = categories['Nails'];
  await prisma.employeeClient.upsert({
    where: {
      businessMemberId_businessClientId_categoryId: {
        businessMemberId: member4.id,
        businessClientId: businessClients[1].id,
        categoryId: nailCategory.id,
      },
    },
    update: {},
    create: {
      businessMemberId: member4.id,
      businessClientId: businessClients[1].id,
      categoryId: nailCategory.id,
    },
  });
  console.log('  ✔  employee clients');

  // ── 36. BusinessReviewReply ───────────────────────────────────────────────
  const existingReview = await prisma.businessReview.findFirst({
    where: { businessId: business1.id },
  });
  if (existingReview) {
    await prisma.businessReviewReply.create({
      data: {
        reviewId: existingReview.id,
        businessId: business1.id,
        reply:
          'Thank you so much for the kind words! We look forward to seeing you again.',
      },
    });
  }
  console.log('  ✔  business review reply');

  // ── 37. BusinessSubscriptionHistory ──────────────────────────────────────
  const existingBizSub = await prisma.businessSubscription.findFirst({
    where: { businessId: business1.id },
  });
  if (existingBizSub) {
    await prisma.businessSubscriptionHistory.create({
      data: {
        businessSubscriptionId: existingBizSub.id,
        subscriptionId: 'stripe_sub_seed_001',
        eventType: 'CREATED',
        newPlanId: proSub.id,
        amount: 7900,
        currency: 'USD',
        startDate: existingBizSub.startDate ?? new Date(),
        endDate:
          existingBizSub.endDate ??
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.businessSubscriptionHistory.create({
      data: {
        businessSubscriptionId: existingBizSub.id,
        subscriptionId: 'stripe_sub_seed_001',
        eventType: 'RENEWED',
        amount: 7900,
        currency: 'USD',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('  ✔  business subscription history');

  // ── 38. Bank & BusinessPayoutInfo ─────────────────────────────────────────
  const bank = await prisma.bank.upsert({
    where: { bankCode: 'JPMC' },
    update: {},
    create: {
      bankName: 'JPMorgan Chase',
      bankCode: 'JPMC',
    },
  });

  await prisma.businessPayoutInfo.upsert({
    where: { businessId: business1.id },
    update: {},
    create: {
      businessId: business1.id,
      bankId: bank.id,
      msisdn: 'encrypted_msisdn',
      msisdnIv: 'iv_msisdn',
      cnic: 'encrypted_cnic',
      cnicIv: 'iv_cnic',
      accountTitle: 'Glamour Hair Studio LLC',
      accountNumber: 'encrypted_account_number',
      accountNumberIv: 'iv_account_number',
      countryCode: 'US',
    },
  });
  console.log('  ✔  bank & payout info');

  // ── 39. Invitations ───────────────────────────────────────────────────────
  await prisma.invitations.upsert({
    where: { email: 'newinvite1@example.com' },
    update: {},
    create: {
      email: 'newinvite1@example.com',
      code: 'INV-SEED-001',
      invitedByBusinessUserId: businessUsers[0].id,
      status: 'PENDING',
      businessUserType: 'REGULAR',
    },
  });
  await prisma.invitations.upsert({
    where: { email: 'newinvite2@example.com' },
    update: {},
    create: {
      email: 'newinvite2@example.com',
      code: 'INV-SEED-002',
      invitedByBusinessUserId: businessUsers[0].id,
      status: 'ACCEPTED',
      businessUserType: 'REFERRAL',
    },
  });
  console.log('  ✔  invitations');

  // ── 40. Rewards ───────────────────────────────────────────────────────────
  await prisma.reward.createMany({
    data: [
      {
        // Referrer reward: owner got credit for inviting someone
        businessUserId: businessUsers[0].id,
        referredByBusinessUserId: null,
        rewardType: 'TRIAL_DAYS',
        status: 'APPLIED',
        amount: 14,
      },
      {
        // Referred user reward: new user got a discount for signing up via referral
        businessUserId: businessUsers[1].id,
        referredByBusinessUserId: businessUsers[0].id,
        rewardType: 'DISCOUNT',
        status: 'PENDING',
        amount: 20,
      },
    ],
  });
  console.log('  ✔  rewards');

  // ── 41. BusinessAddOn ─────────────────────────────────────────────────────
  await prisma.businessAddOn.create({
    data: {
      businessId: business1.id,
      purchaseById: member1.id,
      type: 'EMPLOYEE',
      status: 'SUCCESS',
      price: 9.99,
      currency: 'USD',
    },
  });
  console.log('  ✔  business add-on');

  console.log('\n✅  Seed complete! All tables populated.');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
