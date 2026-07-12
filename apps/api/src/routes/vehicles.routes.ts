import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { isPrismaUniqueError } from "../services/trips.service";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

vehiclesRouter.get("/", async (req, res) => {
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
  const items = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

vehiclesRouter.get("/:id", async (req, res) => {
  const item = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Vehicle not found" });
  res.json(item);
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
      const item = await prisma.vehicle.create({
        data: {
          registrationNo: String(registrationNo).trim(),
          model: String(model).trim(),
          type: type ? String(type).trim() : "Van",
          region: region ? String(region).trim() : "North",
          capacity: capacity ?? null,
          maxLoad: Number(maxLoad),
          odometer: odometer != null ? Number(odometer) : 0,
          acquisitionCost: acquisitionCost != null ? Number(acquisitionCost) : 0,
          status,
        },
      });
      res.status(201).json(item);
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
    const data = { ...req.body };
    if (data.maxLoad != null) data.maxLoad = Number(data.maxLoad);
    if (data.odometer != null) data.odometer = Number(data.odometer);
    if (data.acquisitionCost != null) data.acquisitionCost = Number(data.acquisitionCost);
    const item = await prisma.vehicle.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (err) {
    if (isPrismaUniqueError(err)) {
      return res.status(409).json({ error: "Vehicle registration number must be unique" });
    }
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
