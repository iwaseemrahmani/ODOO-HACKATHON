import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  BusinessRuleError,
  cancelTrip,
  completeTrip,
  createTrip,
  dispatchTrip,
  openMaintenance,
  closeMaintenance,
} from "../services/trips.service";

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

function handleRuleError(res: import("express").Response, err: unknown) {
  if (err instanceof BusinessRuleError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Request failed" });
}

tripsRouter.get("/", async (_req, res) => {
  const items = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    include: { vehicle: true, driver: true },
  });
  res.json(items);
});

tripsRouter.get("/:id", async (req, res) => {
  const item = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true, driver: true },
  });
  if (!item) return res.status(404).json({ error: "Trip not found" });
  res.json(item);
});

tripsRouter.post("/", requireRole("DISPATCHER", "FLEET_MANAGER"), async (req, res) => {
  try {
    const trip = await createTrip({
      vehicleId: req.body.vehicleId,
      driverId: req.body.driverId,
      origin: req.body.origin,
      destination: req.body.destination,
      cargoWeight: Number(req.body.cargoWeight),
      plannedDistance: Number(req.body.plannedDistance),
      scheduledAt: req.body.scheduledAt,
      notes: req.body.notes,
    });
    res.status(201).json(trip);
  } catch (err) {
    return handleRuleError(res, err);
  }
});

tripsRouter.post(
  "/:id/dispatch",
  requireRole("DISPATCHER", "FLEET_MANAGER"),
  async (req, res) => {
    try {
      const trip = await dispatchTrip(req.params.id);
      res.json(trip);
    } catch (err) {
      return handleRuleError(res, err);
    }
  }
);

tripsRouter.post(
  "/:id/complete",
  requireRole("DISPATCHER", "FLEET_MANAGER"),
  async (req, res) => {
    try {
      const trip = await completeTrip(req.params.id, {
        distanceKm: req.body.distanceKm != null ? Number(req.body.distanceKm) : undefined,
        revenue: req.body.revenue != null ? Number(req.body.revenue) : undefined,
        notes: req.body.notes,
        odometer: req.body.odometer != null && req.body.odometer !== ""
          ? Number(req.body.odometer)
          : undefined,
        fuelLiters:
          req.body.fuelLiters != null && req.body.fuelLiters !== ""
            ? Number(req.body.fuelLiters)
            : undefined,
        fuelCost:
          req.body.fuelCost != null && req.body.fuelCost !== ""
            ? Number(req.body.fuelCost)
            : undefined,
      });
      res.json(trip);
    } catch (err) {
      return handleRuleError(res, err);
    }
  }
);

tripsRouter.post(
  "/:id/cancel",
  requireRole("DISPATCHER", "FLEET_MANAGER"),
  async (req, res) => {
    try {
      const trip = await cancelTrip(req.params.id);
      res.json(trip);
    } catch (err) {
      return handleRuleError(res, err);
    }
  }
);

// Maintenance nested under ops for simplicity (also used by fleet)
export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

maintenanceRouter.get("/", async (_req, res) => {
  const items = await prisma.maintenanceRecord.findMany({
    orderBy: { openedAt: "desc" },
    include: { vehicle: true },
  });
  res.json(items);
});

maintenanceRouter.post(
  "/",
  requireRole("FLEET_MANAGER"),
  async (req, res) => {
    try {
      const record = await openMaintenance({
        vehicleId: req.body.vehicleId,
        description: req.body.description,
        cost: req.body.cost != null ? Number(req.body.cost) : undefined,
      });
      res.status(201).json(record);
    } catch (err) {
      return handleRuleError(res, err);
    }
  }
);

maintenanceRouter.post(
  "/:id/close",
  requireRole("FLEET_MANAGER"),
  async (req, res) => {
    try {
      const record = await closeMaintenance(req.params.id);
      res.json(record);
    } catch (err) {
      return handleRuleError(res, err);
    }
  }
);

export const fuelRouter = Router();
fuelRouter.use(requireAuth);

