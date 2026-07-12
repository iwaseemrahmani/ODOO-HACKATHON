import { Prisma, VehicleType } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mapVehicleType, resolveRegionId } from "../lib/region";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { isPrismaUniqueError } from "../services/trips.service";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

function serializeVehicle(v: {
  id: string;
  registrationNo: string;
  model: string;
  type: VehicleType;
  maxLoad: number;
  odometer: number;
  acquisitionCost: number;
  status: string;
  capacity: string | null;
  fuelType?: string | null;
  manufacturer?: string | null;
  region?: { name: string } | null;
  [key: string]: unknown;
}) {
  return {
    ...v,
    // Frontend expects region as string name
    region: v.region?.name ?? "",
    type: v.type as string,
    fuelType: v.fuelType ?? null,
    manufacturer: v.manufacturer ?? null,
  };
}

const FUEL_TYPES = new Set(["Diesel", "Petrol", "CNG", "Electric"]);
const VEHICLE_STATUSES = new Set(["Available", "OnTrip", "InShop", "Retired"]);

vehiclesRouter.get("/", async (req, res) => {
  try {
    const where: Prisma.VehicleWhereInput = {};
    if (typeof req.query.type === "string" && req.query.type.trim()) {
      where.type = mapVehicleType(req.query.type);
    }
    if (typeof req.query.status === "string" && req.query.status.trim()) {
      where.status = req.query.status.trim() as Prisma.EnumVehicleStatusFilter["equals"];
    }
    if (typeof req.query.region === "string" && req.query.region.trim()) {
      where.region = { name: req.query.region.trim() };
    }
    const items = await prisma.vehicle.findMany({
      where,
      include: { region: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items.map(serializeVehicle));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list vehicles" });
  }
});

vehiclesRouter.get("/:id", async (req, res) => {
  const item = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: { region: true },
  });
  if (!item) return res.status(404).json({ error: "Vehicle not found" });
  res.json(serializeVehicle(item));
});

vehiclesRouter.post(
  "/",
  requireRole("FLEET_MANAGER", "DISPATCHER"),
  async (req, res) => {
    try {
      const {
        registrationNo,
        model,
        type,
        region,
        capacity,
        maxLoad,
        odometer,
        acquisitionCost,
        status,
        fuelType,
        manufacturer,
      } = req.body;
      if (!registrationNo || !model || maxLoad == null) {
        return res.status(400).json({ error: "registrationNo, model, maxLoad required" });
      }
      const maxLoadN = Number(maxLoad);
      if (!Number.isFinite(maxLoadN) || maxLoadN <= 0) {
        return res.status(400).json({ error: "maxLoad must be greater than 0" });
      }
      const regionId = await resolveRegionId(region || "North");
      const fuel =
        fuelType && FUEL_TYPES.has(String(fuelType))
          ? (String(fuelType) as "Diesel" | "Petrol" | "CNG" | "Electric")
          : undefined;
      const item = await prisma.vehicle.create({
        data: {
          registrationNo: String(registrationNo).trim(),
          model: String(model).trim(),
          type: mapVehicleType(type),
          regionId,
          capacity: capacity ?? null,
          maxLoad: maxLoadN,
          odometer: odometer != null ? Number(odometer) : 0,
          acquisitionCost: acquisitionCost != null ? Number(acquisitionCost) : 0,
          status: status && VEHICLE_STATUSES.has(status) ? status : "Available",
          fuelType: fuel,
          manufacturer: manufacturer ? String(manufacturer).trim() : null,
        },
        include: { region: true },
      });
      res.status(201).json(serializeVehicle(item));
    } catch (err) {
      if (isPrismaUniqueError(err)) {
        return res.status(409).json({ error: "Vehicle registration number must be unique" });
      }
      console.error(err);
      res.status(400).json({ error: "Create vehicle failed" });
    }
  }
);

