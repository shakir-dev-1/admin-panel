/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';
import {
  PrismaClient,
  Roles,
  BusinessUserType,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
  BusinessClientType,
  SubscriptionStatus,
  BillingCycle,
  TwoFactorType,
  TransactionType,
  TransactionStatus,
  TransactionPaymentStatus,
  CampaignOfferStatus,
  AddOnType,
  AddOnStatus,
  RewardType,
  RewardStatus,
  InvitationStatus,
} from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Helper function to generate random coordinates within a city
function generateRandomCoordinates(city: string): {
  latitude: number;
  longitude: number;
} {
  // City center coordinates (simplified)
  const cityCenters: Record<string, { lat: number; lng: number }> = {
    'New York': { lat: 40.7128, lng: -74.006 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    Chicago: { lat: 41.8781, lng: -87.6298 },
    Houston: { lat: 29.7604, lng: -95.3698 },
    Phoenix: { lat: 33.4484, lng: -112.074 },
    London: { lat: 51.5074, lng: -0.1278 },
    Toronto: { lat: 43.6532, lng: -79.3832 },
    Sydney: { lat: -33.8688, lng: 151.2093 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Dubai: { lat: 25.2048, lng: 55.2708 },
  };

  const center = cityCenters[city] || { lat: 40.7128, lng: -74.006 };

  // Generate random offset (±0.05 degrees ~ ±5.5km)
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;

  return {
    latitude: center.lat + latOffset,
    longitude: center.lng + lngOffset,
  };
}

// Helper function to generate random business hours
function generateBusinessHours(businessId: string) {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const hours: Array<{
    businessId: string;
    weekday: string;
    isClosed: boolean;
    openingHour: number | null;
    openingMinute: number | null;
    openingPeriod: string | null;
    closingHour: number | null;
    closingMinute: number | null;
    closingPeriod: string | null;
  }> = [];

  for (const day of days) {
    const isClosed = day === 'Sunday' ? Math.random() > 0.5 : false;

    if (!isClosed) {
      const openingHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
      const closingHour = 17 + Math.floor(Math.random() * 5); // 5-9 PM

      hours.push({
        businessId,
        weekday: day,
        isClosed: false,
        openingHour,
        openingMinute: 0,
        openingPeriod: 'AM',
        closingHour: closingHour > 12 ? closingHour - 12 : closingHour,
        closingMinute: 0,
        closingPeriod: closingHour >= 12 ? 'PM' : 'AM',
      });
    } else {
      hours.push({
        businessId,
        weekday: day,
        isClosed: true,
        openingHour: null,
        openingMinute: null,
        openingPeriod: null,
        closingHour: null,
        closingMinute: null,
        closingPeriod: null,
      });
    }
  }

  return hours;
}

// Helper function to generate random dates
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

// Generate random phone number
function generatePhoneNumber(): string {
  const areaCode = Math.floor(100 + Math.random() * 900);
  const prefix = Math.floor(100 + Math.random() * 900);
  const lineNumber = Math.floor(1000 + Math.random() * 9000);
  return `+1${areaCode}${prefix}${lineNumber}`;
}

// Helper to generate unique referral codes
function generateReferralCode(name: string): string {
  const cleanName = name.replace(/\s+/g, '').toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName.substring(0, 4)}${randomNum}`;
}

// Helper to generate unique invite codes
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Seed Users
async function seedUsers() {
  console.log('Seeding users...');

  const users = [
    {
      clerkUserId: 'user_1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      phoneNumber: generatePhoneNumber(),
      dateOfBirth: new Date('1990-01-15'),
      gender: 'Male',
      isEmailConfirmed: true,
      isAgreementAccepted: true,
      onboardingCompleted: true,
      hasAcceptedPolicy: true,
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    {
      clerkUserId: 'user_2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      username: 'janesmith',
      phoneNumber: generatePhoneNumber(),
      dateOfBirth: new Date('1992-05-20'),
      gender: 'Female',
      isEmailConfirmed: true,
      isAgreementAccepted: true,
      onboardingCompleted: true,
      hasAcceptedPolicy: true,
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
    {
      clerkUserId: 'user_3',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.j@example.com',
      username: 'robertj',
      phoneNumber: generatePhoneNumber(),
      dateOfBirth: new Date('1988-08-30'),
      gender: 'Male',
      isEmailConfirmed: true,
      isAgreementAccepted: true,
      onboardingCompleted: true,
      hasAcceptedPolicy: true,
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
    },
    {
      clerkUserId: 'user_4',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.w@example.com',
      username: 'sarahw',
      phoneNumber: generatePhoneNumber(),
      dateOfBirth: new Date('1995-03-10'),
      gender: 'Female',
      isEmailConfirmed: true,
      isAgreementAccepted: true,
      onboardingCompleted: true,
      hasAcceptedPolicy: true,
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    {
      clerkUserId: 'user_5',
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.b@example.com',
      username: 'michaelb',
      phoneNumber: generatePhoneNumber(),
      dateOfBirth: new Date('1985-11-25'),
      gender: 'Male',
      isEmailConfirmed: true,
      isAgreementAccepted: true,
      onboardingCompleted: true,
      hasAcceptedPolicy: true,
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      create: {
        ...userData,
        password: await hashPassword('Password123!'),
      },
      update: {
        ...userData,
        password: await hashPassword('Password123!'),
      },
    });
  }

  // Create UserSettings for each user
  const createdUsers = await prisma.user.findMany();

  for (const user of createdUsers) {
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        generalNotification: true,
        soundNotification: true,
        specialOffersNotification: true,
        appointmentRemindersNotification: true,
        pushNotificationForAppointments: true,
      },
      update: {},
    });
  }

  console.log(`Seeded ${createdUsers.length} users`);
}

// Seed Business Users
async function seedBusinessUsers() {
  console.log('Seeding business users...');

  const businessUsers = [
    {
      clerkUserId: 'business_user_1',
      email: 'salon.owner@example.com',
      username: 'salonowner',
      phoneNumber: generatePhoneNumber(),
      firstName: 'Alex',
      lastName: 'Chen',
      businessUserType: BusinessUserType.REGULAR,
      isEmailConfirmed: true,
      isAgreementAccepted: true,
    },
    {
      clerkUserId: 'business_user_2',
      email: 'spa.manager@example.com',
      username: 'spamanager',
      phoneNumber: generatePhoneNumber(),
      firstName: 'Maria',
      lastName: 'Garcia',
      businessUserType: BusinessUserType.REGULAR,
      isEmailConfirmed: true,
      isAgreementAccepted: true,
    },
    {
      clerkUserId: 'business_user_3',
      email: 'barber.shop@example.com',
      username: 'barbershop',
      phoneNumber: generatePhoneNumber(),
      firstName: 'David',
      lastName: 'Wilson',
      businessUserType: BusinessUserType.REFERRAL,
      isEmailConfirmed: true,
      isAgreementAccepted: true,
    },
    {
      clerkUserId: 'business_user_4',
      email: 'nail.studio@example.com',
      username: 'nailstudio',
      phoneNumber: generatePhoneNumber(),
      firstName: 'Lisa',
      lastName: 'Taylor',
      businessUserType: BusinessUserType.REGULAR,
      isEmailConfirmed: true,
      isAgreementAccepted: true,
    },
    {
      clerkUserId: 'business_user_5',
      email: 'massage.therapist@example.com',
      username: 'massagetherapist',
      phoneNumber: generatePhoneNumber(),
      firstName: 'James',
      lastName: 'Miller',
      businessUserType: BusinessUserType.PILOT,
      isEmailConfirmed: true,
      isAgreementAccepted: true,
    },
  ];

  for (const userData of businessUsers) {
    await prisma.businessUser.upsert({
      where: { email: userData.email },
      create: {
        ...userData,
        password: await hashPassword('Business123!'),
        isEmployeeConsentApproved: true,
        referralCode: generateReferralCode(
          userData.firstName + userData.lastName,
        ),
        inviteCode: generateInviteCode(),
      },
      update: {
        ...userData,
        password: await hashPassword('Business123!'),
      },
    });
  }

  // Create BusinessUserSettings for each business user
  const createdBusinessUsers = await prisma.businessUser.findMany();

  for (const businessUser of createdBusinessUsers) {
    await prisma.businessUserSettings.upsert({
      where: { businessUserId: businessUser.id },
      create: {
        businessUserId: businessUser.id,
        appointmentNotification: true,
      },
      update: {},
    });
  }

  console.log(`Seeded ${businessUsers.length} business users`);
}

// Seed Businesses - FIXED: Using findFirst/create pattern instead of upsert
async function seedBusinesses() {
  console.log('Seeding businesses...');

  const businesses = [
    {
      clerkOrganizationId: 'org_1',
      name: 'Elegant Salon & Spa',
      email: 'info@elegantsalon.com',
      phoneNumber: generatePhoneNumber(),
      city: 'New York',
      country: 'US',
      zipcode: '10001',
      address: '123 Broadway Ave',
      industryType: ['Beauty', 'Wellness'],
      description:
        'Premium salon and spa offering haircuts, styling, facials, and massages.',
      website: 'https://elegantsalon.com ',
      isVerified: true,
      averageRating: 4.8,
      totalAverageRating: 4.7,
    },
    {
      clerkOrganizationId: 'org_2',
      name: 'Urban Barber Shop',
      email: 'hello@urbanbarber.com',
      phoneNumber: generatePhoneNumber(),
      city: 'Los Angeles',
      country: 'US',
      zipcode: '90001',
      address: '456 Sunset Blvd',
      industryType: ['Barber', 'Grooming'],
      description:
        "Modern barber shop specializing in men's haircuts and grooming services.",
      website: 'https://urbanbarber.com ',
      isVerified: true,
      averageRating: 4.6,
      totalAverageRating: 4.5,
    },
    {
      clerkOrganizationId: 'org_3',
      name: 'Bliss Nail Studio',
      email: 'contact@blissnails.com',
      phoneNumber: generatePhoneNumber(),
      city: 'Chicago',
      country: 'US',
      zipcode: '60601',
      address: '789 Michigan Ave',
      industryType: ['Beauty', 'Nails'],
      description:
        'Luxury nail studio offering manicures, pedicures, and nail art.',
      website: 'https://blissnails.com ',
      isVerified: true,
      averageRating: 4.9,
      totalAverageRating: 4.8,
    },
    {
      clerkOrganizationId: 'org_4',
      name: 'Tranquil Massage Therapy',
      email: 'info@tranquilmassage.com',
      phoneNumber: generatePhoneNumber(),
      city: 'Houston',
      country: 'US',
      zipcode: '77001',
      address: '101 Main St',
      industryType: ['Wellness', 'Massage'],
      description:
        'Professional massage therapy for relaxation and pain relief.',
      website: 'https://tranquilmassage.com ',
      isVerified: true,
      averageRating: 4.7,
      totalAverageRating: 4.6,
    },
    {
      clerkOrganizationId: 'org_5',
      name: 'Glamour Beauty Lounge',
      email: 'hello@glamourbeauty.com',
      phoneNumber: generatePhoneNumber(),
      city: 'Phoenix',
      country: 'US',
      zipcode: '85001',
      address: '202 Central Ave',
      industryType: ['Beauty', 'Cosmetics'],
      description:
        'Full-service beauty lounge offering makeup, skincare, and beauty treatments.',
      website: 'https://glamourbeauty.com ',
      isVerified: true,
      averageRating: 4.5,
      totalAverageRating: 4.4,
    },
  ];

  const createdBusinesses: Awaited<
    ReturnType<typeof prisma.business.create>
  >[] = [];

  for (const businessData of businesses) {
    // Check if business already exists using clerkOrganizationId
    let business = await prisma.business.findFirst({
      where: {
        clerkOrganizationId: businessData.clerkOrganizationId,
      },
    });

    if (!business) {
      // Create new business
      business = await prisma.business.create({
        data: businessData,
      });
    } else {
      // Update existing business
      business = await prisma.business.update({
        where: { id: business.id },
        data: businessData,
      });
    }

    createdBusinesses.push(business);

    // Create coordinates for each business
    const coords = generateRandomCoordinates(businessData.city);
    const existingCoords = await prisma.coordinates.findUnique({
      where: { businessId: business.id },
    });

    if (!existingCoords) {
      await prisma.coordinates.create({
        data: {
          businessId: business.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timezone: 'America/New_York',
        },
      });
    } else {
      await prisma.coordinates.update({
        where: { businessId: business.id },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });
    }

    // Create business hours
    const businessHours = generateBusinessHours(business.id);
    for (const hours of businessHours) {
      const existingHours = await prisma.businessHours.findUnique({
        where: {
          businessId_weekday: {
            businessId: business.id,
            weekday: hours.weekday,
          },
        },
      });

      if (!existingHours) {
        await prisma.businessHours.create({
          data: hours,
        });
      } else {
        await prisma.businessHours.update({
          where: {
            businessId_weekday: {
              businessId: business.id,
              weekday: hours.weekday,
            },
          },
          data: hours,
        });
      }
    }

    // Add social media
    const existingSocialMedia = await prisma.businessSocialMedia.findUnique({
      where: { businessId: business.id },
    });

    if (!existingSocialMedia) {
      await prisma.businessSocialMedia.create({
        data: {
          businessId: business.id,
          instagram: `@${business.name.toLowerCase().replace(/\s+/g, '')}`,
          facebook: `${business.name.replace(/\s+/g, '')}Official`,
        },
      });
    }

    // Add business policy
    const existingPolicy = await prisma.businessPolicy.findUnique({
      where: { businessId: business.id },
    });

    if (!existingPolicy) {
      await prisma.businessPolicy.create({
        data: {
          businessId: business.id,
          policy: `Welcome to ${business.name}! We strive to provide the best service. Please arrive 10 minutes before your appointment. Cancellations must be made 24 hours in advance.`,
          show: true,
        },
      });
    }
  }

  console.log(`Seeded ${createdBusinesses.length} businesses`);
  return createdBusinesses;
}

// Seed Business Members (Employees) - FIXED: Using correct unique constraint
async function seedBusinessMembers() {
  console.log('Seeding business members...');

  const businessUsers = await prisma.businessUser.findMany();
  const businesses = await prisma.business.findMany();
  const roles = await prisma.role.findMany();

  const businessMembers: Awaited<
    ReturnType<typeof prisma.businessMember.create>
  >[] = [];

  // Get owner role
  const ownerRole = roles.find((r) => r.name === Roles.OWNER);
  const employeeRole = roles.find((r) => r.name === Roles.EMPLOYEE);

  if (!ownerRole || !employeeRole) {
    console.error('Owner or Employee role not found!');
    return businessMembers;
  }

  // Create unique business users for each business to avoid duplicates
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];

    // Use modulo to cycle through business users, but offset to avoid duplicates
    const userIndex = i % businessUsers.length;

    // Check if this business user is already a member anywhere
    const existingMember = await prisma.businessMember.findFirst({
      where: {
        businessUserId: businessUsers[userIndex].id,
      },
    });

    // Only create if this business user isn't already a member elsewhere
    if (!existingMember) {
      try {
        const businessMember = await prisma.businessMember.create({
          data: {
            businessUserId: businessUsers[userIndex].id,
            businessId: business.id,
            roleId: ownerRole.id,
            designation: 'Owner',
            onlineBooking: true,
            walkInBooking: true,
            averageRating: 4.5 + Math.random() * 0.5,
            about: `Owner and lead stylist at ${business.name} with 10+ years of experience.`,
          },
        });

        businessMembers.push(businessMember);
      } catch (error) {
        console.error(
          `Failed to create business member for business ${business.name}:`,
          error,
        );
      }
    }

    // Create additional employees for each business
    // We need to ensure we don't reuse business users
    let employeeCount = 0;
    let employeeIndex = userIndex + 1;

    while (employeeCount < 2 && employeeIndex < businessUsers.length) {
      // Check if this business user is already a member
      const existingEmployee = await prisma.businessMember.findFirst({
        where: {
          businessUserId: businessUsers[employeeIndex].id,
        },
      });

      if (!existingEmployee) {
        try {
          const employeeMember = await prisma.businessMember.create({
            data: {
              businessUserId: businessUsers[employeeIndex].id,
              businessId: business.id,
              roleId: employeeRole.id,
              designation: ['Senior Stylist', 'Junior Stylist'][
                employeeCount % 2
              ],
              onlineBooking: true,
              walkInBooking: true,
              averageRating: 4.0 + Math.random() * 0.8,
              about: `Professional ${['hair stylist', 'barber'][employeeCount % 2]} with ${5 + employeeCount} years of experience.`,
            },
          });

          businessMembers.push(employeeMember);
          employeeCount++;
        } catch (error) {
          console.error(`Failed to create employee member:`, error);
        }
      }

      employeeIndex++;

      // If we've gone through all users, break
      if (employeeIndex >= businessUsers.length) {
        break;
      }
    }
  }

  console.log(`Seeded ${businessMembers.length} business members`);
  return businessMembers;
}

// Seed Business Services
async function seedBusinessServices() {
  console.log('Seeding business services...');

  const businesses = await prisma.business.findMany();
  const services = await prisma.service.findMany({
    include: {
      category: true,
    },
  });

  const businessServices: Awaited<
    ReturnType<typeof prisma.businessService.create>
  >[] = [];

  for (const business of businesses) {
    // Select 3-5 random services for each business
    const selectedServices = services
      .sort(() => 0.5 - Math.random())
      .slice(0, 3 + Math.floor(Math.random() * 3));

    for (const service of selectedServices) {
      const price = 20 + Math.floor(Math.random() * 100); // $20-$120
      const durationMinutes = [30, 45, 60, 75, 90, 120][
        Math.floor(Math.random() * 6)
      ];

      // Check if business service already exists
      const existingService = await prisma.businessService.findFirst({
        where: {
          businessId: business.id,
          serviceId: service.id,
        },
      });

      if (!existingService) {
        const businessService = await prisma.businessService.create({
          data: {
            businessId: business.id,
            serviceId: service.id,
            price,
            durationMinutes,
            totalDuration: durationMinutes,
            averageRating: 4.0 + Math.random() * 1.0,
            enabled: true,
          },
        });

        businessServices.push(businessService);
      }
    }
  }

  console.log(`Seeded ${businessServices.length} business services`);
  return businessServices;
}

// Seed Business Packages
async function seedBusinessPackages() {
  console.log('Seeding business packages...');

  const businesses = await prisma.business.findMany();
  const businessServices = await prisma.businessService.findMany();

  const packages: Awaited<ReturnType<typeof prisma.businessPackage.create>>[] =
    [];

  for (const business of businesses) {
    const businessSpecificServices = businessServices.filter(
      (bs) => bs.businessId === business.id,
    );

    if (businessSpecificServices.length >= 2) {
      const packageServices = businessSpecificServices.slice(0, 2);
      const totalPrice = packageServices.reduce((sum, bs) => sum + bs.price, 0);
      const packagePrice = totalPrice * 0.8; // 20% discount for package

      // Check if package already exists
      const existingPackage = await prisma.businessPackage.findFirst({
        where: {
          businessId: business.id,
          title: `${business.name} Package Deal`,
        },
      });

      if (!existingPackage) {
        const businessPackage = await prisma.businessPackage.create({
          data: {
            businessId: business.id,
            title: `${business.name} Package Deal`,
            price: packagePrice,
            durationMinutes: 90,
            totalDuration: 90,
            enabled: true,
          },
        });

        packages.push(businessPackage);

        // Connect services to package
        for (const bs of packageServices) {
          await prisma.businessPackageToService.create({
            data: {
              businessPackageId: businessPackage.id,
              businessServiceId: bs.id,
            },
          });
        }
      }
    }
  }

  console.log(`Seeded ${packages.length} business packages`);
  return packages;
}

// Seed Business Clients - FIXED: Using correct unique constraint
async function seedBusinessClients() {
  console.log('Seeding business clients...');

  const businesses = await prisma.business.findMany();
  const users = await prisma.user.findMany();

  const clients: Awaited<ReturnType<typeof prisma.businessClient.create>>[] =
    [];

  for (const business of businesses) {
    // Create 3-5 clients for each business
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const user = users[i % users.length];
      const clientType =
        Math.random() > 0.3
          ? BusinessClientType.CLIENT
          : BusinessClientType.CUSTOMER;

      const email = `client${i}@${business.email?.split('@')[1] || 'example.com'}`;
      const phoneNumber = generatePhoneNumber();

      // Check if client already exists
      const existingClient = await prisma.businessClient.findFirst({
        where: {
          businessId: business.id,
          OR: [{ email: email }, { phoneNumber: phoneNumber }],
        },
      });

      if (!existingClient) {
        const client = await prisma.businessClient.create({
          data: {
            businessId: business.id,
            userId: Math.random() > 0.5 ? user.id : null,
            fullName: `Client ${i} of ${business.name}`,
            phoneNumber: phoneNumber,
            email: email,
            type: clientType,
            note: i % 2 === 0 ? 'Regular customer' : 'First time visitor',
            stylistNote:
              i % 3 === 0
                ? 'Prefers quiet atmosphere'
                : 'Likes detailed consultations',
          },
        });

        clients.push(client);
      }
    }
  }

  console.log(`Seeded ${clients.length} business clients`);
  return clients;
}

// Seed Appointments
async function seedAppointments() {
  console.log('Seeding appointments...');

  const businesses = await prisma.business.findMany();
  const businessServices = await prisma.businessService.findMany();
  const businessMembers = await prisma.businessMember.findMany();
  const businessClients = await prisma.businessClient.findMany();

  const appointments: Awaited<ReturnType<typeof prisma.appointment.create>>[] =
    [];

  // Generate appointments for the next 30 days
  for (let i = 0; i < 30; i++) {
    const business = businesses[Math.floor(Math.random() * businesses.length)];
    const services = businessServices.filter(
      (bs) => bs.businessId === business.id,
    );
    const members = businessMembers.filter(
      (bm) => bm.businessId === business.id,
    );
    const clients = businessClients.filter(
      (bc) => bc.businessId === business.id,
    );

    if (services.length > 0 && members.length > 0 && clients.length > 0) {
      const service = services[Math.floor(Math.random() * services.length)];
      const member = members[Math.floor(Math.random() * members.length)];
      const client = clients[Math.floor(Math.random() * clients.length)];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
      startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(
        endDate.getMinutes() + (service.durationMinutes || 60),
      );

      const statuses = Object.values(AppointmentStatus);
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const appointment = await prisma.appointment.create({
        data: {
          status,
          note: Math.random() > 0.7 ? 'Special instructions provided' : null,
          employeeId: member.id,
          businessServiceId: service.id,
          clientId: client.id,
          businessId: business.id,
          start: startDate,
          end: endDate,
          sendReminderEmail: Math.random() > 0.5,
        },
      });

      appointments.push(appointment);

      // Create invoice for completed appointments
      if (
        status === AppointmentStatus.COMPLETED ||
        status === AppointmentStatus.CHECKED_OUT
      ) {
        const paymentMethods = Object.values(PaymentMethod);
        const paymentStatuses = Object.values(PaymentStatus);

        await prisma.invoice.create({
          data: {
            appointmentId: appointment.id,
            businessId: business.id,
            amountPaid: service.price,
            amountDue: service.price,
            paymentMethod:
              paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            paymentStatus:
              paymentStatuses[
                Math.floor(Math.random() * paymentStatuses.length)
              ],
            prePayment:
              Math.random() > 0.8 ? Math.floor(service.price * 0.2) : 0,
          },
        });
      }
    }
  }

  console.log(`Seeded ${appointments.length} appointments`);
  return appointments;
}

// Seed Influencers
async function seedInfluencers() {
  console.log('Seeding influencers...');

  const influencers = [
    {
      name: 'Beauty Guru Amy',
      email: 'amy.beauty@example.com',
      username: 'beautyamy',
      phoneNumber: generatePhoneNumber(),
      isEmailConfirmed: true,
    },
    {
      name: 'Lifestyle Leo',
      email: 'leo.lifestyle@example.com',
      username: 'lifestyleleo',
      phoneNumber: generatePhoneNumber(),
      isEmailConfirmed: true,
    },
    {
      name: 'Fashion Fiona',
      email: 'fiona.fashion@example.com',
      username: 'fashionfiona',
      phoneNumber: generatePhoneNumber(),
      isEmailConfirmed: true,
    },
    {
      name: 'Wellness Will',
      email: 'will.wellness@example.com',
      username: 'wellnesswill',
      phoneNumber: generatePhoneNumber(),
      isEmailConfirmed: true,
    },
    {
      name: 'Style Samantha',
      email: 'samantha.style@example.com',
      username: 'stylesamantha',
      phoneNumber: generatePhoneNumber(),
      isEmailConfirmed: true,
    },
  ];

  for (const influencerData of influencers) {
    await prisma.influencer.upsert({
      where: { email: influencerData.email },
      create: {
        ...influencerData,
        password: await hashPassword('Influencer123!'),
      },
      update: {
        ...influencerData,
        password: await hashPassword('Influencer123!'),
      },
    });
  }

  console.log(`Seeded ${influencers.length} influencers`);
}

// Seed Collab Campaigns and Offers
async function seedCampaigns() {
  console.log('Seeding campaigns...');

  const businesses = await prisma.business.findMany();
  const influencers = await prisma.influencer.findMany();

  const campaigns: Awaited<ReturnType<typeof prisma.collabCampaign.create>>[] =
    [];

  for (const business of businesses) {
    const campaign = await prisma.collabCampaign.create({
      data: {
        name: `${business.name} Influencer Campaign`,
        businessId: business.id,
      },
    });

    campaigns.push(campaign);

    // Create offers for each influencer
    for (const influencer of influencers) {
      const statuses = Object.values(CampaignOfferStatus);
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      await prisma.campaignOffer.create({
        data: {
          influencerId: influencer.id,
          businessId: business.id,
          campaignId: campaign.id,
          status,
        },
      });
    }
  }

  console.log(`Seeded ${campaigns.length} campaigns with offers`);
  return campaigns;
}

// Seed Business Subscriptions
async function seedBusinessSubscriptions() {
  console.log('Seeding business subscriptions...');

  const businesses = await prisma.business.findMany();
  const subscriptions = await prisma.subscription.findMany();

  for (const business of businesses) {
    const subscription =
      subscriptions[Math.floor(Math.random() * subscriptions.length)];
    const statuses = Object.values(SubscriptionStatus);
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Check if subscription already exists
    const existingSubscription = await prisma.businessSubscription.findFirst({
      where: {
        businessId: business.id,
      },
    });

    if (!existingSubscription) {
      await prisma.businessSubscription.create({
        data: {
          businessId: business.id,
          subscriptionId: subscription.id,
          customerTransactionId: `txn_${Date.now()}_${business.id}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          billingCycle: BillingCycle.MONTH,
          status,
          paymentStatus: PaymentStatus.PAID,
          isTrialUsed: status === SubscriptionStatus.TRIAL,
          cancelAtPeriodEnd: false,
        },
      });
    }
  }

  console.log(`Seeded subscriptions for ${businesses.length} businesses`);
}