fuelRouter.get("/", async (req, res) => {
  const vehicleId =
    typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
  const items = await prisma.fuelLog.findMany({
    where: vehicleId ? { vehicleId } : undefined,
    orderBy: { date: "desc" },
    include: { vehicle: { include: { region: true } } },
    take: 200,
  });
  res.json(
    items.map((item) => ({
      ...item,
      vehicle: item.vehicle
        ? {
            ...item.vehicle,
            region: item.vehicle.region?.name ?? "",
            type: item.vehicle.type,
          }
        : undefined,
    }))
  );
});

fuelRouter.post(
  "/",
  requireRole("FLEET_MANAGER", "FINANCIAL_ANALYST", "DISPATCHER"),
  async (req, res) => {
    try {
      const vehicleId = req.body.vehicleId as string | undefined;
      const liters = Number(req.body.liters);
      const cost = Number(req.body.cost);
      if (!vehicleId) {
        return res.status(400).json({ error: "Vehicle is required for fuel logs" });
      }
      if (!Number.isFinite(liters) || liters <= 0) {
        return res.status(400).json({ error: "Liters must be a number greater than 0" });
      }
      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({ error: "Cost must be a number >= 0" });
      }
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      if (vehicle.status === "Retired") {
        return res.status(400).json({
          error: "Cannot log fuel for a retired vehicle",
        });
      }

      const date = req.body.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      // Disallow far-future dates (edge case)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date > tomorrow) {
        return res.status(400).json({ error: "Fuel date cannot be in the future" });
      }

      const odometer =
        req.body.odometer != null && req.body.odometer !== ""
          ? Number(req.body.odometer)
          : null;
      if (odometer != null && (!Number.isFinite(odometer) || odometer < 0)) {
        return res.status(400).json({ error: "Odometer must be >= 0" });
      }
      if (odometer != null && odometer < vehicle.odometer) {
        return res.status(400).json({
          error: `Odometer (${odometer}) cannot be less than vehicle current odometer (${vehicle.odometer})`,
        });
      }

      const item = await prisma.$transaction(async (tx) => {
        const log = await tx.fuelLog.create({
          data: {
            vehicleId,
            liters,
            cost,
            date,
            odometer,
          },
          include: { vehicle: true },
        });
        if (odometer != null) {
          await tx.vehicle.update({
            where: { id: vehicleId },
            data: { odometer },
          });
        }
        return log;
      });
      res.status(201).json(item);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Create fuel log failed" });
    }
  }
);

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get("/", async (req, res) => {
  const vehicleId =
    typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
  const items = await prisma.expense.findMany({
    where: vehicleId ? { vehicleId } : undefined,
    orderBy: { date: "desc" },
    include: { vehicle: { include: { region: true } }, trip: true },
    take: 200,
  });
  res.json(
    items.map((item) => ({
      ...item,
      type: item.category,
      vehicle: item.vehicle
        ? {
            ...item.vehicle,
            region: item.vehicle.region?.name ?? "",
            type: item.vehicle.type,
          }
        : null,
    }))
  );
});

expensesRouter.post(
  "/",
  requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER", "DISPATCHER"),
  async (req, res) => {
    try {
      const type = String(req.body.type || "").trim();
      const amount = Number(req.body.amount);
      if (!type) {
        return res.status(400).json({ error: "Expense type is required" });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }

      let vehicleId: string | null = req.body.vehicleId || null;
      if (vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) {
          return res.status(404).json({ error: "Vehicle not found" });
        }
        if (vehicle.status === "Retired") {
          return res.status(400).json({
            error: "Cannot attach expense to a retired vehicle",
          });
        }
      }

      const date = req.body.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date > tomorrow) {
        return res.status(400).json({ error: "Expense date cannot be in the future" });
      }

      const { mapExpenseCategory } = await import("../lib/region");
      const category = mapExpenseCategory(type);

      // Maintenance-type expenses should be linked to a vehicle
      if (category === "Maintenance" && !vehicleId) {
        return res.status(400).json({
          error: "Maintenance expenses must be linked to a vehicle",
        });
      }

      const item = await prisma.expense.create({
        data: {
          vehicleId,
          tripId: req.body.tripId || null,
          category,
          amount,
          date,
          description: req.body.description
            ? String(req.body.description).trim()
            : type,
        },
        include: { vehicle: true },
      });
      // Keep frontend-compatible shape
      res.status(201).json({ ...item, type: item.category });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Create expense failed" });
    }
  }
);

