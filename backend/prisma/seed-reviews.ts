import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedUsersWithReviews(
  businessId: string,
  reviewsCount: number,
): Promise<void> {
  await prisma.$transaction(async (prisma) => {
    for (let i = 0; i < reviewsCount; i++) {
      const userData = {
        email: `user${i}@example.com`,
        firstName: `UserFirstName${i}`,
        lastName: `UserLastName${i}`,
        password: 'seededUser',
        clerkUserId: 'testUserId',
      };
      const user = await prisma.user.upsert({
        where: {
          email: userData.email,
        },
        create: userData,
        update: userData,
      });

      await prisma.businessReview.upsert({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId,
          },
        },
        create: {
          userId: user.id,
          businessId,
          ratings: Math.floor(Math.random() * 5) + 1,
          review: `Review from User${i}`,
        },
        update: {
          ratings: Math.floor(Math.random() * 5) + 1,
          review: `Review from User${i}`,
        },
      });

      const averageRating = await prisma.businessReview.aggregate({
        _avg: {
          ratings: true,
        },
        where: {
          businessId,
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: {
          averageRating: averageRating._avg.ratings,
        },
      });
    }
  });
}

async function processingReviewsSeed() {
  await prisma.$connect();

  const businessId = process.argv[2];
  const numReviews = process.argv[3];

  const reviewsCount = numReviews ? parseInt(numReviews) : 100;

  if (!businessId) {
    throw new Error('Business ID is required');
  }

  await seedUsersWithReviews(businessId, reviewsCount);
}

processingReviewsSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