// Seed Reviews - FIXED: Added null checks for business and user
async function seedReviews() {
  console.log('Seeding reviews...');

  const users = await prisma.user.findMany();
  const businesses = await prisma.business.findMany();
  const businessServices = await prisma.businessService.findMany();
  const businessMembers = await prisma.businessMember.findMany();

  const reviews: Awaited<ReturnType<typeof prisma.businessReview.create>>[] =
    [];

  // Track which user-business combinations have been reviewed
  const reviewedUserBusinessPairs = new Set<string>();

  // Create business reviews
  for (let i = 0; i < 15; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const business = businesses[Math.floor(Math.random() * businesses.length)];

    // Check if user and business exist
    if (!user || !business) continue;

    // Create unique key for this user-business pair
    const userBusinessKey = `${user.id}-${business.id}`;

    // Check if this user has already reviewed this business
    const existingReview = await prisma.businessReview.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
    });

    if (!existingReview && !reviewedUserBusinessPairs.has(userBusinessKey)) {
      try {
        const review = await prisma.businessReview.create({
          data: {
            ratings: 3.5 + Math.random() * 1.5, // 3.5-5.0
            review: `Great experience at ${business.name}! The service was excellent and the staff was very professional.`,
            userId: user.id,
            businessId: business.id,
            isPublic: true,
            isRead: Math.random() > 0.3,
          },
        });

        reviews.push(review);
        reviewedUserBusinessPairs.add(userBusinessKey);

        // 30% chance of a reply
        if (Math.random() > 0.7) {
          await prisma.businessReviewReply.create({
            data: {
              reviewId: review.id,
              businessId: business.id,
              reply:
                "Thank you for your kind review! We're glad you enjoyed your visit and look forward to serving you again.",
              createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
            },
          });
        }
      } catch (error) {
        console.error(
          `Failed to create review for business ${business.id}:`,
          error,
        );
        continue;
      }
    }
  }

  // Track which user-service combinations have been reviewed
  const reviewedUserServicePairs = new Set<string>();

  // Create service reviews
  for (let i = 0; i < 10; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const service =
      businessServices[Math.floor(Math.random() * businessServices.length)];

    // Check if user and service exist
    if (!user || !service) continue;

    // Create unique key for this user-service pair
    const userServiceKey = `${user.id}-${service.id}`;

    // Check if this user has already reviewed this service
    const existingReview = await prisma.businessReview.findFirst({
      where: {
        userId: user.id,
        businessServiceId: service.id,
      },
    });

    if (!existingReview && !reviewedUserServicePairs.has(userServiceKey)) {
      try {
        await prisma.businessReview.create({
          data: {
            ratings: 3.5 + Math.random() * 1.5,
            review: 'Excellent service, very professional!',
            userId: user.id,
            businessServiceId: service.id,
            isPublic: true,
            isRead: Math.random() > 0.3,
          },
        });
        reviewedUserServicePairs.add(userServiceKey);
      } catch (error) {
        console.error(
          `Failed to create service review for service ${service.id}:`,
          error,
        );
        continue;
      }
    }
  }

  // Track which user-member combinations have been reviewed
  const reviewedUserMemberPairs = new Set<string>();

  // Create employee reviews
  for (let i = 0; i < 10; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const member =
      businessMembers[Math.floor(Math.random() * businessMembers.length)];

    // Check if user and member exist
    if (!user || !member) continue;

    // Create unique key for this user-member pair
    const userMemberKey = `${user.id}-${member.id}`;

    // Check if this user has already reviewed this member
    const existingReview = await prisma.businessReview.findFirst({
      where: {
        userId: user.id,
        businessMemberId: member.id,
      },
    });

    if (!existingReview && !reviewedUserMemberPairs.has(userMemberKey)) {
      try {
        await prisma.businessReview.create({
          data: {
            ratings: 3.5 + Math.random() * 1.5,
            review: 'Great stylist, very attentive to details!',
            userId: user.id,
            businessMemberId: member.id,
            isPublic: true,
            isRead: Math.random() > 0.3,
          },
        });
        reviewedUserMemberPairs.add(userMemberKey);
      } catch (error) {
        console.error(
          `Failed to create member review for member ${member.id}:`,
          error,
        );
        continue;
      }
    }
  }

  console.log(`Seeded ${reviews.length} business reviews`);
  return reviews;
}