vehiclesRouter.put("/:id", requireRole("FLEET_MANAGER", "DISPATCHER"), async (req, res) => {
  try {
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Vehicle not found" });

    const data: Prisma.VehicleUpdateInput = {};
    const body = req.body;
    if (body.registrationNo != null) data.registrationNo = String(body.registrationNo).trim();
    if (body.model != null) data.model = String(body.model).trim();
    if (body.type != null) data.type = mapVehicleType(body.type);
    if (body.capacity != null) data.capacity = body.capacity;
    if (body.maxLoad != null) {
      const ml = Number(body.maxLoad);
      if (!Number.isFinite(ml) || ml <= 0) {
        return res.status(400).json({ error: "maxLoad must be greater than 0" });
      }
      data.maxLoad = ml;
    }
    if (body.odometer != null) {
      const odo = Number(body.odometer);
      if (!Number.isFinite(odo) || odo < 0) {
        return res.status(400).json({ error: "odometer must be >= 0" });
      }
      if (odo < existing.odometer) {
        return res.status(400).json({
          error: `Odometer cannot decrease (current ${existing.odometer})`,
        });
      }
      data.odometer = odo;
    }
    if (body.acquisitionCost != null) data.acquisitionCost = Number(body.acquisitionCost);
    if (body.manufacturer != null) data.manufacturer = String(body.manufacturer).trim() || null;
    if (body.fuelType != null) {
      if (body.fuelType === "" || body.fuelType === null) {
        data.fuelType = null;
      } else if (FUEL_TYPES.has(String(body.fuelType))) {
        data.fuelType = String(body.fuelType) as "Diesel" | "Petrol" | "CNG" | "Electric";
      } else {
        return res.status(400).json({ error: "Invalid fuelType" });
      }
    }
    if (body.status != null) {
      if (!VEHICLE_STATUSES.has(body.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      // Manual status: do not force OnTrip/InShop here (trips/maintenance own those)
      if (body.status === "OnTrip" || body.status === "InShop") {
        return res.status(400).json({
          error: "Set OnTrip via trip dispatch and InShop via maintenance open",
        });
      }
      if (body.status === "Retired" && existing.status === "OnTrip") {
        return res.status(400).json({ error: "Cannot retire a vehicle that is On Trip" });
      }
      if (body.status === "Retired" && existing.status === "InShop") {
        return res.status(400).json({ error: "Cannot retire a vehicle that is In Shop — close maintenance first" });
      }
      if (body.status === "Available" && existing.status === "OnTrip") {
        return res.status(400).json({ error: "Complete or cancel the trip to free this vehicle" });
      }
      if (body.status === "Available" && existing.status === "InShop") {
        return res.status(400).json({ error: "Close the maintenance job to free this vehicle" });
      }
      data.status = body.status;
    }
    if (body.region != null) {
      const regionId = await resolveRegionId(body.region);
      data.region = regionId ? { connect: { id: regionId } } : { disconnect: true };
    }
    const item = await prisma.vehicle.update({
      where: { id: req.params.id },
      data,
      include: { region: true },
    });
    res.json(serializeVehicle(item));
  } catch (err) {
    if (isPrismaUniqueError(err)) {
      return res.status(409).json({ error: "Vehicle registration number must be unique" });
    }
    console.error(err);
    res.status(400).json({ error: "Update vehicle failed" });
  }
});

/** Soft-retire preferred; hard delete only if no related records */
vehiclesRouter.delete("/:id", requireRole("FLEET_MANAGER"), async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trips: true, fuelLogs: true, maintenanceRecords: true, expenses: true },
        },
      },
    });
    if (!existing) return res.status(404).json({ error: "Vehicle not found" });
    if (existing.status === "OnTrip" || existing.status === "InShop") {
      return res.status(400).json({
        error: `Cannot remove vehicle while ${existing.status}`,
      });
    }
    const related =
      existing._count.trips +
      existing._count.fuelLogs +
      existing._count.maintenanceRecords +
      existing._count.expenses;
    if (related > 0) {
      const item = await prisma.vehicle.update({
        where: { id },
        data: { status: "Retired" },
        include: { region: true },
      });
      return res.json({
        ...serializeVehicle(item),
        retired: true,
        message: "Vehicle has history — marked Retired instead of deleted",
      });
    }
    await prisma.vehicle.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Delete vehicle failed" });
  }
});
