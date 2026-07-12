/**
 * Seed: login users only + wipe all operational sample data.
 * Run from repo root: pnpm db:seed
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const users: { email: string; name: string; role: Role }[] = [
    { email: "fleet@demo.com", name: "Fleet Manager", role: Role.FLEET_MANAGER },
    { email: "dispatch@demo.com", name: "Dispatcher", role: Role.DISPATCHER },
    { email: "safety@demo.com", name: "Safety Officer", role: Role.SAFETY_OFFICER },
    { email: "finance@demo.com", name: "Financial Analyst", role: Role.FINANCIAL_ANALYST },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, name: u.name, role: u.role },
      create: { ...u, passwordHash },
    });
  }

  console.log("Database cleared of vehicles, drivers, trips, maintenance, fuel, expenses.");
  console.log("Login users ready:");
  console.log("  fleet@demo.com / dispatch@demo.com / safety@demo.com / finance@demo.com");
  console.log("  Password: password123");
  console.log("Fleet is empty — register new data in the app.");
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