// Seed Search History
async function seedSearchHistory() {
  console.log('Seeding search history...');

  const users = await prisma.user.findMany();
  const businesses = await prisma.business.findMany();

  const searches: Awaited<ReturnType<typeof prisma.searchEntry.create>>[] = [];

  for (const user of users) {
    // Each user searches 2-3 businesses
    const searchCount = 2 + Math.floor(Math.random() * 2);
    const shuffledBusinesses = [...businesses].sort(() => 0.5 - Math.random());

    for (let i = 0; i < Math.min(searchCount, shuffledBusinesses.length); i++) {
      // Check if search entry already exists
      const existingSearch = await prisma.searchEntry.findFirst({
        where: {
          userId: user.id,
          businessId: shuffledBusinesses[i].id,
        },
      });

      if (!existingSearch) {
        const search = await prisma.searchEntry.create({
          data: {
            userId: user.id,
            businessId: shuffledBusinesses[i].id,
            createdAt: randomDate(
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              new Date(),
            ),
          },
        });

        searches.push(search);
      }
    }
  }

  console.log(`Seeded ${searches.length} search entries`);
  return searches;
}

// Seed Favorites
async function seedFavorites() {
  console.log('Seeding favorites...');

  const users = await prisma.user.findMany();
  const businesses = await prisma.business.findMany();

  for (const user of users) {
    // Each user favorites 1-2 businesses
    const favoriteCount = 1 + Math.floor(Math.random() * 2);
    const shuffledBusinesses = [...businesses].sort(() => 0.5 - Math.random());

    const userFavorites = await prisma.user.findUnique({
      where: { id: user.id },
      include: { favorites: true },
    });

    const existingFavoriteIds = userFavorites?.favorites.map((f) => f.id) || [];

    for (
      let i = 0;
      i < Math.min(favoriteCount, shuffledBusinesses.length);
      i++
    ) {
      if (!existingFavoriteIds.includes(shuffledBusinesses[i].id)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            favorites: {
              connect: { id: shuffledBusinesses[i].id },
            },
          },
        });
      }
    }
  }

  console.log(`Seeded favorites for ${users.length} users`);
}

