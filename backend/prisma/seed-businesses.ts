// import {
//   Amenity,
//   Business,
//   BusinessService,
//   Language,
//   Prisma,
//   PrismaClient,
//   Service,
// } from '@prisma/client';
// import { DiscountType } from '../src/business/business.constants';
// const prisma = new PrismaClient();

// const getRandomNumber = (min: number, max: number) =>
//   Math.floor(Math.random() * (max - min + 1)) + min;

// const getRandomRecordsWithRawSQL = async <T>(
//   tableName: string,
//   count: number,
// ): Promise<T[]> => {
//   const records = await prisma.$queryRawUnsafe<T[]>(`
//     SELECT * FROM "${tableName}"
//     ORDER BY RANDOM()
//     LIMIT ${count};
//   `);

//   return records;
// };

// const getRandomCity = () => {
//   const cities = [
//     { name: 'Lisbon', latitude: 38.736946, longitude: -9.142685 },
//     { name: 'Porto', latitude: 41.157944, longitude: -8.629105 },
//     { name: 'San Francisco', latitude: 37.774929, longitude: -122.419416 },
//     { name: 'New York', latitude: 40.712776, longitude: -74.005974 },
//   ];
//   return cities[Math.floor(Math.random() * cities.length)];
// };

// const generateWorkingHours = () => {
//   const weekdays = [
//     'Monday',
//     'Tuesday',
//     'Wednesday',
//     'Thursday',
//     'Friday',
//     'Saturday',
//     'Sunday',
//   ];

//   return weekdays.map((weekday) => ({
//     weekday,
//     isClosed: weekday === 'Sunday',
//     openingHour: getRandomNumber(6, 11),
//     openingMinute: 0,
//     closingHour: getRandomNumber(6, 11),
//     closingMinute: 0,
//     openingPeriod: 'AM',
//     closingPeriod: 'PM',
//   }));
// };

// const getRandomIndustry = () => {
//   const industries = [
//     'Retail',
//     'Food & Beverage',
//     'Healthcare',
//     'Technology',
//     'Services',
//   ];
//   return industries[Math.floor(Math.random() * industries.length)];
// };

// const getRandomPromotion = () => {
//   const promotionTypes = [null, DiscountType.PERCENTAGE];
//   const selectedType =
//     promotionTypes[Math.floor(Math.random() * promotionTypes.length)];

//   return selectedType === DiscountType.PERCENTAGE
//     ? {
//         create: {
//           discountType: DiscountType.PERCENTAGE,
//           discountAmount: getRandomNumber(1, 50),
//           enabled: true,
//         },
//       }
//     : null;
// };

// const setBusinessCoordinates = async (
//   tx: Prisma.TransactionClient,
//   {
//     businessId,
//     latitude,
//     longitude,
//   }: {
//     businessId: string;
//     latitude: number;
//     longitude: number;
//   },
// ) => {
//   const coordinates = await tx.coordinates.create({
//     data: {
//       businessId,
//       latitude,
//       longitude,
//     },
//   });
//   await tx.$queryRaw` UPDATE "coordinates" SET coordinate = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${coordinates.id};`;
// };

// const getServicesData = (randomServices: Service[]) => {
//   return randomServices.map((service) => {
//     const price = getRandomNumber(10, 200);
//     const durationMinutes = getRandomNumber(15, 50);
//     const durationHours = getRandomNumber(0, 2);
//     const totalDuration = durationHours * 60 + durationMinutes;
//     const promotion = getRandomPromotion();
//     return {
//       price,
//       enabled: true,
//       totalDuration,
//       durationMinutes,
//       durationHours,
//       service: {
//         connect: { id: service.id },
//       },
//       ...(promotion && { promotion }),
//     };
//   });
// };

// const getPackageData = (
//   business: Business,
//   businessServices: BusinessService[],
// ): Prisma.BusinessPackageCreateInput => {
//   const promotion = getRandomPromotion();
//   return {
//     title: `First Package for ${business.name}`,
//     services: {
//       create: businessServices.map((businessService) => ({
//         businessServiceId: businessService.id,
//       })),
//     },
//     ...(promotion && { promotion }),
//     business: {
//       connect: { id: business.id },
//     },
//   };
// };

// async function seedBusinesses(numBusinesses: number = 100) {
//   const workingHours = generateWorkingHours();

//   for (let i = 1; i <= numBusinesses; i++) {
//     const cityInfo = getRandomCity();
//     const recordsNumber = getRandomNumber(1, 4);
//     const [randomServices, randomAmenities, randomLanguages] =
//       await Promise.all([
//         getRandomRecordsWithRawSQL<Service>('services', recordsNumber),
//         getRandomRecordsWithRawSQL<Amenity>('amenities', recordsNumber),
//         getRandomRecordsWithRawSQL<Language>('languages', recordsNumber),
//       ]);

//     await prisma.$transaction(async (tx) => {
//       const business = await tx.business.create({
//         data: {
//           clerkOrganizationId:"1234567890Mock",
//           isVerified: true,
//           name: `Mock Business ${i}`,
//           description: `Description for business ${i}`,
//           industryType: [getRandomIndustry()],
//           city: cityInfo.name,
//           floor: `Floor ${getRandomNumber(1, 10)}`,
//           office: `Office ${getRandomNumber(1, 100)}`,
//           sector: `Sector ${getRandomNumber(1, 10)}`,
//           area: 'Central',
//           country: 'pakistan',
//           street: `Street ${i}`,
//           zipcode: `1000-${Math.floor(Math.random() * 999)
//             .toString()
//             .padStart(3, '0')}`,
//           phoneNumber: '+351 21 000 ' + Math.floor(Math.random() * 1000),
//           email: `contact@business${i}.com`,
//           website: `www.business${i}.com`,
//           averageRating: parseFloat((Math.random() * 5).toFixed(1)),
//           isEmailConfirmed: true,
//           isPhoneConfirmed: true,
//           workingHours: {
//             create: workingHours,
//           },
//           policy: {
//             create: {
//               policy: 'Standard business policy',
//             },
//           },
//           socialMedia: {
//             create: {
//               instagram: `@mockbusiness${i}`,
//               facebook: `facebook.com/mockbusiness${i}`,
//               youtube: `youtube.com/mockbusiness${i}`,
//               twitter: `@mockbusiness${i}`,
//             },
//           },
//           services: {
//             create: getServicesData(randomServices),
//           },
//           amenities: {
//             connect: randomAmenities.map((amenity) => ({ id: amenity.id })),
//           },
//           languages: {
//             connect: randomLanguages.map((language) => ({ id: language.id })),
//           },
//         },
//       });

//       const businessServices = await tx.businessService.findMany({
//         where: { businessId: business.id },
//       });

//       await Promise.all([
//         tx.businessPackage.create({
//           data: getPackageData(business, businessServices),
//         }),
//         setBusinessCoordinates(tx, {
//           businessId: business.id,
//           latitude: cityInfo.latitude + Math.random() * 0.1 - 0.05,
//           longitude: cityInfo.longitude + Math.random() * 0.1 - 0.05,
//         }),
//       ]);
//     });
//   }
// }

// async function processingBusinessesSeed() {
//   await prisma.$connect();

//   // Get the number of businesses from command line arguments
//   const numBusinessesArg = process.argv[2];
//   const numBusinesses = numBusinessesArg ? parseInt(numBusinessesArg) : 100;

//   await seedBusinesses(numBusinesses);
// }

// processingBusinessesSeed()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
