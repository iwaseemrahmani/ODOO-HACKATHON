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

fuelRouter.get("/", async (_req, res) => {
  const items = await prisma.fuelLog.findMany({
    orderBy: { date: "desc" },
    include: { vehicle: true },
    take: 100,
  });
  res.json(items);
});

fuelRouter.post(
  "/",
  requireRole("FLEET_MANAGER", "FINANCIAL_ANALYST", "DISPATCHER"),
  async (req, res) => {
    try {
      const item = await prisma.fuelLog.create({
        data: {
          vehicleId: req.body.vehicleId,
          liters: Number(req.body.liters),
          cost: Number(req.body.cost),
          date: req.body.date ? new Date(req.body.date) : new Date(),
          odometer: req.body.odometer != null ? Number(req.body.odometer) : null,
        },
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

expensesRouter.get("/", async (_req, res) => {
  const items = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { vehicle: true, trip: true },
    take: 100,
  });
  res.json(items);
});

expensesRouter.post(
  "/",
  requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"),
  async (req, res) => {
    try {
      const item = await prisma.expense.create({
        data: {
          vehicleId: req.body.vehicleId || null,
          tripId: req.body.tripId || null,
          type: String(req.body.type),
          amount: Number(req.body.amount),
          date: req.body.date ? new Date(req.body.date) : new Date(),
          description: req.body.description ?? null,
        },
      });
      res.status(201).json(item);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Create expense failed" });
    }
  }
);
