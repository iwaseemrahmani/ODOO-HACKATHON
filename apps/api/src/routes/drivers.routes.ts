import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { isPrismaUniqueError } from "../services/trips.service";

export const driversRouter = Router();
driversRouter.use(requireAuth);

driversRouter.get("/", async (_req, res) => {
  const items = await prisma.driver.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

driversRouter.get("/:id", async (req, res) => {
  const item = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Driver not found" });
  res.json(item);
});

driversRouter.post(
  "/",
  requireRole("FLEET_MANAGER", "SAFETY_OFFICER", "DISPATCHER"),
  async (req, res) => {
    try {
      const {
        name,
        licenseNo,
        licenseCategory,
        licenseExpiry,
        phone,
        safetyScore,
        status,
      } = req.body;
      if (!name || !licenseNo || !licenseExpiry) {
        return res.status(400).json({ error: "name, licenseNo, licenseExpiry required" });
      }
      const item = await prisma.driver.create({
        data: {
          name: String(name).trim(),
          licenseNo: String(licenseNo).trim(),
          licenseCategory: licenseCategory ? String(licenseCategory).trim() : "C",
          licenseExpiry: new Date(licenseExpiry),
          phone: phone ?? null,
          safetyScore: safetyScore != null ? Number(safetyScore) : 100,
          status,
        },
      });
      res.status(201).json(item);
    } catch (err) {
      if (isPrismaUniqueError(err)) {
        return res.status(409).json({ error: "License number must be unique" });
      }
      console.error(err);
      res.status(400).json({ error: "Create driver failed" });
    }
  }
);

const DRIVER_STATUSES = new Set(["Available", "OnTrip", "OffDuty", "Suspended"]);

driversRouter.put(
  "/:id",
  requireRole("FLEET_MANAGER", "SAFETY_OFFICER"),
  async (req, res) => {
    try {
      const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: "Driver not found" });

      const data: Record<string, unknown> = {};
      const body = req.body;
      if (body.name != null) data.name = String(body.name).trim();
      if (body.licenseNo != null) data.licenseNo = String(body.licenseNo).trim();
      if (body.licenseCategory != null) data.licenseCategory = String(body.licenseCategory).trim();
      if (body.phone !== undefined) data.phone = body.phone;
      if (body.licenseExpiry) data.licenseExpiry = new Date(body.licenseExpiry);
      if (body.safetyScore != null) data.safetyScore = Number(body.safetyScore);
      if (body.status != null) {
        if (!DRIVER_STATUSES.has(body.status)) {
          return res.status(400).json({ error: "Invalid driver status" });
        }
        // OnTrip is owned by trip dispatch/complete — block manual set
        if (body.status === "OnTrip") {
          return res.status(400).json({
            error: "Set OnTrip via trip dispatch, not manually",
          });
        }
        if (existing.status === "OnTrip" && body.status !== "OnTrip") {
          return res.status(400).json({
            error: "Driver is On Trip — complete or cancel the trip first",
          });
        }
        data.status = body.status;
      }
      const item = await prisma.driver.update({
        where: { id: req.params.id },
        data,
      });
      res.json(item);
    } catch (err) {
      if (isPrismaUniqueError(err)) {
        return res.status(409).json({ error: "License number must be unique" });
      }
      res.status(400).json({ error: "Update driver failed" });
    }
  }
);

driversRouter.delete("/:id", requireRole("FLEET_MANAGER"), async (req, res) => {
  try {
    await prisma.driver.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Delete driver failed" });
  }
});
