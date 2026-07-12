import {
  PrismaClient,
  Role,
  VehicleStatus,
  DriverStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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

  const vehicles = [
    {
      registrationNo: "Van-05",
      model: "Toyota HiAce",
      type: "Van",
      region: "North",
      capacity: "Cargo van",
      maxLoad: 500,
      odometer: 12000,
      acquisitionCost: 25000,
      status: VehicleStatus.Available,
    },
    {
      registrationNo: "TRK-12",
      model: "Isuzu NPR",
      type: "Truck",
      region: "South",
      capacity: "Medium truck",
      maxLoad: 2000,
      odometer: 45000,
      acquisitionCost: 80000,
      status: VehicleStatus.Available,
    },
    {
      registrationNo: "BUS-03",
      model: "Mercedes Sprinter",
      type: "Bus",
      region: "East",
      capacity: "Passenger",
      maxLoad: 800,
      odometer: 28000,
      acquisitionCost: 55000,
      status: VehicleStatus.Available,
    },
    {
      registrationNo: "VAN-09",
      model: "Ford Transit",
      type: "Van",
      region: "West",
      capacity: "Cargo van",
      maxLoad: 1200,
      odometer: 15000,
      acquisitionCost: 32000,
      status: VehicleStatus.Available,
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNo: v.registrationNo },
      update: v,
      create: v,
    });
  }

  const drivers = [
    {
      name: "Alex Rivera",
      licenseNo: "DL-ALEX-001",
      licenseCategory: "C",
      licenseExpiry: new Date("2028-12-31"),
      phone: "+10000000001",
      safetyScore: 95,
      status: DriverStatus.Available,
    },
    {
      name: "Sam Chen",
      licenseNo: "DL-SAM-002",
      licenseCategory: "B",
      licenseExpiry: new Date("2027-06-15"),
      phone: "+10000000002",
      safetyScore: 88,
      status: DriverStatus.Available,
    },
    {
      name: "Jordan Lee",
      licenseNo: "DL-JOR-003",
      licenseCategory: "C",
      licenseExpiry: new Date("2029-03-01"),
      phone: "+10000000003",
      safetyScore: 92,
      status: DriverStatus.Available,
    },
    {
      name: "Casey Brooks",
      licenseNo: "DL-CAS-004",
      licenseCategory: "D",
      licenseExpiry: new Date("2026-01-10"),
      phone: "+10000000004",
      safetyScore: 80,
      status: DriverStatus.Available,
    },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { licenseNo: d.licenseNo },
      update: d,
      create: d,
    });
  }

  console.log("Seed complete.");
  console.log("  Users: fleet / dispatch / safety / finance @demo.com");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    (globalThis as any).process?.exit?.(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
