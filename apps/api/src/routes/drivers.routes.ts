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
      const { name, licenseNo, licenseExpiry, phone, status } = req.body;
      if (!name || !licenseNo || !licenseExpiry) {
        return res.status(400).json({ error: "name, licenseNo, licenseExpiry required" });
      }
      const item = await prisma.driver.create({
        data: {
          name: String(name).trim(),
          licenseNo: String(licenseNo).trim(),
          licenseExpiry: new Date(licenseExpiry),
          phone: phone ?? null,
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

driversRouter.put(
  "/:id",
  requireRole("FLEET_MANAGER", "SAFETY_OFFICER"),
  async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
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
