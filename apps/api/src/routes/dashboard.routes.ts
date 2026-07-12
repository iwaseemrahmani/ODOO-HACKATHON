import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function vehicleWhere(req: { query: Record<string, unknown> }): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};
  if (typeof req.query.type === "string" && req.query.type.trim()) {
    where.type = req.query.type.trim();
  }
  if (typeof req.query.status === "string" && req.query.status.trim()) {
    where.status = req.query.status.trim() as Prisma.EnumVehicleStatusFilter["equals"];
  }
  if (typeof req.query.region === "string" && req.query.region.trim()) {
    where.region = req.query.region.trim();
  }
  return where;
}

dashboardRouter.get("/kpis", async (req, res) => {
  try {
    const vWhere = vehicleWhere(req);
    const hasVehicleFilter = Object.keys(vWhere).length > 0;

    const filteredVehicles = await prisma.vehicle.findMany({
      where: vWhere,
      select: { id: true, status: true },
    });
    const vehicleIds = filteredVehicles.map((v) => v.id);

    const tripVehicleFilter: Prisma.TripWhereInput = hasVehicleFilter
      ? { vehicleId: { in: vehicleIds.length ? vehicleIds : ["__none__"] } }
      : {};

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalVehicles = filteredVehicles.length;
    const availableVehicles = filteredVehicles.filter((v) => v.status === "Available").length;
    const onTripVehicles = filteredVehicles.filter((v) => v.status === "OnTrip").length;
    const inShopVehicles = filteredVehicles.filter((v) => v.status === "InShop").length;

    const [
      activeTrips,
      draftTrips,
      completedTrips,
      totalDrivers,
      driversOnTrip,
      fuelAgg,
      expenseAgg,
      openMaintenance,
    ] = await Promise.all([
      prisma.trip.count({ where: { status: "Dispatched", ...tripVehicleFilter } }),
      prisma.trip.count({ where: { status: "Draft", ...tripVehicleFilter } }),
      prisma.trip.count({ where: { status: "Completed", ...tripVehicleFilter } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: "OnTrip" } }),
      prisma.fuelLog.aggregate({
        where: {
          date: { gte: monthStart },
          ...(hasVehicleFilter
            ? { vehicleId: { in: vehicleIds.length ? vehicleIds : ["__none__"] } }
            : {}),
        },
        _sum: { cost: true, liters: true },
      }),
      prisma.expense.aggregate({
        where: {
          date: { gte: monthStart },
          ...(hasVehicleFilter
            ? { vehicleId: { in: vehicleIds.length ? vehicleIds : ["__none__"] } }
            : {}),
        },
        _sum: { amount: true },
      }),
      prisma.maintenanceRecord.count({
        where: {
          status: "Open",
          ...(hasVehicleFilter
            ? { vehicleId: { in: vehicleIds.length ? vehicleIds : ["__none__"] } }
            : {}),
        },
      }),
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
      filters: {
        type: typeof req.query.type === "string" ? req.query.type : "",
        status: typeof req.query.status === "string" ? req.query.status : "",
        region: typeof req.query.region === "string" ? req.query.region : "",
      },
    });
  } catch (err) {
    console.error("Dashboard KPIs failed:", err);
    res.status(503).json({
      error: "Database unavailable",
      message:
        "Cannot reach Neon. Wake the project in console.neon.tech, check DATABASE_URL, then retry.",
    });
  }
});