// Seed Transactions
async function seedTransactions() {
  console.log('Seeding transactions...');

  const businesses = await prisma.business.findMany();
  const invoices = await prisma.invoice.findMany();

  const transactions: Awaited<ReturnType<typeof prisma.transaction.create>>[] =
    [];

  for (const invoice of invoices) {
    const business = businesses.find((b) => b.id === invoice.businessId);
    if (business) {
      const transaction = await prisma.transaction.create({
        data: {
          amountSent: invoice.amountPaid || invoice.amountDue,
          amountReceived: (invoice.amountPaid || invoice.amountDue) * 0.97, // 3% fee
          transactionType: TransactionType.PAY_IN,
          businessId: business.id,
          invoiceId: invoice.id,
          transactionStatus: TransactionStatus.PAID,
          paymentStatus: TransactionPaymentStatus.PAID,
        },
      });

      transactions.push(transaction);
    }
  }

  console.log(`Seeded ${transactions.length} transactions`);
  return transactions;
}

// Seed Invitations and Rewards
async function seedInvitationsAndRewards() {
  console.log('Seeding invitations and rewards...');

  const businessUsers = await prisma.businessUser.findMany();

  const invitations: Awaited<ReturnType<typeof prisma.invitations.create>>[] =
    [];
  const rewards: Awaited<ReturnType<typeof prisma.reward.create>>[] = [];

  // Create invitations
  for (let i = 0; i < 5; i++) {
    const inviter =
      businessUsers[Math.floor(Math.random() * businessUsers.length)];

    const invitation = await prisma.invitations.create({
      data: {
        email: `invited${i}@example.com`,
        code: `INVITE${Date.now()}${i}`,
        businessUserType: BusinessUserType.REGULAR,
        invitedByBusinessUserId: inviter.id,
        status: InvitationStatus.PENDING,
      },
    });

    invitations.push(invitation);
  }

  // Create rewards for accepted invitations
  for (let i = 0; i < 3; i++) {
    const businessUser =
      businessUsers[Math.floor(Math.random() * businessUsers.length)];
    const referredBy =
      businessUsers[Math.floor(Math.random() * businessUsers.length)];

    if (businessUser.id !== referredBy.id) {
      const reward = await prisma.reward.create({
        data: {
          businessUserId: businessUser.id,
          referredByBusinessUserId: referredBy.id,
          rewardType: RewardType.DISCOUNT,
          status: RewardStatus.APPLIED,
          amount: 10 + Math.floor(Math.random() * 40), // $10-$50
        },
      });

      rewards.push(reward);
    }
  }

  console.log(
    `Seeded ${invitations.length} invitations and ${rewards.length} rewards`,
  );
  return { invitations, rewards };
}

