// import { PrismaClient } from "@prisma/client";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";

dotenv.config();

console.log("Seeding started...");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function main() {
  await prisma.$connect();
  console.log("Prisma connected");

  const email = "admin@marvalero.com";
  const password = "admin123";

  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, password: hash },
  });

  console.log("Admin seeded:", admin.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Disconnected");
  });
