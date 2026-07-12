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
  region?: { name: string } | null;
  [key: string]: unknown;
}) {
  return {
    ...v,
    // Frontend expects region as string name
    region: v.region?.name ?? "",
    type: v.type as string,
  };
}

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
      } = req.body;
      if (!registrationNo || !model || maxLoad == null) {
        return res.status(400).json({ error: "registrationNo, model, maxLoad required" });
      }
      const regionId = await resolveRegionId(region || "North");
      const item = await prisma.vehicle.create({
        data: {
          registrationNo: String(registrationNo).trim(),
          model: String(model).trim(),
          type: mapVehicleType(type),
          regionId,
          capacity: capacity ?? null,
          maxLoad: Number(maxLoad),
          odometer: odometer != null ? Number(odometer) : 0,
          acquisitionCost: acquisitionCost != null ? Number(acquisitionCost) : 0,
          status,
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

vehiclesRouter.put("/:id", requireRole("FLEET_MANAGER"), async (req, res) => {
  try {
    const data: Prisma.VehicleUpdateInput = {};
    const body = req.body;
    if (body.registrationNo != null) data.registrationNo = String(body.registrationNo).trim();
    if (body.model != null) data.model = String(body.model).trim();
    if (body.type != null) data.type = mapVehicleType(body.type);
    if (body.capacity != null) data.capacity = body.capacity;
    if (body.maxLoad != null) data.maxLoad = Number(body.maxLoad);
    if (body.odometer != null) data.odometer = Number(body.odometer);
    if (body.acquisitionCost != null) data.acquisitionCost = Number(body.acquisitionCost);
    if (body.status != null) data.status = body.status;
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

vehiclesRouter.delete("/:id", requireRole("FLEET_MANAGER"), async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Delete vehicle failed" });
  }
});
