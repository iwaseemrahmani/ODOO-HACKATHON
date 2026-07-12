import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.use(requireRole("FLEET_MANAGER", "FINANCIAL_ANALYST", "DISPATCHER"));

async function buildVehicleReport() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { registrationNo: "asc" },
    include: { region: true },
  });

  const rows = await Promise.all(
    vehicles.map(async (v) => {
      const [fuel, maint, completedTrips] = await Promise.all([
        prisma.fuelLog.aggregate({
          where: { vehicleId: v.id },
          _sum: { cost: true, liters: true },
        }),
        prisma.maintenanceRecord.aggregate({
          where: { vehicleId: v.id },
          _sum: { cost: true },
        }),
        prisma.trip.findMany({
          where: { vehicleId: v.id, status: "Completed" },
          select: { distanceKm: true, plannedDistance: true, revenue: true },
        }),
      ]);

      const fuelCost = fuel._sum.cost ?? 0;
      const totalFuelLiters = fuel._sum.liters ?? 0;
      const maintenanceCost = maint._sum.cost ?? 0;
      const operationalCost = fuelCost + maintenanceCost;
      const totalDistance = completedTrips.reduce((sum, t) => {
        const d = t.distanceKm ?? t.plannedDistance ?? 0;
        return sum + d;
      }, 0);
      const revenue = completedTrips.reduce((sum, t) => sum + (t.revenue ?? 0), 0);
      const fuelEfficiency =
        totalFuelLiters > 0 ? totalDistance / totalFuelLiters : null;
      const roi =
        v.acquisitionCost > 0
          ? (revenue - operationalCost) / v.acquisitionCost
          : null;

      return {
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        model: v.model,
        type: v.type,
        region: v.region?.name ?? "",
        status: v.status,
        acquisitionCost: v.acquisitionCost,
        fuelCost,
        maintenanceCost,
        operationalCost,
        totalDistance,
        totalFuelLiters,
        fuelEfficiency,
        revenue,
        roi,
        roiPercent: roi != null ? roi * 100 : null,
      };
    })
  );

  const totalVehicles = vehicles.length;
  const onTrip = vehicles.filter((v) => v.status === "OnTrip").length;
  const fleetUtilizationPercent =
    totalVehicles === 0 ? 0 : Math.round((onTrip / totalVehicles) * 100);
  const totalOperationalCost = rows.reduce((s, r) => s + r.operationalCost, 0);
  const effRows = rows.filter((r) => r.fuelEfficiency != null) as {
    fuelEfficiency: number;
  }[];
  const avgFuelEfficiency =
    effRows.length === 0
      ? null
      : effRows.reduce((s, r) => s + r.fuelEfficiency, 0) / effRows.length;

  return {
    fleet: {
      totalVehicles,
      fleetUtilizationPercent,
      totalOperationalCost,
      avgFuelEfficiency,
    },
    vehicles: rows,
  };
}

reportsRouter.get("/summary", async (_req, res) => {
  try {
    const data = await buildVehicleReport();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reports failed" });
  }
});

reportsRouter.get("/export.csv", async (_req, res) => {
  try {
    const data = await buildVehicleReport();
    const headers = [
      "registrationNo",
      "model",
      "type",
      "region",
      "status",
      "acquisitionCost",
      "fuelCost",
      "maintenanceCost",
      "operationalCost",
      "totalDistance",
      "totalFuelLiters",
      "fuelEfficiency",
      "revenue",
      "roi",
      "roiPercent",
    ];
    const escape = (val: unknown) => {
      if (val == null) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [
      headers.join(","),
      ...data.vehicles.map((r) =>
        headers
          .map((h) => escape((r as Record<string, unknown>)[h]))
          .join(",")
      ),
    ];
    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="transitops-vehicle-report.csv"'
    );
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "CSV export failed" });
  }
});