// Seed Admin
async function seedAdmin() {
  console.log('Seeding admin...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      password: adminPassword, // Note: Hash this in production
      isActive: true,
    },
    update: {
      email: adminEmail,
      password: adminPassword, // Note: Hash this in production
      isActive: true,
    },
  });

  console.log('Seeded admin user');
}

// Seed Invoices - creates invoices for existing appointments
async function seedInvoices() {
  console.log('Seeding invoices...');

  // Get all completed and checked out appointments that don't have invoices yet
  const appointments = await prisma.appointment.findMany({
    where: {
      status: {
        in: [AppointmentStatus.COMPLETED, AppointmentStatus.CHECKED_OUT],
      },
      invoice: null, // Only get appointments without invoices
    },
    include: {
      businessService: {
        include: {
          service: true,
        },
      },
      businessPackage: true,
      employee: true,
      client: true,
      business: true,
    },
  });

  console.log(
    `Found ${appointments.length} appointments to create invoices for`,
  );

  const invoices: Awaited<ReturnType<typeof prisma.invoice.create>>[] = [];

  for (const appointment of appointments) {
    try {
      // Calculate the amount due based on service or package price
      let amountDue = 0;
      let serviceName = '';

      if (appointment.businessService) {
        amountDue = appointment.businessService.price;
        serviceName = appointment.businessService.service?.title || 'Service';
      } else if (appointment.businessPackage) {
        amountDue = appointment.businessPackage.price || 0;
        serviceName = appointment.businessPackage.title || 'Package';
      }

      if (amountDue <= 0) {
        console.warn(`Skipping appointment ${appointment.id} - no price found`);
        continue;
      }

      // Determine payment status (random for seeding)
      const paymentStatuses = Object.values(PaymentStatus);
      const paymentStatus =
        paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      // Determine payment method (random for seeding)
      const paymentMethods = Object.values(PaymentMethod);
      const paymentMethod =
        paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      // Calculate amount paid (full or partial based on payment status)
      let amountPaid = 0;
      let prePayment = 0;

      if (paymentStatus === PaymentStatus.PAID) {
        amountPaid = amountDue;
      } else if (paymentStatus === PaymentStatus.PREPAID) {
        prePayment = Math.floor(Math.random() * amountDue * 0.5); // 0-50% prepayment
        amountPaid = prePayment;
      } else if (paymentStatus === PaymentStatus.REFUNDED) {
        amountPaid = amountDue; // Was paid but then refunded
      }

      // Add tip (30% chance of having a tip)
      let tip = 0;
      if (Math.random() > 0.7) {
        tip = Math.floor(amountDue * (Math.random() * 0.2 + 0.05)); // 5-25% tip
      }

      // Generate a unique payment intent ID for Stripe (simulated)
      const stripePaymentIntentId =
        paymentMethod === PaymentMethod.ONLINE
          ? `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : null;

      const invoice = await prisma.invoice.create({
        data: {
          appointmentId: appointment.id,
          businessId: appointment.businessId,
          amountPaid: amountPaid > 0 ? amountPaid : null,
          amountDue: amountDue,
          tip: tip > 0 ? tip : null,
          paymentMethod: paymentMethod,
          paymentStatus: paymentStatus,
          prePayment: prePayment,
          stripePaymentIntentId: stripePaymentIntentId,
        },
      });

      invoices.push(invoice);

      // If the invoice is paid, create a transaction record
      if (
        paymentStatus === PaymentStatus.PAID ||
        paymentStatus === PaymentStatus.PREPAID
      ) {
        const amountToSend = amountPaid > 0 ? amountPaid : amountDue;
        const amountReceived = amountToSend * 0.97; // 3% processing fee

        await prisma.transaction.create({
          data: {
            amountSent: amountToSend,
            amountReceived: amountReceived,
            transactionType: TransactionType.PAY_IN,
            businessId: appointment.businessId,
            invoiceId: invoice.id,
            transactionStatus: TransactionStatus.PAID,
            paymentStatus:
              paymentStatus === PaymentStatus.PAID
                ? TransactionPaymentStatus.PAID
                : TransactionPaymentStatus.UNPAID,
          },
        });
      }

      // Create notification email data for invoice (simulated)
      const invoiceEmailData = {
        to:
          appointment.client.email ||
          appointment.business.email ||
          'customer@example.com',
        subject: `Invoice for your ${serviceName} appointment`,
        body: `Thank you for your appointment at ${appointment.business.name}. Here is your invoice summary:
          - Service: ${serviceName}
          - Amount: $${amountDue.toFixed(2)}
          - Tip: ${tip > 0 ? `$${tip.toFixed(2)}` : 'None'}
          - Total: $${(amountDue + tip).toFixed(2)}
          - Payment Status: ${paymentStatus}
          - Payment Method: ${paymentMethod}
          
          Please contact ${appointment.business.name} if you have any questions.
        `,
      };

      console.log(
        `Created invoice for appointment ${appointment.id} with ${paymentStatus} status`,
      );
    } catch (error) {
      console.error(
        `Failed to create invoice for appointment ${appointment.id}:`,
        error,
      );
    }
  }

  console.log(`Seeded ${invoices.length} invoices`);
  return invoices;
}

// Main seeding function
async function seedAll() {
  console.log('Starting comprehensive seeding...');

  try {
    await prisma.$connect();

    // First seed admin
    // await seedAdmin();

    // Seed in proper order to respect dependencies
    await seedUsers();
    await seedBusinessUsers();
    await seedInfluencers();
    const businesses = await seedBusinesses();
    const businessMembers = await seedBusinessMembers();
    const businessServices = await seedBusinessServices();
    await seedBusinessPackages();
    const businessClients = await seedBusinessClients();
    await seedAppointments();
    await seedCampaigns();
    await seedBusinessSubscriptions();
    await seedReviews();
    await seedSearchHistory();
    await seedFavorites();
    await seedInvoices();
    await seedTransactions();
    await seedInvitationsAndRewards();

    console.log('✅ All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
// Check if this file is being run directly (ES Module equivalent of require.main === module)
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  seedAll()
    .then(() => {
      console.log('🎉 Database seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedAll };
