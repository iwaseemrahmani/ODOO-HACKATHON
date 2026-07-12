import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/kpis", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalVehicles,
    availableVehicles,
    onTripVehicles,
    inShopVehicles,
    activeTrips,
    draftTrips,
    completedTrips,
    totalDrivers,
    driversOnTrip,
    fuelAgg,
    expenseAgg,
    openMaintenance,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "Available" } }),
    prisma.vehicle.count({ where: { status: "OnTrip" } }),
    prisma.vehicle.count({ where: { status: "InShop" } }),
    prisma.trip.count({ where: { status: "Dispatched" } }),
    prisma.trip.count({ where: { status: "Draft" } }),
    prisma.trip.count({ where: { status: "Completed" } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { status: "OnTrip" } }),
    prisma.fuelLog.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { cost: true, liters: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.maintenanceRecord.count({ where: { status: "Open" } }),
  ]);

  const fleetUtilizationPercent =
    totalVehicles === 0 ? 0 : Math.round((onTripVehicles / totalVehicles) * 100);

  res.json({
    totalVehicles,
    availableVehicles,
    activeVehicles: onTripVehicles,
    vehiclesInMaintenance: inShopVehicles,
    activeTrips,
    pendingTrips: draftTrips,
    completedTrips,
    totalDrivers,
    driversOnDuty: driversOnTrip,
    openMaintenance,
    fleetUtilizationPercent,
    fuelCostThisMonth: fuelAgg._sum.cost ?? 0,
    fuelLitersThisMonth: fuelAgg._sum.liters ?? 0,
    expensesThisMonth: expenseAgg._sum.amount ?? 0,
  });
});
